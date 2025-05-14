import { NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { dbConnections, tableSyncStatus } from '@/configs/schema';
import { eq } from 'drizzle-orm';
import { currentUser } from '@clerk/nextjs/server';
import { Client } from 'pg';
import { MongoClient } from 'mongodb';
import { embeddings } from '@/app/actions/chat';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    const params = await props.params;

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const id = await Promise.resolve(params.id);
    const connectionId = typeof id === 'string' ? parseInt(id) : id;
    
    if (isNaN(connectionId)) {
      console.error('Invalid connection ID:', id);
      return NextResponse.json(
        { error: 'Invalid connection ID' },
        { status: 400 }
      );
    }
    
    console.log('Syncing connection with ID:', connectionId);
    
    // Get the connection details
    const connections = await db
      .select()
      .from(dbConnections)
      .where(eq(dbConnections.id, connectionId));
    
    if (connections.length === 0) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }
    
    const connection = connections[0];
    const allTableData = [];
    const updatedTables = [];

    if (connection.dbType === 'postgres') {
      // PostgreSQL sync logic
      // ... existing code ...
      const hasSSLParam = connection.postgresUrl.includes('sslmode=');
      
      let connectionOptions = { 
        connectionString: connection.postgresUrl,
        statement_timeout: 30000,
        query_timeout: 30000
      };
      
      if (!hasSSLParam) {
        if (connection.postgresUrl.includes('?')) {
          connectionOptions.connectionString = `${connection.postgresUrl}&sslmode=no-verify`;
        } else {
          connectionOptions.connectionString = `${connection.postgresUrl}?sslmode=no-verify`;
        }
        
        connectionOptions.ssl = {
          rejectUnauthorized: false
        };
      }
      
      console.log('Attempting to connect with modified connection string...');
      console.log('SSL parameters configured:', !hasSSLParam);
      
      client = new Client(connectionOptions);
      
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      
      try {
        await client.connect();
        console.log('Successfully connected to PostgreSQL database');
      } catch (connectError) {
        console.error('Initial connection failed:', connectError);
        
        console.log('Trying alternative connection method...');
        await client.end();
        
        connectionOptions = { 
          connectionString: connection.postgresUrl.split('?')[0],
          statement_timeout: 30000,
          query_timeout: 30000,
          ssl: {
            rejectUnauthorized: false
          }
        };
        
        client = new Client(connectionOptions);
        await client.connect();
        console.log('Connected with alternative method');
      }
      
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
      
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema='public'
      `);
      
      const tables = tablesResult.rows;
      console.log("Retrieved tables:", tables.length);
      
      const CHUNK_SIZE = 5;
      const tableChunks = chunkArray(tables, CHUNK_SIZE);
      console.log("Processing tables in chunks of:", CHUNK_SIZE);
      
      for (const chunk of tableChunks) {
        const chunkPromises = chunk.map(async (table) => {
          const tableName = table.table_name;
          console.log(`Processing table: ${tableName}`);
          
          try {
            const countResult = await client.query(`
              SELECT COUNT(*) FROM "${tableName}"
            `);
            
            const currentRowCount = parseInt(countResult.rows[0].count);
            
            const syncStatuses = await db
              .select()
              .from(tableSyncStatus)
              .where(
                eq(tableSyncStatus.connectionId, connectionId) && 
                eq(tableSyncStatus.tableName, tableName)
              );
            
            const lastSyncStatus = syncStatuses.length > 0 ? syncStatuses[0] : null;
            const lastRowCount = lastSyncStatus ? lastSyncStatus.lastSyncRowCount : 0;
            
            if (currentRowCount > lastRowCount) {
              console.log(`Table ${tableName} has new data: ${currentRowCount} rows (was ${lastRowCount})`);
              
              const [columnsResult, dataResult] = await Promise.all([
                client.query(`
                  SELECT column_name, data_type 
                  FROM information_schema.columns 
                  WHERE table_schema='public' 
                  AND table_name=$1
                `, [tableName]),
                
                client.query(`
                  SELECT * FROM "${tableName}" LIMIT 1000
                `)
              ]);
              
              console.log(`Table ${tableName}: Found ${columnsResult.rows.length} columns and ${dataResult.rows.length} rows`);
              
              if (lastSyncStatus) {
                await db
                  .update(tableSyncStatus)
                  .set({
                    lastSyncTimestamp: new Date(),
                    lastSyncRowCount: currentRowCount,
                    updatedAt: new Date()
                  })
                  .where(eq(tableSyncStatus.id, lastSyncStatus.id));
              } else {
                await db.insert(tableSyncStatus).values({
                  connectionId: connectionId,
                  tableName: tableName,
                  lastSyncTimestamp: new Date(),
                  lastSyncRowCount: currentRowCount,
                  dbType: connection.dbType,
                  createdAt: new Date(),
                  updatedAt: new Date()
                });
              }
              
              updatedTables.push(tableName);
              
              return {
                tableName,
                columns: columnsResult.rows,
                data: dataResult.rows
              };
            }
            console.log(`Table ${tableName} has no new data: ${currentRowCount} rows (was ${lastRowCount})`);
            return null;
          } catch (tableError) {
            console.error(`Error processing table ${tableName}:`, tableError);
            return null;
          }
        });
        
        const chunkResults = await Promise.all(chunkPromises);
        allTableData.push(...chunkResults.filter(Boolean));
      }
      
      console.log('Closing database connection...');
      await client.end();
      console.log('Database connection closed');
    } else if (connection.dbType === 'mongodb') {
      // MongoDB sync logic
      console.log('Connecting to MongoDB...');
      mongoClient = new MongoClient(connection.mongoUrl, {
        connectTimeoutMS: 30000,
        socketTimeoutMS: 30000
      });
      
      await mongoClient.connect();
      console.log('Successfully connected to MongoDB');
      
      const dbName = connection.mongoUrl.split('/').pop().split('?')[0];
      const mongoDb = mongoClient.db(dbName);
      
      const collections = await mongoDb.listCollections().toArray();
      console.log("Retrieved collections:", collections.length);
      
      for (const collection of collections) {
        const collectionName = collection.name;
        console.log(`Processing collection: ${collectionName}`);
        
        try {
          // Get current document count
          const currentDocCount = await mongoDb.collection(collectionName).countDocuments();
          
          // Get last sync status
          const syncStatuses = await db
            .select()
            .from(tableSyncStatus)
            .where(
              eq(tableSyncStatus.connectionId, connectionId) && 
              eq(tableSyncStatus.tableName, collectionName)
            );
          
          const lastSyncStatus = syncStatuses.length > 0 ? syncStatuses[0] : null;
          const lastDocCount = lastSyncStatus ? lastSyncStatus.lastSyncRowCount : 0;
          
          if (currentDocCount > lastDocCount) {
            console.log(`Collection ${collectionName} has new data: ${currentDocCount} documents (was ${lastDocCount})`);
            
            // Get sample data and schema
            const sampleData = await mongoDb.collection(collectionName)
              .find({})
              .limit(1000)
              .toArray();
            
            // Infer schema from sample data
            const schema = inferMongoSchema(sampleData);
            
            // Update sync status
            if (lastSyncStatus) {
              await db
                .update(tableSyncStatus)
                .set({
                  lastSyncTimestamp: new Date(),
                  lastSyncRowCount: currentDocCount,
                  updatedAt: new Date()
                })
                .where(eq(tableSyncStatus.id, lastSyncStatus.id));
            } else {
              await db.insert(tableSyncStatus).values({
                connectionId: connectionId,
                tableName: collectionName,
                lastSyncTimestamp: new Date(),
                lastSyncRowCount: currentDocCount,
                dbType: connection.dbType,
                createdAt: new Date(),
                updatedAt: new Date()
              });
            }
            
            updatedTables.push(collectionName);
            
            allTableData.push({
              tableName: collectionName,
              columns: schema,
              data: sampleData
            });
          } else {
            console.log(`Collection ${collectionName} has no new data: ${currentDocCount} documents (was ${lastDocCount})`);
          }
        } catch (collectionError) {
          console.error(`Error processing collection ${collectionName}:`, collectionError);
        }
      }
      
      console.log('Closing MongoDB connection...');
      await mongoClient.close();
      console.log('MongoDB connection closed');
    } else {
      return NextResponse.json(
        { error: 'Unsupported database type' },
        { status: 400 }
      );
    }
    
    // If we have updated tables, update the connection data and generate embeddings
    if (updatedTables.length > 0) {
      console.log(`Updating connection data for tables: ${updatedTables.join(', ')}`);
      
      // Get the current connection data
      let currentTableSchema = [];
      let currentTableData = [];
      
      try {
        if (connection.tableSchema) {
          currentTableSchema = typeof connection.tableSchema === 'string' 
            ? JSON.parse(connection.tableSchema) 
            : connection.tableSchema;
        }
      } catch (error) {
        console.error('Error parsing tableSchema:', error);
        currentTableSchema = [];
      }
      
      try {
        if (connection.tableData) {
          currentTableData = typeof connection.tableData === 'string' 
            ? JSON.parse(connection.tableData) 
            : connection.tableData;
        }
      } catch (error) {
        console.error('Error parsing tableData:', error);
        currentTableData = [];
      }
      
      if (!Array.isArray(currentTableSchema)) {
        currentTableSchema = [];
      }
      
      if (!Array.isArray(currentTableData)) {
        currentTableData = [];
      }
      
      // Update the schema and data for the updated tables
      for (const tableData of allTableData) {
        const tableName = tableData.tableName;
        
        // Update schema
        const schemaIndex = currentTableSchema.findIndex((t: any) => t.tableName === tableName);
        if (schemaIndex >= 0) {
          currentTableSchema[schemaIndex] = {
            tableName,
            columns: tableData.columns
          };
        } else {
          currentTableSchema.push({
            tableName,
            columns: tableData.columns
          });
        }
        
        // Update data
        const dataIndex = currentTableData.findIndex((t: any) => t.tableName === tableName);
        if (dataIndex >= 0) {
          currentTableData[dataIndex] = {
            tableName,
            data: tableData.data
          };
        } else {
          currentTableData.push({
            tableName,
            data: tableData.data
          });
        }
      }
      
      // Update the connection
      await db
        .update(dbConnections)
        .set({
          tableSchema: JSON.stringify(currentTableSchema),
          tableData: JSON.stringify(currentTableData),
          updatedAt: new Date()
        })
        .where(eq(dbConnections.id, connectionId));
      
      // Generate embeddings for the updated data
      console.log('Generating embeddings for updated data...');
      await embeddings({
        id: connectionId,
        connectionName: connection.connectionName,
        dbType: connection.dbType,
        tables: allTableData
      });
      
      return NextResponse.json({ 
        success: true,
        message: 'Database synced successfully',
        updatedTables
      });
    } else {
      return NextResponse.json({ 
        success: true,
        message: 'No new data to sync',
        updatedTables: []
      });
    }
  } catch (error) {
    console.error('Error syncing database:', error);
    
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
    
    return NextResponse.json(
      { 
        error: error.message,
        code: error.code,
        details: 'Check that your database URL is correct and the server is accessible'
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      try {
        console.log('Ensuring database connection is closed...');
        await client.end();
        console.log('PostgreSQL client disconnected');
      } catch (e) {
        console.error('Error closing client:', e);
      }
    }
    
    if (mongoClient) {
      try {
        console.log('Ensuring MongoDB connection is closed...');
        await mongoClient.close();
        console.log('MongoDB client disconnected');
      } catch (e) {
        console.error('Error closing MongoDB client:', e);
      }
    }
    
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
  }
}

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function inferMongoSchema(documents) {
  const schema = [];
  if (documents.length === 0) return schema;
  
  const sampleDoc = documents[0];
  for (const [key, value] of Object.entries(sampleDoc)) {
    schema.push({
      column_name: key,
      data_type: typeof value === 'object' ? 
        (Array.isArray(value) ? 'array' : 'object') : 
        typeof value
    });
  }
  
  return schema;
} 
import { NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { dbConnections, tableSyncStatus } from '@/configs/schema';
import { eq } from 'drizzle-orm';
import { currentUser } from '@clerk/nextjs/server';
import { Client } from 'pg';
import { embeddings } from '@/app/actions/chat';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  let client;
  try {
    const user = await currentUser();
    
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
    
    // Only proceed with PostgreSQL connections
    if (connection.dbType !== 'postgres') {
      return NextResponse.json(
        { error: 'Only PostgreSQL connections are supported for syncing' },
        { status: 400 }
      );
    }
    
    // Parse the connection string to determine if it includes SSL parameters
    const hasSSLParam = connection.postgresUrl.includes('sslmode=');
    
    // Create connection options
    let connectionOptions = { 
      connectionString: connection.postgresUrl,
      statement_timeout: 30000,
      query_timeout: 30000
    };
    
    // Only add SSL options if not already specified in the URL
    if (!hasSSLParam) {
      // Set SSL mode to 'no-verify'
      if (connection.postgresUrl.includes('?')) {
        connectionOptions.connectionString = `${connection.postgresUrl}&sslmode=no-verify`;
      } else {
        connectionOptions.connectionString = `${connection.postgresUrl}?sslmode=no-verify`;
      }
      
      // Add SSL configuration object as a fallback
      connectionOptions.ssl = {
        rejectUnauthorized: false
      };
    }
    
    console.log('Attempting to connect with modified connection string...');
    console.log('SSL parameters configured:', !hasSSLParam);
    
    client = new Client(connectionOptions);
    
    // Set a node environment variable to disable node's certificate checking
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    
    try {
      await client.connect();
      console.log('Successfully connected to PostgreSQL database');
    } catch (connectError) {
      console.error('Initial connection failed:', connectError);
      
      // If first attempt fails, try with different SSL settings
      console.log('Trying alternative connection method...');
      await client.end();
      
      // Try with direct SSL settings approach
      connectionOptions = { 
        connectionString: connection.postgresUrl.split('?')[0], // Remove any existing params
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
    
    // Restore the environment variable after connection
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
    
    // Get all tables
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
    
    const allTableData = [];
    const updatedTables = [];
    
    for (const chunk of tableChunks) {
      const chunkPromises = chunk.map(async (table) => {
        const tableName = table.table_name;
        console.log(`Processing table: ${tableName}`);
        
        try {
          // Get the current row count for this table
          const countResult = await client.query(`
            SELECT COUNT(*) FROM "${tableName}"
          `);
          
          const currentRowCount = parseInt(countResult.rows[0].count);
          
          // Get the last sync status for this table
          const syncStatuses = await db
            .select()
            .from(tableSyncStatus)
            .where(
              eq(tableSyncStatus.connectionId, connectionId) && 
              eq(tableSyncStatus.tableName, tableName)
            );
          
          const lastSyncStatus = syncStatuses.length > 0 ? syncStatuses[0] : null;
          const lastRowCount = lastSyncStatus ? lastSyncStatus.lastSyncRowCount : 0;
          
          // Check if there are new rows
          if (currentRowCount > lastRowCount) {
            console.log(`Table ${tableName} has new data: ${currentRowCount} rows (was ${lastRowCount})`);
            
            // Get the schema and data
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
            
            // Update the sync status
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
          } else {
            console.log(`Table ${tableName} has no new data: ${currentRowCount} rows (was ${lastRowCount})`);
            return null;
          }
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
    
    // If we have updated tables, update the connection data and generate embeddings
    if (updatedTables.length > 0) {
      console.log(`Updating connection data for tables: ${updatedTables.join(', ')}`);
      
      // Get the current connection data
      let currentTableSchema = [];
      let currentTableData = [];
      
      // Safely parse the JSON data
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
      
      // Ensure we have arrays
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
    
    // Reset NODE_TLS_REJECT_UNAUTHORIZED in case of error
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
    
    return NextResponse.json(
      { 
        error: error.message,
        code: error.code,
        details: 'Check that your PostgreSQL URL is correct and the server is accessible'
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
    
    // Final safety reset of NODE_TLS_REJECT_UNAUTHORIZED
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
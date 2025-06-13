// lib/utils/incrementalSchemaUpdate.ts
import { index as pinecone } from '@/app/lib/pinecone';
import { db } from '@/configs/db';
import { dbConnections } from '@/configs/schema';
import { eq } from 'drizzle-orm';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface TableSchema {
  tableName: string;
  columns: Array<{
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
  }>;
}

interface SchemaComparison {
  addedTables: string[];
  removedTables: string[];
  modifiedTables: string[];
  unchangedTables: string[];
}

interface IncrementalUpdateResult {
  success: boolean;
  tablesProcessed: number;
  vectorsAdded: number;
  vectorsRemoved: number;
  vectorsUpdated: number;
  error?: string;
  details: {
    added: string[];
    removed: string[];
    modified: string[];
    unchanged: string[];
  };
}

/**
 * Get current schema from database
 */
async function getCurrentDatabaseSchema(connectionId: string): Promise<TableSchema[]> {
  try {
    const { executeSQLQuery } = await import('@/app/lib/db/executeQuery');
    
    const schemaQuery = `
      SELECT 
        t.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
      WHERE t.table_schema = 'public'
      ORDER BY t.table_name, c.ordinal_position
    `;

    const result = await executeSQLQuery(connectionId, schemaQuery);
    
    if (!result.success || !result.rows) {
      throw new Error('Failed to fetch database schema');
    }

    // Group by table name
    const schemaByTable = new Map<string, TableSchema>();
    
    result.rows.forEach((row: any) => {
      if (!schemaByTable.has(row.table_name)) {
        schemaByTable.set(row.table_name, {
          tableName: row.table_name,
          columns: []
        });
      }
      
      if (row.column_name) {
        schemaByTable.get(row.table_name)!.columns.push({
          column_name: row.column_name,
          data_type: row.data_type,
          is_nullable: row.is_nullable,
          column_default: row.column_default,
        });
      }
    });

    return Array.from(schemaByTable.values());
    
  } catch (error) {
    console.error('Error fetching current database schema:', error);
    throw error;
  }
}

/**
 * Get existing schema from stored embeddings metadata
 */
async function getExistingSchemaFromEmbeddings(connectionId: string): Promise<TableSchema[]> {
  try {
    console.log('📋 Getting existing schema from embeddings metadata');
    
    // Get all existing embeddings for this connection
    const searchResult = await pinecone.query({
      vector: new Array(1536).fill(0), // Dummy vector
      topK: 1000, // Get all embeddings
      filter: {
        connectionId: connectionId,
        pipeline: "pipeline2",
        type: "schema"
      },
      includeMetadata: true,
    });

    if (!searchResult.matches || searchResult.matches.length === 0) {
      console.log('⚠️ No existing embeddings found');
      return [];
    }

    // Extract unique tables and their column info from metadata
    const tableMap = new Map<string, TableSchema>();
    
    searchResult.matches.forEach(match => {
      const tableName = match.metadata?.tableName as string;
      const columnsStr = match.metadata?.columns as string;
      
      if (tableName && columnsStr && !tableMap.has(tableName)) {
        // Parse columns string back to schema format
        // Format: "id (integer), name (varchar), email (varchar)"
        const columns = columnsStr.split(', ').map(colStr => {
          const matches = colStr.match(/^(.+?)\s*\((.+?)\)$/);
          if (matches) {
            return {
              column_name: matches[1].trim(),
              data_type: matches[2].trim(),
              is_nullable: 'YES', // Default since we don't store this in embeddings
              column_default: null
            };
          }
          return null;
        }).filter(Boolean) as any[];
        
        tableMap.set(tableName, {
          tableName,
          columns
        });
      }
    });

    const existingSchema = Array.from(tableMap.values());
    console.log('✅ Retrieved existing schema for', existingSchema.length, 'tables');
    return existingSchema;
    
  } catch (error) {
    console.error('Error getting existing schema from embeddings:', error);
    return [];
  }
}

/**
 * Compare current schema with existing schema to find changes
 */
function compareSchemas(currentSchema: TableSchema[], existingSchema: TableSchema[]): SchemaComparison {
  const currentTableNames = new Set(currentSchema.map(t => t.tableName));
  const existingTableNames = new Set(existingSchema.map(t => t.tableName));
  
  // Find added and removed tables
  const addedTables = Array.from(currentTableNames).filter(name => !existingTableNames.has(name));
  const removedTables = Array.from(existingTableNames).filter(name => !currentTableNames.has(name));
  
  // Find modified tables (tables that exist in both but have different columns)
  const modifiedTables: string[] = [];
  const unchangedTables: string[] = [];
  
  currentSchema.forEach(currentTable => {
    if (existingTableNames.has(currentTable.tableName)) {
      const existingTable = existingSchema.find(t => t.tableName === currentTable.tableName);
      
      if (existingTable) {
        // Compare column structures
        const currentColumns = currentTable.columns
          .map(c => `${c.column_name}(${c.data_type})`)
          .sort()
          .join(',');
        
        const existingColumns = existingTable.columns
          .map(c => `${c.column_name}(${c.data_type})`)
          .sort()
          .join(',');
        
        if (currentColumns !== existingColumns) {
          modifiedTables.push(currentTable.tableName);
        } else {
          unchangedTables.push(currentTable.tableName);
        }
      }
    }
  });
  
  return {
    addedTables,
    removedTables,
    modifiedTables,
    unchangedTables
  };
}

/**
 * Generate embeddings for specific tables
 */
async function generateTableEmbeddings(
  tables: TableSchema[],
  connectionId: string,
  connectionName: string,
  dbType: string
): Promise<any[]> {
  const allEmbeddings: any[] = [];
  
  for (const table of tables) {
    const columnDescriptions = table.columns
      .map(col => `${col.column_name} (${col.data_type})`)
      .join(", ");

    const textVariations = [
      `Table ${table.tableName} contains the following columns: ${columnDescriptions}`,
      `The ${table.tableName} table has columns: ${columnDescriptions}`,
      `${table.tableName} table with columns: ${columnDescriptions}`,
      `Database table ${table.tableName} containing: ${columnDescriptions}`,
    ];

    // Generate embeddings for each text variation
    for (let index = 0; index < textVariations.length; index++) {
      const text = textVariations[index];
      
      const embedding = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: text,
        encoding_format: "float",
      });
      
      allEmbeddings.push({
        id: `schema-${connectionId}-${table.tableName}-${index}-${Date.now()}`,
        values: embedding.data[0].embedding,
        metadata: {
          connectionId: connectionId,
          connectionName: connectionName,
          dbType: dbType,
          tableName: table.tableName,
          text: text,
          columns: columnDescriptions,
          pipeline: "pipeline2",
          type: "schema",
          updatedAt: new Date().toISOString()
        },
      });
    }
  }
  
  return allEmbeddings;
}

/**
 * Delete embeddings for specific tables
 */
async function deleteTableEmbeddings(connectionId: string, tableNames: string[]): Promise<number> {
  let deletedCount = 0;
  
  for (const tableName of tableNames) {
    try {
      await pinecone.deleteMany({
        filter: {
          connectionId: connectionId,
          pipeline: "pipeline2",
          type: "schema",
          tableName: tableName
        }
      });
      deletedCount++;
      console.log(`🗑️ Deleted embeddings for table: ${tableName}`);
    } catch (error) {
      console.error(`❌ Error deleting embeddings for table ${tableName}:`, error);
    }
  }
  
  return deletedCount;
}

/**
 * Incrementally update schema embeddings - only changes
 */
export async function incrementalSchemaUpdate(connectionId: string): Promise<IncrementalUpdateResult> {
  try {
    console.log('🔄 Starting incremental schema update for connection:', connectionId);
    
    // Get connection details
    const [connection] = await db
      .select()
      .from(dbConnections)
      .where(eq(dbConnections.id, Number(connectionId)));

    if (!connection) {
      return {
        success: false,
        tablesProcessed: 0,
        vectorsAdded: 0,
        vectorsRemoved: 0,
        vectorsUpdated: 0,
        error: 'Connection not found',
        details: { added: [], removed: [], modified: [], unchanged: [] }
      };
    }

    // Get current database schema
    console.log('📊 Fetching current database schema...');
    const currentSchema = await getCurrentDatabaseSchema(connectionId);
    
    // Get existing schema from embeddings
    console.log('📋 Fetching existing schema from embeddings...');
    const existingSchema = await getExistingSchemaFromEmbeddings(connectionId);
    
    // Compare schemas to find changes
    console.log('🔍 Comparing schemas for changes...');
    const comparison = compareSchemas(currentSchema, existingSchema);
    
    console.log('📊 Schema comparison result:', {
      added: comparison.addedTables.length,
      removed: comparison.removedTables.length,
      modified: comparison.modifiedTables.length,
      unchanged: comparison.unchangedTables.length
    });

    // Check if any changes detected
    const hasChanges = comparison.addedTables.length > 0 || 
                      comparison.removedTables.length > 0 || 
                      comparison.modifiedTables.length > 0;

    if (!hasChanges) {
      console.log('✅ No schema changes detected');
      return {
        success: true,
        tablesProcessed: 0,
        vectorsAdded: 0,
        vectorsRemoved: 0,
        vectorsUpdated: 0,
        details: {
          added: [],
          removed: [],
          modified: [],
          unchanged: comparison.unchangedTables
        }
      };
    }

    let vectorsAdded = 0;
    let vectorsRemoved = 0;
    let vectorsUpdated = 0;

    // 1. Remove embeddings for dropped tables
    if (comparison.removedTables.length > 0) {
      console.log('🗑️ Removing embeddings for dropped tables:', comparison.removedTables);
      const deletedCount = await deleteTableEmbeddings(connectionId, comparison.removedTables);
      vectorsRemoved = deletedCount * 4; // 4 text variations per table
    }

    // 2. Add embeddings for new tables
    if (comparison.addedTables.length > 0) {
      console.log('➕ Adding embeddings for new tables:', comparison.addedTables);
      const newTables = currentSchema.filter(t => comparison.addedTables.includes(t.tableName));
      const newEmbeddings = await generateTableEmbeddings(
        newTables, 
        connectionId, 
        connection.connectionName, 
        connection.dbType
      );
      
      if (newEmbeddings.length > 0) {
        await pinecone.upsert(newEmbeddings);
        vectorsAdded = newEmbeddings.length;
      }
    }

    // 3. Update embeddings for modified tables
    if (comparison.modifiedTables.length > 0) {
      console.log('🔄 Updating embeddings for modified tables:', comparison.modifiedTables);
      
      // First delete old embeddings for modified tables
      await deleteTableEmbeddings(connectionId, comparison.modifiedTables);
      
      // Then create new embeddings with updated schema
      const modifiedTables = currentSchema.filter(t => comparison.modifiedTables.includes(t.tableName));
      const updatedEmbeddings = await generateTableEmbeddings(
        modifiedTables,
        connectionId,
        connection.connectionName,
        connection.dbType
      );
      
      if (updatedEmbeddings.length > 0) {
        await pinecone.upsert(updatedEmbeddings);
        vectorsUpdated = updatedEmbeddings.length;
      }
    }

    // 4. Update database schema storage
    console.log('💾 Updating stored schema in database...');
    await db
      .update(dbConnections)
      .set({
        tableSchema: JSON.stringify(
          currentSchema.map(table => ({
            tableName: table.tableName,
            columns: table.columns,
          }))
        ),
        updatedAt: new Date()
      })
      .where(eq(dbConnections.id, Number(connectionId)));

    console.log('✅ Incremental schema update completed successfully');
    
    return {
      success: true,
      tablesProcessed: comparison.addedTables.length + comparison.modifiedTables.length + comparison.removedTables.length,
      vectorsAdded,
      vectorsRemoved,
      vectorsUpdated,
      details: {
        added: comparison.addedTables,
        removed: comparison.removedTables,
        modified: comparison.modifiedTables,
        unchanged: comparison.unchangedTables
      }
    };

  } catch (error) {
    console.error('❌ Error in incremental schema update:', error);
    return {
      success: false,
      tablesProcessed: 0,
      vectorsAdded: 0,
      vectorsRemoved: 0,
      vectorsUpdated: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: { added: [], removed: [], modified: [], unchanged: [] }
    };
  }
}

/**
 * Detect specific schema change type from SQL query
 */
export function detectSchemaChangeType(sqlQuery: string): {
  type: 'CREATE_TABLE' | 'DROP_TABLE' | 'ALTER_TABLE' | 'OTHER' | 'NONE';
  affectedTable?: string;
} {
  const upperQuery = sqlQuery.toUpperCase().trim();
  
  // Create table
  const createTableMatch = upperQuery.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_][a-zA-Z0-9_]*)/);
  if (createTableMatch) {
    return {
      type: 'CREATE_TABLE',
      affectedTable: createTableMatch[1].toLowerCase()
    };
  }
  
  // Drop table
  const dropTableMatch = upperQuery.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([a-zA-Z_][a-zA-Z0-9_]*)/);
  if (dropTableMatch) {
    return {
      type: 'DROP_TABLE',
      affectedTable: dropTableMatch[1].toLowerCase()
    };
  }
  
  // Alter table
  const alterTableMatch = upperQuery.match(/ALTER\s+TABLE\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
  if (alterTableMatch) {
    return {
      type: 'ALTER_TABLE',
      affectedTable: alterTableMatch[1].toLowerCase()
    };
  }
  
  // Other schema changes
  const otherSchemaPatterns = [
    'CREATE INDEX', 'DROP INDEX', 'RENAME TABLE'
  ];
  
  if (otherSchemaPatterns.some(pattern => upperQuery.includes(pattern))) {
    return { type: 'OTHER' };
  }
  
  return { type: 'NONE' };
}

/**
 * Smart schema update - only update specific affected table if possible
 */
export async function smartSchemaUpdate(connectionId: string, sqlQuery: string): Promise<IncrementalUpdateResult> {
  try {
    console.log('🧠 Starting smart schema update for connection:', connectionId);
    
    const changeDetection = detectSchemaChangeType(sqlQuery);
    console.log('🔍 Detected change type:', changeDetection);
    
    // If we can identify the specific affected table, do targeted update
    if (changeDetection.affectedTable && 
        (changeDetection.type === 'CREATE_TABLE' || 
         changeDetection.type === 'DROP_TABLE' || 
         changeDetection.type === 'ALTER_TABLE')) {
      
      console.log(`🎯 Performing targeted update for table: ${changeDetection.affectedTable}`);
      return await targetedTableUpdate(connectionId, changeDetection.affectedTable, changeDetection.type);
    }
    
    // Otherwise, fall back to full incremental update
    console.log('🔄 Falling back to full incremental update');
    return await incrementalSchemaUpdate(connectionId);
    
  } catch (error) {
    console.error('❌ Error in smart schema update:', error);
    // Fall back to incremental update on error
    return await incrementalSchemaUpdate(connectionId);
  }
}

/**
 * Update only a specific table's embeddings
 */
async function targetedTableUpdate(
  connectionId: string, 
  tableName: string, 
  changeType: 'CREATE_TABLE' | 'DROP_TABLE' | 'ALTER_TABLE'
): Promise<IncrementalUpdateResult> {
  try {
    console.log(`🎯 Targeted update for table "${tableName}" (${changeType})`);
    
    const [connection] = await db
      .select()
      .from(dbConnections)
      .where(eq(dbConnections.id, Number(connectionId)));

    if (!connection) {
      throw new Error('Connection not found');
    }

    let vectorsAdded = 0;
    let vectorsRemoved = 0;
    let vectorsUpdated = 0;
    
    if (changeType === 'DROP_TABLE') {
      // Just remove embeddings for the dropped table
      console.log(`🗑️ Removing embeddings for dropped table: ${tableName}`);
      await deleteTableEmbeddings(connectionId, [tableName]);
      vectorsRemoved = 4; // 4 text variations per table
      
      return {
        success: true,
        tablesProcessed: 1,
        vectorsAdded: 0,
        vectorsRemoved,
        vectorsUpdated: 0,
        details: {
          added: [],
          removed: [tableName],
          modified: [],
          unchanged: []
        }
      };
    }
    
    if (changeType === 'CREATE_TABLE' || changeType === 'ALTER_TABLE') {
      // Get current schema for just this table
      const { executeSQLQuery } = await import('@/app/lib/db/executeQuery');
      
      const tableSchemaQuery = `
        SELECT 
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default
        FROM information_schema.columns c
        WHERE c.table_name = '${tableName}' 
        AND c.table_schema = 'public'
        ORDER BY c.ordinal_position
      `;

      const result = await executeSQLQuery(connectionId, tableSchemaQuery);
      
      if (result.success && result.rows && result.rows.length > 0) {
        const tableSchema: TableSchema = {
          tableName,
          columns: result.rows.map((row: any) => ({
            column_name: row.column_name,
            data_type: row.data_type,
            is_nullable: row.is_nullable,
            column_default: row.column_default,
          }))
        };
        
        // Remove old embeddings for this table (if exists)
        await deleteTableEmbeddings(connectionId, [tableName]);
        
        // Generate new embeddings for this table
        const newEmbeddings = await generateTableEmbeddings(
          [tableSchema],
          connectionId,
          connection.connectionName,
          connection.dbType
        );
        
        if (newEmbeddings.length > 0) {
          await pinecone.upsert(newEmbeddings);
          
          if (changeType === 'CREATE_TABLE') {
            vectorsAdded = newEmbeddings.length;
          } else {
            vectorsUpdated = newEmbeddings.length;
          }
        }
        
        return {
          success: true,
          tablesProcessed: 1,
          vectorsAdded,
          vectorsRemoved: 0,
          vectorsUpdated,
          details: {
            added: changeType === 'CREATE_TABLE' ? [tableName] : [],
            removed: [],
            modified: changeType === 'ALTER_TABLE' ? [tableName] : [],
            unchanged: []
          }
        };
      }
    }
    
    // If targeted update fails, fall back to incremental
    console.log('⚠️ Targeted update failed, falling back to incremental');
    return await incrementalSchemaUpdate(connectionId);
    
  } catch (error) {
    console.error('❌ Error in targeted table update:', error);
    // Fall back to incremental update
    return await incrementalSchemaUpdate(connectionId);
  }
}
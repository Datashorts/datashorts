// File: app/actions/getConnectionSchema.ts
'use server'

import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/configs/db'
import { dbConnections } from '@/configs/schema'
import { eq } from 'drizzle-orm'

export interface Column {
  column_name: string
  data_type: string
  is_nullable?: string
  column_default?: string
  character_maximum_length?: number
  is_primary_key?: boolean
  is_foreign_key?: boolean
  foreign_table?: string
  foreign_column?: string
}

export interface TableSchema {
  tableName: string
  columns: Column[]
  columnCount: number
  relationships?: {
    type: 'one-to-many' | 'many-to-one' | 'many-to-many'
    targetTable: string
    foreignKey: string
  }[]
}

export interface SchemaResponse {
  success: boolean
  data?: {
    connectionId: number
    connectionName: string
    dbType: string
    tableSchema: TableSchema[]
    lastUpdated: Date
    stats: {
      totalTables: number
      totalColumns: number
      totalPrimaryKeys: number
      totalForeignKeys: number
      totalRelationships: number
    }
  }
  error?: string
}

/**
 * Retrieve schema from db_connections table and enhance it with relationships
 */
export async function getConnectionSchema(connectionId: number): Promise<SchemaResponse> {
  try {
    console.log('📊 Retrieving schema for connection:', connectionId)
    
    const user = await currentUser()
    if (!user) {
      return {
        success: false,
        error: 'Authentication required'
      }
    }

    // Get connection with schema data
    const [connection] = await db
      .select({
        id: dbConnections.id,
        connectionName: dbConnections.connectionName,
        dbType: dbConnections.dbType,
        tableSchema: dbConnections.tableSchema,
        updatedAt: dbConnections.updatedAt,
        userId: dbConnections.userId
      })
      .from(dbConnections)
      .where(eq(dbConnections.id, connectionId))

    if (!connection) {
      return {
        success: false,
        error: 'Connection not found'
      }
    }

    // Verify user ownership
    if (connection.userId !== user.id) {
      return {
        success: false,
        error: 'Access denied: You do not have permission to view this connection'
      }
    }

    // Parse and process the schema
    let tableSchema: TableSchema[] = []
    
    try {
      // Handle different possible formats of tableSchema stored in database
      if (connection.tableSchema) {
        if (typeof connection.tableSchema === 'string') {
          // If it's a JSON string, parse it
          const parsed = JSON.parse(connection.tableSchema)
          tableSchema = Array.isArray(parsed) ? parsed : Object.entries(parsed).map(([tableName, columns]) => ({
            tableName,
            columns: Array.isArray(columns) ? columns : [],
            columnCount: Array.isArray(columns) ? columns.length : 0
          }))
        } else if (Array.isArray(connection.tableSchema)) {
          // If it's already an array, use it directly
          tableSchema = connection.tableSchema as TableSchema[]
        } else if (typeof connection.tableSchema === 'object' && connection.tableSchema !== null) {
          // If it's an object, convert it to array format
          tableSchema = Object.entries(connection.tableSchema).map(([tableName, columns]) => ({
            tableName,
            columns: Array.isArray(columns) ? columns : [],
            columnCount: Array.isArray(columns) ? columns.length : 0
          }))
        }
      }

      // Enhance schema with relationship detection and metadata
      tableSchema = enhanceSchemaWithRelationships(tableSchema)
      
    } catch (parseError) {
      console.error('Error parsing table schema:', parseError)
      return {
        success: false,
        error: 'Failed to parse schema data. The schema might be corrupted or in an unexpected format.'
      }
    }

    // Validate schema format
    if (!Array.isArray(tableSchema)) {
      return {
        success: false,
        error: 'Invalid schema format: Expected array of tables'
      }
    }

    // Calculate statistics
    const stats = calculateSchemaStats(tableSchema)

    console.log('✅ Successfully retrieved schema for connection:', connectionId)
    console.log('📊 Schema stats:', stats)

    return {
      success: true,
      data: {
        connectionId: connection.id,
        connectionName: connection.connectionName,
        dbType: connection.dbType,
        tableSchema,
        lastUpdated: connection.updatedAt || new Date(),
        stats
      }
    }

  } catch (error) {
    console.error('❌ Error retrieving connection schema:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve schema'
    }
  }
}

/**
 * Get all connections for the current user with basic schema info
 */
export async function getUserConnections() {
  try {
    const user = await currentUser()
    if (!user) {
      return {
        success: false,
        error: 'Authentication required'
      }
    }

    const connections = await db
      .select({
        id: dbConnections.id,
        connectionName: dbConnections.connectionName,
        dbType: dbConnections.dbType,
        updatedAt: dbConnections.updatedAt,
        hasSchema: dbConnections.tableSchema
      })
      .from(dbConnections)
      .where(eq(dbConnections.userId, user.id))

    // Add basic stats for each connection
    const connectionsWithStats = connections.map(conn => {
      let tableCount = 0
      let hasValidSchema = false
      
      try {
        if (conn.hasSchema) {
          if (typeof conn.hasSchema === 'string') {
            const parsed = JSON.parse(conn.hasSchema)
            if (Array.isArray(parsed)) {
              tableCount = parsed.length
              hasValidSchema = true
            } else if (typeof parsed === 'object' && parsed !== null) {
              tableCount = Object.keys(parsed).length
              hasValidSchema = true
            }
          } else if (Array.isArray(conn.hasSchema)) {
            tableCount = conn.hasSchema.length
            hasValidSchema = true
          } else if (typeof conn.hasSchema === 'object' && conn.hasSchema !== null) {
            tableCount = Object.keys(conn.hasSchema).length
            hasValidSchema = true
          }
        }
      } catch (error) {
        console.error('Error parsing schema for connection stats:', error)
        hasValidSchema = false
      }

      return {
        id: conn.id,
        connectionName: conn.connectionName,
        dbType: conn.dbType,
        updatedAt: conn.updatedAt,
        tableCount,
        hasSchema: hasValidSchema
      }
    })

    return {
      success: true,
      data: connectionsWithStats
    }

  } catch (error) {
    console.error('Error retrieving user connections:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve connections'
    }
  }
}

/**
 * Refresh schema for a specific connection by fetching fresh data from the database
 */
export async function refreshConnectionSchema(connectionId: number) {
  try {
    const user = await currentUser()
    if (!user) {
      return {
        success: false,
        error: 'Authentication required'
      }
    }

    // Get connection details
    const [connection] = await db
      .select()
      .from(dbConnections)
      .where(eq(dbConnections.id, connectionId))

    if (!connection || connection.userId !== user.id) {
      return {
        success: false,
        error: 'Connection not found or access denied'
      }
    }

    // Fetch fresh schema based on database type
    let freshSchema: any[] = []

    try {
      if (connection.dbType === 'postgres' && connection.postgresUrl) {
        freshSchema = await getPostgresSchema(connection.postgresUrl)
      } else if (connection.dbType === 'mongodb' && connection.mongoUrl) {
        freshSchema = await getMongoSchema(connection.mongoUrl)
      } else {
        return {
          success: false,
          error: 'Unsupported database type or missing connection URL'
        }
      }
    } catch (dbError) {
      console.error('Error fetching fresh schema:', dbError)
      return {
        success: false,
        error: `Failed to connect to database: ${dbError instanceof Error ? dbError.message : 'Connection error'}`
      }
    }

    // Update the schema in database
    await db
      .update(dbConnections)
      .set({ 
        tableSchema: freshSchema,
        updatedAt: new Date()
      })
      .where(eq(dbConnections.id, connectionId))

    console.log('✅ Schema refreshed for connection:', connectionId)
    
    return {
      success: true,
      message: 'Schema refreshed successfully',
      tableCount: freshSchema.length
    }

  } catch (error) {
    console.error('Error refreshing schema:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to refresh schema'
    }
  }
}

/**
 * Enhance schema with relationship detection based on foreign key patterns
 */
function enhanceSchemaWithRelationships(tableSchema: TableSchema[]): TableSchema[] {
  const tableMap = new Map(tableSchema.map(table => [table.tableName, table]))
  
  return tableSchema.map(table => {
    const relationships: any[] = []
    
    // Ensure columns is an array
    if (!Array.isArray(table.columns)) {
      table.columns = []
    }
    
    // Detect foreign key relationships
    table.columns.forEach(column => {
      // Common foreign key patterns: user_id, role_id, etc.
      if (column.column_name.endsWith('_id') && column.column_name !== 'id') {
        // Try plural form first (user_id -> users)
        const pluralTableName = column.column_name.replace('_id', 's')
        // Try singular form as fallback (user_id -> user)
        const singularTableName = column.column_name.replace('_id', '')
        
        let targetTable = null
        if (tableMap.has(pluralTableName)) {
          targetTable = pluralTableName
        } else if (tableMap.has(singularTableName)) {
          targetTable = singularTableName
        }
        
        if (targetTable) {
          // Mark as foreign key
          column.is_foreign_key = true
          column.foreign_table = targetTable
          column.foreign_column = 'id'
          
          // Add many-to-one relationship
          relationships.push({
            type: 'many-to-one',
            targetTable: targetTable,
            foreignKey: column.column_name
          })
        }
      }
      
      // Mark primary keys (common patterns)
      if (column.column_name === 'id' && 
          (column.data_type.includes('serial') || 
           column.data_type.includes('integer') || 
           column.data_type.includes('bigint'))) {
        column.is_primary_key = true
      }
    })
    
    // Detect reverse relationships (one-to-many)
    tableSchema.forEach(otherTable => {
      if (otherTable.tableName !== table.tableName && Array.isArray(otherTable.columns)) {
        otherTable.columns.forEach(otherColumn => {
          if (otherColumn.is_foreign_key && otherColumn.foreign_table === table.tableName) {
            relationships.push({
              type: 'one-to-many',
              targetTable: otherTable.tableName,
              foreignKey: otherColumn.column_name
            })
          }
        })
      }
    })
    
    // Ensure columnCount is accurate
    table.columnCount = table.columns.length
    
    return {
      ...table,
      relationships: relationships.length > 0 ? relationships : undefined
    }
  })
}

/**
 * Calculate schema statistics
 */
function calculateSchemaStats(tableSchema: TableSchema[]) {
  const totalTables = tableSchema.length
  const totalColumns = tableSchema.reduce((acc, table) => acc + (table.columnCount || 0), 0)
  const totalPrimaryKeys = tableSchema.reduce((acc, table) => 
    acc + (Array.isArray(table.columns) ? table.columns.filter(col => col.is_primary_key).length : 0), 0
  )
  const totalForeignKeys = tableSchema.reduce((acc, table) => 
    acc + (Array.isArray(table.columns) ? table.columns.filter(col => col.is_foreign_key).length : 0), 0
  )
  const totalRelationships = tableSchema.reduce((acc, table) => 
    acc + (table.relationships?.length || 0), 0
  )
  
  return {
    totalTables,
    totalColumns,
    totalPrimaryKeys,
    totalForeignKeys,
    totalRelationships
  }
}

/**
 * Get PostgreSQL schema with enhanced column information
 */
async function getPostgresSchema(postgresUrl: string): Promise<any[]> {
  try {
    const { Pool } = await import('pg')
    const pool = new Pool({ 
      connectionString: postgresUrl,
      ssl: postgresUrl.includes('localhost') ? false : { rejectUnauthorized: false }
    })

    // Get comprehensive table and column information
    const query = `
      SELECT 
        t.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length,
        c.numeric_precision,
        c.numeric_scale,
        c.ordinal_position,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
        CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as is_foreign_key,
        fk.foreign_table_name,
        fk.foreign_column_name
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
      LEFT JOIN (
        SELECT ku.table_name, ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
      ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
      LEFT JOIN (
        SELECT 
          ku.table_name, 
          ku.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
      ) fk ON c.table_name = fk.table_name AND c.column_name = fk.column_name
      WHERE t.table_schema = 'public' 
      AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name, c.ordinal_position
    `

    const result = await pool.query(query)
    
    // Group by table
    const tablesMap = new Map()
    
    result.rows.forEach(row => {
      if (!tablesMap.has(row.table_name)) {
        tablesMap.set(row.table_name, {
          tableName: row.table_name,
          columns: [],
          columnCount: 0
        })
      }
      
      const table = tablesMap.get(row.table_name)
      table.columns.push({
        column_name: row.column_name,
        data_type: row.data_type,
        is_nullable: row.is_nullable,
        column_default: row.column_default,
        character_maximum_length: row.character_maximum_length,
        numeric_precision: row.numeric_precision,
        numeric_scale: row.numeric_scale,
        is_primary_key: row.is_primary_key,
        is_foreign_key: row.is_foreign_key,
        foreign_table: row.foreign_table_name,
        foreign_column: row.foreign_column_name
      })
      table.columnCount = table.columns.length
    })

    await pool.end()
    return Array.from(tablesMap.values())
    
  } catch (error) {
    console.error('Error getting PostgreSQL schema:', error)
    throw new Error(`PostgreSQL connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get MongoDB schema with collection analysis
 */
async function getMongoSchema(mongoUrl: string): Promise<any[]> {
  try {
    const { connectToMongoDB } = await import('@/configs/mongoDB')
    const collections = await connectToMongoDB(mongoUrl)
    
    return collections.map(collection => ({
      tableName: collection.collectionName,
      columns: collection.schema.map((field: any) => ({
        column_name: field.column_name,
        data_type: field.data_type,
        is_nullable: "YES", // MongoDB fields are generally nullable
        is_primary_key: field.column_name === '_id'
      })),
      columnCount: collection.schema.length
    }))
  } catch (error) {
    console.error('Error getting MongoDB schema:', error)
    throw new Error(`MongoDB connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
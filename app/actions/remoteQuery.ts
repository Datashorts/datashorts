// File: app/actions/remoteQuery.ts (SIMPLIFIED WITH CONSISTENT TYPES)
'use server'

import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/configs/db'
import { dbConnections } from '@/configs/schema'
import { eq } from 'drizzle-orm'

// Consistent response type
interface QueryResponse {
  success: boolean
  data?: {
    rows: any[]
    rowCount: number
    columns: string[]
    executionTime: number
  }
  error?: string
}

/**
 * LIGHTWEIGHT SECURITY CHECK - Only pattern-based blocking
 */
function quickSecurityCheck(
  sqlQuery: string, 
  forceExecution: boolean = false
): { blocked: boolean; error?: string } {
  const upperQuery = sqlQuery.toUpperCase().trim();
  
  // Only block the most dangerous patterns
  const dangerousPatterns = ['DROP TABLE', 'DROP DATABASE', 'TRUNCATE'];
  
  for (const pattern of dangerousPatterns) {
    if (upperQuery.includes(pattern) && !forceExecution) {
      return {
        blocked: true,
        error: `🚨 BLOCKED: ${pattern} operation detected. Enable "Force execution" if intentional.`
      };
    }
  }

  return { blocked: false };
}

// Type the actual response from executeSQLQuery based on your error message
interface ExecuteSQLResult {
  success: boolean
  rows?: any[]
  rowCount?: number | null
  error?: string
  data?: {
    rows?: any[]
    rowCount?: number
  } | any[]
}

/**
 * Basic query execution that always returns consistent format
 */
async function executeBasicQuery(connectionId: string, sqlQuery: string): Promise<QueryResponse> {
  try {
    const { executeSQLQuery } = await import('@/app/lib/db/executeQuery')
    const startTime = Date.now()
    const result: ExecuteSQLResult = await executeSQLQuery(connectionId, sqlQuery)
    const executionTime = Date.now() - startTime
    
    console.log('Raw executeSQLQuery result:', result)
    
    if (result.success) {
      // Handle different possible result formats
      let rows: any[] = []
      let rowCount = 0
      
      // Primary case: Legacy format with direct rows property
      if (result.rows && Array.isArray(result.rows)) {
        rows = result.rows
        rowCount = result.rowCount || rows.length
      }
      // Secondary case: Check for data property (if it exists)
      else if (result.data) {
        if (Array.isArray(result.data)) {
          // Direct array format: { success: true, data: [...] }
          rows = result.data
          rowCount = rows.length
        } else if (result.data.rows && Array.isArray(result.data.rows)) {
          // Nested format: { success: true, data: { rows, rowCount } }
          rows = result.data.rows
          rowCount = result.data.rowCount || rows.length
        }
      }
      
      const columns = rows.length > 0 ? Object.keys(rows[0]) : []
      
      return {
        success: true,
        data: {
          rows,
          rowCount,
          columns,
          executionTime
        }
      }
    } else {
      return {
        success: false,
        error: result.error || 'Query execution failed'
      }
    }
  } catch (error) {
    console.error('Error executing basic query:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to execute query' 
    }
  }
}

/**
 * OPTIMIZED: Execute query with minimal overhead
 */
export async function executeRemoteQuery(
  connectionId: string,
  sqlQuery: string,
  options: {
    validateQuery?: boolean
    optimizeQuery?: boolean
    forceExecution?: boolean
  } = {}
): Promise<QueryResponse> {
  try {
    const user = await currentUser()
    if (!user) {
      return {
        success: false,
        error: 'Authentication required'
      }
    }

    // QUICK SECURITY CHECK (no AI, no database calls)
    const securityCheck = quickSecurityCheck(sqlQuery, options.forceExecution);
    if (securityCheck.blocked) {
      return {
        success: false,
        error: securityCheck.error
      };
    }

    // Verify user has access to this connection
    const [connection] = await db
      .select()
      .from(dbConnections)
      .where(eq(dbConnections.id, Number(connectionId)))

    if (!connection || connection.userId !== user.id) {
      return {
        success: false,
        error: 'Connection not found or access denied'
      }
    }

    // Execute query and return consistent format
    return await executeBasicQuery(connectionId, sqlQuery)
    
  } catch (error) {
    console.error('Error in executeRemoteQuery:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    }
  }
}

/**
 * Fetch fresh database schema
 */
async function fetchFreshSchema(connectionId: string): Promise<any[]> {
  try {
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
    `
    
    const result = await executeBasicQuery(connectionId, schemaQuery)
    
    if (result.success && result.data && result.data.rows) {
      const schemaByTable: { [key: string]: any[] } = {}
      result.data.rows.forEach((row: any) => {
        if (!schemaByTable[row.table_name]) {
          schemaByTable[row.table_name] = []
        }
        if (row.column_name) {
          schemaByTable[row.table_name].push({
            column_name: row.column_name,
            data_type: row.data_type,
            is_nullable: row.is_nullable,
            column_default: row.column_default,
          })
        }
      })
      
      return Object.entries(schemaByTable).map(([tableName, columns]) => ({
        tableName,
        columns
      }))
    }
    
    return []
  } catch (error) {
    console.error('Error fetching fresh schema:', error)
    return []
  }
}

/**
 * Batch execution with minimal overhead
 */
export async function executeBatchQueries(
  connectionId: string,
  queries: string[],
  options: {
    validateQueries?: boolean
    stopOnError?: boolean
    transactional?: boolean
  } = {}
) {
  try {
    const user = await currentUser()
    if (!user) {
      return {
        success: false,
        error: 'Authentication required',
        results: [],
        totalExecutionTime: 0,
        successCount: 0,
        errorCount: 1
      }
    }

    // Verify user access once
    const [connection] = await db
      .select()
      .from(dbConnections)
      .where(eq(dbConnections.id, Number(connectionId)))

    if (!connection || connection.userId !== user.id) {
      return {
        success: false,
        error: 'Connection not found or access denied',
        results: [],
        totalExecutionTime: 0,
        successCount: 0,
        errorCount: 1
      }
    }

    // Execute queries with minimal processing
    const results = []
    let successCount = 0
    let errorCount = 0
    const startTime = Date.now()

    for (const query of queries) {
      const result = await executeRemoteQuery(connectionId, query.trim(), {
        validateQuery: false,
        optimizeQuery: false,
        forceExecution: options.validateQueries ? false : true
      })
      results.push(result)
      
      if (result.success) {
        successCount++
      } else {
        errorCount++
        if (options.stopOnError) break
      }
    }

    return {
      success: errorCount === 0,
      results,
      totalExecutionTime: Date.now() - startTime,
      successCount,
      errorCount
    }
  } catch (error) {
    console.error('Error in executeBatchQueries:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      results: [],
      totalExecutionTime: 0,
      successCount: 0,
      errorCount: 1
    }
  }
}

/**
 * Get database schema information
 */
export async function getDatabaseSchema(connectionId: string) {
  try {
    const user = await currentUser()
    if (!user) {
      return {
        success: false,
        error: 'Authentication required'
      }
    }

    // Verify connection access
    const [connection] = await db
      .select()
      .from(dbConnections)
      .where(eq(dbConnections.id, Number(connectionId)))

    if (!connection || connection.userId !== user.id) {
      return {
        success: false,
        error: 'Connection not found or access denied'
      }
    }

    // Return cached schema or fetch fresh
    let schema: any[] = []
    try {
      if (connection.tableSchema && typeof connection.tableSchema === 'string') {
        if (connection.tableSchema.startsWith('[object Object]') || connection.tableSchema === '[object Object]') {
          schema = await fetchFreshSchema(connectionId)
        } else {
          schema = JSON.parse(connection.tableSchema)
        }
      } else if (Array.isArray(connection.tableSchema)) {
        schema = connection.tableSchema
      } else {
        schema = await fetchFreshSchema(connectionId)
      }
    } catch (error) {
      console.error('Error parsing table schema, fetching fresh:', error)
      schema = await fetchFreshSchema(connectionId)
    }

    return {
      success: true,
      schema,
      connectionName: connection.connectionName,
      dbType: connection.dbType
    }
  } catch (error) {
    console.error('Error in getDatabaseSchema:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    }
  }
}

/**
 * Query explanation with caching
 */
export async function explainQuery(connectionId: string, sqlQuery: string) {
  try {
    const user = await currentUser()
    if (!user) {
      return {
        success: false,
        error: 'Authentication required'
      }
    }

    // Verify connection access
    const [connection] = await db
      .select()
      .from(dbConnections)
      .where(eq(dbConnections.id, Number(connectionId)))

    if (!connection || connection.userId !== user.id) {
      return {
        success: false,
        error: 'Connection not found or access denied'
      }
    }

    // Get schema for better explanations
    let schema: any[] = []
    try {
      if (connection.tableSchema && typeof connection.tableSchema === 'string') {
        if (connection.tableSchema.startsWith('[object Object]') || connection.tableSchema === '[object Object]') {
          schema = await fetchFreshSchema(connectionId)
        } else {
          schema = JSON.parse(connection.tableSchema)
        }
      } else if (Array.isArray(connection.tableSchema)) {
        schema = connection.tableSchema
      } else {
        schema = await fetchFreshSchema(connectionId)
      }
    } catch (error) {
      console.error('Error processing table schema:', error)
      schema = await fetchFreshSchema(connectionId)
    }

    try {
      const { openaiClient } = await import('@/app/lib/clients')
      
      const prompt = `Explain this SQL query briefly: ${sqlQuery}

Available schema:
${schema.map(table => `
Table: ${table.tableName}
Columns: ${table.columns.map((col: any) => `${col.column_name} (${col.data_type})`).join(', ')}
`).join('\n')}`

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "Explain SQL queries concisely."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 300
      })

      const explanation = response.choices[0].message.content || 'No explanation available';

      return {
        success: true,
        explanation
      }
    } catch (error) {
      console.error('Error generating explanation:', error)
      return {
        success: false,
        error: 'Failed to generate query explanation'
      }
    }
  } catch (error) {
    console.error('Error in explainQuery:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    }
  }
}

/**
 * Query suggestions with caching
 */
export async function getQuerySuggestions(connectionId: string, userIntent: string) {
  try {
    const user = await currentUser()
    if (!user) {
      return {
        success: false,
        error: 'Authentication required'
      }
    }

    // Verify connection access
    const [connection] = await db
      .select()
      .from(dbConnections)
      .where(eq(dbConnections.id, Number(connectionId)))

    if (!connection || connection.userId !== user.id) {
      return {
        success: false,
        error: 'Connection not found or access denied'
      }
    }

    // Get schema for suggestions
    let schema: any[] = []
    try {
      if (connection.tableSchema && typeof connection.tableSchema === 'string') {
        if (connection.tableSchema.startsWith('[object Object]') || connection.tableSchema === '[object Object]') {
          schema = await fetchFreshSchema(connectionId)
        } else {
          schema = JSON.parse(connection.tableSchema)
        }
      } else if (Array.isArray(connection.tableSchema)) {
        schema = connection.tableSchema
      } else {
        schema = await fetchFreshSchema(connectionId)
      }
    } catch (error) {
      console.error('Error processing table schema:', error)
      schema = await fetchFreshSchema(connectionId)
    }

    try {
      const { openaiClient } = await import('@/app/lib/clients')
      
      const prompt = `Based on: "${userIntent}", suggest 3 SQL queries in JSON format:
{
  "suggestions": [
    {"query": "SELECT ...", "description": "...", "difficulty": "beginner"}
  ]
}

Schema:
${schema.map(table => `${table.tableName}: ${table.columns.map((col: any) => col.column_name).join(', ')}`).join('\n')}`

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a SQL assistant. Provide JSON responses only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 500
      })

      const result = JSON.parse(response.choices[0].message.content || '{}')
      
      return {
        success: true,
        suggestions: result.suggestions || []
      }
    } catch (error) {
      console.error('Error generating suggestions:', error)
      return {
        success: false,
        error: 'Failed to generate query suggestions'
      }
    }
  } catch (error) {
    console.error('Error in getQuerySuggestions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    }
  }
}

/**
 * Save query to user's query library
 */
export async function saveQueryToLibrary(
  connectionId: string,
  query: string,
  name: string,
  description?: string,
  tags?: string[]
) {
  try {
    const user = await currentUser()
    if (!user) {
      return {
        success: false,
        error: 'Authentication required'
      }
    }

    const queryLibraryItem = {
      id: Date.now().toString(),
      connectionId,
      query,
      name,
      description,
      tags: tags || [],
      createdAt: new Date().toISOString(),
      userId: user.id
    }

    return {
      success: true,
      item: queryLibraryItem
    }
  } catch (error) {
    console.error('Error in saveQueryToLibrary:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    }
  }
}
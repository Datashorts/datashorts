// app/actions/remoteQuery.ts
'use server'

import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/configs/db'
import { dbConnections } from '@/configs/schema'
import { eq } from 'drizzle-orm'

/**
 * Fetch fresh database schema when stored schema is corrupted
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
    
    // Use the basic executeQuery to avoid circular dependency
    const result = await executeBasicQuery(connectionId, schemaQuery)
    
    if (result.success && result.data) {
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
 * Basic query execution without agents (to avoid circular dependencies)
 */
async function executeBasicQuery(connectionId: string, sqlQuery: string) {
  try {
    const { executeSQLQuery } = await import('@/app/lib/db/executeQuery')
    const result = await executeSQLQuery(connectionId, sqlQuery)
    return result
  } catch (error) {
    console.error('Error executing basic query:', error)
    return { success: false, error: 'Failed to execute query' }
  }
}

/**
 * Execute a single SQL query remotely
 */
export async function executeRemoteQuery(
  connectionId: string,
  sqlQuery: string,
  options: {
    validateQuery?: boolean
    optimizeQuery?: boolean
    forceExecution?: boolean
  } = {}
) {
  try {
    const user = await currentUser()
    if (!user) {
      return {
        success: false,
        error: 'Authentication required'
      }
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

    // For now, just use basic query execution
    // You can add the remoteQueryAgent later when it's implemented
    const result = await executeBasicQuery(connectionId, sqlQuery)
    
    if (result.success) {
      // Format the result to match expected interface
      const columns = result.rows && result.rows.length > 0 ? Object.keys(result.rows[0]) : []
      return {
        success: true,
        data: {
          rows: result.rows || [],
          rowCount: result.rowCount || 0,
          columns,
          executionTime: 0
        }
      }
    }
    
    return result
  } catch (error) {
    console.error('Error in executeRemoteQuery:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    }
  }
}

/**
 * Execute multiple SQL queries as a batch
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

    // Verify user has access to this connection
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

    const results = []
    let successCount = 0
    let errorCount = 0
    const startTime = Date.now()

    for (const query of queries) {
      const result = await executeRemoteQuery(connectionId, query.trim(), options)
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
 * Get an explanation for a SQL query
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

    // Get database schema for better explanations
    let schema: any[] = []
    try {
      if (connection.tableSchema) {
        // Handle different formats of tableSchema
        if (typeof connection.tableSchema === 'string') {
          // Try to parse as JSON string
          if (connection.tableSchema.startsWith('[object Object]') || connection.tableSchema === '[object Object]') {
            console.log('tableSchema contains [object Object], fetching fresh schema...')
            // If it's corrupted, fetch fresh schema
            schema = await fetchFreshSchema(connectionId)
          } else {
            try {
              schema = JSON.parse(connection.tableSchema)
            } catch (parseError) {
              console.error('Failed to parse tableSchema JSON, fetching fresh schema:', parseError)
              schema = await fetchFreshSchema(connectionId)
            }
          }
        } else if (Array.isArray(connection.tableSchema)) {
          // Already an array
          schema = connection.tableSchema
        } else if (typeof connection.tableSchema === 'object') {
          // Convert object to array format
          schema = Object.entries(connection.tableSchema).map(([tableName, columns]) => ({
            tableName,
            columns: Array.isArray(columns) ? columns : []
          }))
        } else {
          console.log('Unexpected tableSchema format, fetching fresh schema...')
          schema = await fetchFreshSchema(connectionId)
        }
      } else {
        console.log('No tableSchema found, fetching fresh schema...')
        schema = await fetchFreshSchema(connectionId)
      }
    } catch (error) {
      console.error('Error processing table schema:', error)
      // Fallback: fetch fresh schema
      schema = await fetchFreshSchema(connectionId)
    }

    // Get query explanation using OpenAI
    try {
      const { openaiClient } = await import('@/app/lib/clients')
      
      const prompt = `
Explain this SQL query in simple terms:

Query: ${sqlQuery}

Available schema:
${schema.map(table => `
Table: ${table.tableName}
Columns: ${table.columns.map((col: any) => `${col.column_name} (${col.data_type})`).join(', ')}
`).join('\n')}

Provide a clear explanation that includes:
1. What the query does
2. Which tables it accesses
3. What data it returns
4. Any joins or complex operations
5. Potential performance considerations

Keep the explanation accessible to non-technical users while being accurate.
`

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a database expert who explains SQL queries in clear, simple terms for both technical and non-technical users."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 800
      })

      return {
        success: true,
        explanation: response.choices[0].message.content || 'No explanation available'
      }
    } catch (error) {
      console.error('Error generating explanation:', error)
      return {
        success: false,
        error: 'Failed to generate query explanation. Please check your OpenAI API key.'
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
 * Get query suggestions based on user intent
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

    // Get database schema for suggestions
    let schema: any[] = []
    try {
      if (connection.tableSchema) {
        // Handle different formats of tableSchema
        if (typeof connection.tableSchema === 'string') {
          if (connection.tableSchema.startsWith('[object Object]') || connection.tableSchema === '[object Object]') {
            console.log('tableSchema contains [object Object], fetching fresh schema...')
            schema = await fetchFreshSchema(connectionId)
          } else {
            try {
              schema = JSON.parse(connection.tableSchema)
            } catch (parseError) {
              console.error('Failed to parse tableSchema JSON, fetching fresh schema:', parseError)
              schema = await fetchFreshSchema(connectionId)
            }
          }
        } else if (Array.isArray(connection.tableSchema)) {
          schema = connection.tableSchema
        } else if (typeof connection.tableSchema === 'object') {
          schema = Object.entries(connection.tableSchema).map(([tableName, columns]) => ({
            tableName,
            columns: Array.isArray(columns) ? columns : []
          }))
        } else {
          schema = await fetchFreshSchema(connectionId)
        }
      } else {
        schema = await fetchFreshSchema(connectionId)
      }
    } catch (error) {
      console.error('Error processing table schema:', error)
      schema = await fetchFreshSchema(connectionId)
    }

    // Generate query suggestions using OpenAI
    try {
      const { openaiClient } = await import('@/app/lib/clients')
      
      const prompt = `
Based on this user request, suggest relevant SQL queries:

User Intent: ${userIntent}

Available database schema:
${schema.map(table => `
Table: ${table.tableName}
Columns: ${table.columns.map((col: any) => `${col.column_name} (${col.data_type})`).join(', ')}
`).join('\n')}

Provide 3-5 SQL query suggestions that would help fulfill the user's intent. For each suggestion, include:
1. The SQL query
2. A description of what it does
3. Difficulty level (beginner/intermediate/advanced)

Respond in JSON format:
{
  "suggestions": [
    {
      "query": "SELECT ...",
      "description": "This query...",
      "difficulty": "beginner"
    }
  ]
}
`

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a helpful SQL assistant that suggests appropriate queries based on user needs."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 1000
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
        error: 'Failed to generate query suggestions. Please check your OpenAI API key.'
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

    // Return parsed schema or fetch fresh if corrupted
    let schema: any[] = []
    try {
      if (connection.tableSchema && typeof connection.tableSchema === 'string') {
        if (connection.tableSchema.startsWith('[object Object]') || connection.tableSchema === '[object Object]') {
          schema = await fetchFreshSchema(connectionId)
        } else {
          schema = JSON.parse(connection.tableSchema)
        }
      } else {
        schema = await fetchFreshSchema(connectionId)
      }
    } catch (error) {
      console.error('Error parsing table schema:', error)
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

    // For now, save to localStorage on client side
    // In a production app, you'd want to save this to a database table
    
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
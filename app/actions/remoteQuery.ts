// app/actions/remoteQuery.ts
'use server'

import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/configs/db'
import { dbConnections } from '@/configs/schema'
import { eq } from 'drizzle-orm'
import { remoteQueryAgent, batchQueryAgent, explainQueryAgent, suggestQueriesAgent } from '@/lib/agents2/remoteQueryAgent'

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

    // Get database schema for validation
    let schema: any[] = []
    try {
      if (connection.tableSchema) {
        schema = JSON.parse(connection.tableSchema)
      }
    } catch (error) {
      console.error('Error parsing table schema:', error)
    }

    // Execute query using the remote query agent
    const result = await remoteQueryAgent(sqlQuery, connectionId, schema, options)

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

    // Get database schema for validation
    let schema: any[] = []
    try {
      if (connection.tableSchema) {
        schema = JSON.parse(connection.tableSchema)
      }
    } catch (error) {
      console.error('Error parsing table schema:', error)
    }

    // Execute batch queries
    const result = await batchQueryAgent(queries, connectionId, schema, options)

    return result
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
        schema = JSON.parse(connection.tableSchema)
      }
    } catch (error) {
      console.error('Error parsing table schema:', error)
    }

    // Get query explanation
    const result = await explainQueryAgent(sqlQuery, schema)

    return result
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
        schema = JSON.parse(connection.tableSchema)
      }
    } catch (error) {
      console.error('Error parsing table schema:', error)
    }

    // Get query suggestions
    const result = await suggestQueriesAgent(userIntent, schema)

    return result
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

    // Return parsed schema
    let schema: any[] = []
    try {
      if (connection.tableSchema) {
        schema = JSON.parse(connection.tableSchema)
      }
    } catch (error) {
      console.error('Error parsing table schema:', error)
      return {
        success: false,
        error: 'Failed to parse database schema'
      }
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
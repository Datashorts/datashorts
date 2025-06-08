// File: app/api/optimize-query/route.ts (UPDATED WITH CHAT ID SUPPORT)
import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/configs/db'
import { dbConnections } from '@/configs/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const { connectionId, query, chatId } = await request.json() // NEW: Include chatId

    if (!connectionId || !query) {
      return NextResponse.json({ success: false, error: 'Missing connectionId or query' }, { status: 400 })
    }

    console.log('🎯 Optimize Query API: Received request with chatId:', chatId) // NEW: Log chatId

    // Verify user has access to this connection
    const [connection] = await db
      .select()
      .from(dbConnections)
      .where(eq(dbConnections.id, Number(connectionId)))

    if (!connection || connection.userId !== user.id) {
      return NextResponse.json({ success: false, error: 'Connection not found or access denied' }, { status: 403 })
    }

    // Get database schema
    let schema: any[] = []
    try {
      if (connection.tableSchema) {
        if (typeof connection.tableSchema === 'string') {
          if (!connection.tableSchema.startsWith('[object Object]')) {
            schema = JSON.parse(connection.tableSchema)
          }
        } else if (Array.isArray(connection.tableSchema)) {
          schema = connection.tableSchema
        } else if (typeof connection.tableSchema === 'object') {
          schema = Object.entries(connection.tableSchema).map(([tableName, columns]) => ({
            tableName,
            columns: Array.isArray(columns) ? columns : []
          }))
        }
      }
    } catch (error) {
      console.error('Error processing table schema for optimization:', error)
    }

    // Import and run optimization analysis only (don't execute the query)
    try {
      const { remoteQueryAgent } = await import('@/lib/agents2/remoteQueryAgent')
      
      // Run analysis with optimization enabled but don't execute
      const result = await remoteQueryAgent(query, connectionId, schema, {
        validateQuery: false,
        optimizeQuery: true,
        forceExecution: false,
        saveToHistory: false, // Don't save optimization analysis to history
        chatId: chatId // NEW: Pass chatId to remoteQueryAgent
      })

      console.log('⚡ Optimization result with chatId:', chatId, 'Result:', result.optimization) // NEW: Log with chatId

      return NextResponse.json({
        success: true,
        optimization: result.optimization || null,
        hasOptimization: !!result.optimization
      })
    } catch (importError) {
      console.error('Error importing remoteQueryAgent:', importError)
      return NextResponse.json({
        success: false,
        error: 'Query optimization service is not available'
      }, { status: 503 })
    }

  } catch (error) {
    console.error('Error in optimize-query API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
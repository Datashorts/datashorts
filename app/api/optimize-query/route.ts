// File: app/api/optimize-query/route.ts (COMPLETE ENHANCED VERSION WITH INCREMENTAL UPDATES)
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

    const { connectionId, query, chatId } = await request.json()

    if (!connectionId || !query) {
      return NextResponse.json({ success: false, error: 'Missing connectionId or query' }, { status: 400 })
    }

    console.log('🎯 Enhanced Optimize Query API with Incremental Updates: Received request with chatId:', chatId)

    // Verify user has access to this connection
    const [connection] = await db
      .select()
      .from(dbConnections)
      .where(eq(dbConnections.id, Number(connectionId)))

    if (!connection || connection.userId !== user.id) {
      return NextResponse.json({ success: false, error: 'Connection not found or access denied' }, { status: 403 })
    }

    // Check if schema embeddings exist and get schema context
    let schemaContext: any[] = []
    let schemaSource = 'none'

    try {
      // Try to get schema from embeddings first
      const { getSchemaFromEmbeddings } = await import('@/app/actions/remoteQuery')
      const schemaEmbeddings = await getSchemaFromEmbeddings(connectionId, query)
      
      if (schemaEmbeddings.length > 0) {
        console.log('🧠 Using schema embeddings for optimization context')
        schemaContext = schemaEmbeddings.map((embedding: any) => ({
          tableName: embedding.tableName,
          columns: embedding.columns,
          text: embedding.text,
          score: embedding.score
        }))
        schemaSource = 'embeddings'
        console.log('✅ Retrieved', schemaContext.length, 'schema embeddings for optimization')
      } else {
        // Fallback to database schema
        console.log('📋 Falling back to database schema for optimization')
        schemaSource = 'database'
        
        try {
          if (connection.tableSchema) {
            if (typeof connection.tableSchema === 'string') {
              if (!connection.tableSchema.startsWith('[object Object]')) {
                schemaContext = JSON.parse(connection.tableSchema)
              }
            } else if (Array.isArray(connection.tableSchema)) {
              schemaContext = connection.tableSchema
            } else if (typeof connection.tableSchema === 'object') {
              schemaContext = Object.entries(connection.tableSchema).map(([tableName, columns]) => ({
                tableName,
                columns: Array.isArray(columns) ? columns : []
              }))
            }
          }
        } catch (error) {
          console.error('Error parsing table schema for optimization:', error)
        }
      }
    } catch (embeddingError) {
      console.error('Error getting schema embeddings:', embeddingError)
      // Continue with fallback schema
      schemaSource = 'fallback'
    }

    console.log('📊 Schema context for optimization:', schemaContext.length, 'tables from', schemaSource)

    // Try to use the enhanced remote query agent for optimization
    try {
      const { remoteQueryAgent } = await import('@/lib/agents2/remoteQueryAgent')
      
      console.log('🧠 Using enhanced remote query agent for optimization')
      
      // Run analysis with optimization enabled but don't execute
      const result = await remoteQueryAgent(query, connectionId, schemaContext, {
        validateQuery: false,
        optimizeQuery: true,
        forceExecution: false,
        saveToHistory: false, // Don't save optimization analysis to history
        chatId: chatId
      })

      console.log('⚡ Enhanced optimization result with chatId:', chatId, 'Result:', result.optimization)

      // Check if we got meaningful optimization suggestions
      if (result.optimization) {
        return NextResponse.json({
          success: true,
          optimization: result.optimization,
          hasOptimization: true,
          schemaSource,
          schemaContext: schemaContext.length,
          enhanced: true
        })
      } else {
        // No optimization suggestions available from enhanced agent
        console.log('💡 No optimization suggestions from enhanced agent, trying basic optimization')
        
        // Try basic optimization as fallback
        const basicOptimization = await performBasicOptimization(query, schemaContext, chatId)
        
        if (basicOptimization) {
          return NextResponse.json({
            success: true,
            optimization: basicOptimization,
            hasOptimization: true,
            schemaSource,
            schemaContext: schemaContext.length,
            enhanced: false,
            fallback: true
          })
        } else {
          return NextResponse.json({
            success: true,
            optimization: null,
            hasOptimization: false,
            schemaSource,
            schemaContext: schemaContext.length,
            enhanced: false,
            message: 'No optimization suggestions available for this query'
          })
        }
      }
      
    } catch (importError) {
      console.error('Error importing enhanced remoteQueryAgent:', importError)
      
      // Fallback to basic optimization analysis
      try {
        console.log('🔧 Using basic optimization as fallback')
        const optimization = await performBasicOptimization(query, schemaContext, chatId)
        
        return NextResponse.json({
          success: true,
          optimization,
          hasOptimization: !!optimization,
          schemaSource,
          schemaContext: schemaContext.length,
          enhanced: false,
          fallback: true
        })
        
      } catch (fallbackError) {
        console.error('Fallback optimization also failed:', fallbackError)
        return NextResponse.json({
          success: false,
          error: 'Query optimization service is not available'
        }, { status: 503 })
      }
    }

  } catch (error) {
    console.error('Error in enhanced optimize-query API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Enhanced basic optimization analysis with schema context
 */
async function performBasicOptimization(
  query: string, 
  schemaContext: any[], 
  chatId?: number
): Promise<any> {
  try {
    console.log('🔧 Performing enhanced basic optimization analysis for chatId:', chatId)
    
    const upperQuery = query.toUpperCase().trim()
    
    // Enhanced optimization checks with schema context
    const optimizations: string[] = []
    let optimizedQuery = query
    let expectedImprovement = ''
    
    // Schema-aware optimization checks
    const availableTables = schemaContext.map(table => 
      typeof table === 'object' ? table.tableName : table
    ).filter(Boolean)
    
    console.log('📊 Available tables for optimization:', availableTables)
    
    // Check for missing LIMIT with schema context
    if (!upperQuery.includes('LIMIT') && upperQuery.includes('SELECT')) {
      // Estimate potential result size based on schema
      const hasLargeTables = availableTables.some(table => 
        ['users', 'orders', 'transactions', 'logs', 'events'].includes(table.toLowerCase())
      )
      
      if (hasLargeTables || !upperQuery.includes('WHERE')) {
        optimizations.push('Consider adding LIMIT clause to prevent large result sets from potentially large tables')
        if (!upperQuery.includes('WHERE')) {
          optimizedQuery = query.trim() + ' LIMIT 1000'
          expectedImprovement = 'Significantly reduced memory usage and faster response time'
        }
      }
    }
    
    // Check for SELECT * with schema awareness
    if (upperQuery.includes('SELECT *')) {
      const tableCount = availableTables.length
      if (tableCount > 0) {
        optimizations.push(`Replace SELECT * with specific column names for better performance (${tableCount} tables available)`)
        expectedImprovement = 'Reduced network traffic and improved query performance'
      }
    }
    
    // Schema-aware JOIN optimization
    const joinCount = (upperQuery.match(/JOIN/g) || []).length
    if (joinCount > 2) {
      const joinTables = upperQuery.match(/JOIN\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi)
      if (joinTables) {
        const referencedTables = joinTables.map(match => match.split(/\s+/).pop()?.toLowerCase())
        const missingTables = referencedTables.filter(table => 
          table && !availableTables.some(available => available.toLowerCase() === table)
        )
        
        if (missingTables.length > 0) {
          optimizations.push(`Warning: Some joined tables may not exist: ${missingTables.join(', ')}`)
        } else {
          optimizations.push('Multiple JOINs detected - ensure proper indexing on join columns')
          expectedImprovement = 'Improved JOIN performance with proper indexes'
        }
      }
    }
    
    // Enhanced WHERE clause analysis
    if (upperQuery.includes('SELECT') && !upperQuery.includes('WHERE') && !upperQuery.includes('LIMIT')) {
      if (availableTables.length > 0) {
        optimizations.push(`Consider adding WHERE clause to filter data from ${availableTables.length} available tables`)
        expectedImprovement = 'Significantly faster query execution by reducing data scanned'
      }
    }
    
    // Check for functions in WHERE clause
    if (upperQuery.includes('WHERE')) {
      const functionsInWhere = ['UPPER(', 'LOWER(', 'DATE(', 'SUBSTRING(', 'CAST(']
      const detectedFunctions = functionsInWhere.filter(func => upperQuery.includes(func))
      
      if (detectedFunctions.length > 0) {
        optimizations.push(`Avoid functions in WHERE clause to enable index usage: ${detectedFunctions.join(', ')}`)
        expectedImprovement = 'Better index utilization and faster filtering'
      }
    }
    
    // Schema-specific optimization suggestions
    if (schemaContext.length > 0) {
      // Check for potential foreign key relationships
      const queryTables = availableTables.filter(table => 
        upperQuery.includes(table.toUpperCase())
      )
      
      if (queryTables.length > 1) {
        optimizations.push(`Query involves multiple tables (${queryTables.join(', ')}) - ensure proper JOIN conditions`)
      }
      
      // Check for common performance anti-patterns
      if (upperQuery.includes('ORDER BY') && !upperQuery.includes('LIMIT')) {
        optimizations.push('ORDER BY without LIMIT can be expensive on large datasets')
        expectedImprovement = 'Add LIMIT clause to improve sorting performance'
      }
      
      if (upperQuery.includes('GROUP BY') && !upperQuery.includes('HAVING') && upperQuery.includes('WHERE')) {
        optimizations.push('Consider using HAVING clause for aggregate conditions instead of WHERE')
      }
    }
    
    if (optimizations.length === 0) {
      console.log('💡 No enhanced basic optimizations found for query')
      return null
    }
    
    return {
      originalQuery: query,
      optimizedQuery: optimizedQuery !== query ? optimizedQuery : query,
      explanation: optimizations.join('. '),
      expectedImprovement: expectedImprovement || 'General performance improvement based on schema analysis',
      optimizationType: 'enhanced_basic',
      schemaAnalysis: {
        tablesAvailable: availableTables.length,
        tablesReferenced: availableTables.filter(table => 
          upperQuery.includes(table.toUpperCase())
        ),
        hasSchemaContext: schemaContext.length > 0
      },
      chatId: chatId
    }
    
  } catch (error) {
    console.error('Error in enhanced basic optimization:', error)
    return null
  }
}

/**
 * Health check endpoint with enhanced capabilities
 */
export async function GET() {
  try {
    let features = {
      schemaEmbeddings: false,
      remoteQueryAgent: false,
      incrementalUpdates: false,
      basicOptimization: true
    }
    
    // Check if enhanced features are available
    try {
      await import('@/lib/agents2/remoteQueryAgent')
      features.remoteQueryAgent = true
      console.log('✅ Enhanced remote query agent available')
    } catch (importError) {
      console.log('⚠️ Enhanced remote query agent not available')
    }
    
    try {
      await import('@/lib/utils/incrementalSchemaUpdates')
      features.incrementalUpdates = true
      console.log('✅ Incremental schema updates available')
    } catch (importError) {
      console.log('⚠️ Incremental schema updates not available')
    }
    
    try {
      await import('@/app/actions/remoteQuery')
      features.schemaEmbeddings = true
      console.log('✅ Schema embeddings available')
    } catch (importError) {
      console.log('⚠️ Schema embeddings not available')
    }
    
    const allFeaturesAvailable = Object.values(features).every(Boolean)
    
    return NextResponse.json({
      success: true,
      message: allFeaturesAvailable 
        ? 'Enhanced optimize-query API is fully operational'
        : 'Enhanced optimize-query API is running with some features unavailable',
      features,
      capabilities: {
        enhancedOptimization: features.remoteQueryAgent,
        schemaAwareOptimization: features.schemaEmbeddings,
        incrementalSchemaUpdates: features.incrementalUpdates,
        basicOptimizationFallback: true
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Service unavailable',
      timestamp: new Date().toISOString()
    }, { status: 503 })
  }
}
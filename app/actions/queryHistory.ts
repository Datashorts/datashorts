// app/actions/queryHistory.ts
'use server'

import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/configs/db'
import { queryHistory, dbConnections } from '@/configs/schema'
import { eq, and, desc, asc, like, sql, or } from 'drizzle-orm'

interface QueryHistoryEntry {
  id?: number
  connectionId: number
  chatId?: number
  sqlQuery: string
  queryType?: string
  success: boolean
  executionTime?: number
  rowCount?: number
  errorMessage?: string
  resultData?: any
  resultColumns?: string[]
  userIntent?: string
  generatedBy?: 'manual' | 'ai_generated' | 'template'
  validationEnabled?: boolean
  optimizationEnabled?: boolean
  forceExecution?: boolean
  tags?: string[]
  isFavorite?: boolean
  isBookmarked?: boolean
  validationResult?: any
  optimizationSuggestion?: any
}

interface QueryHistoryFilters {
  limit?: number
  offset?: number
  onlyBookmarked?: boolean
  onlyFavorites?: boolean
  queryType?: string
  sortBy?: 'recent' | 'oldest' | 'execution_time'
  searchQuery?: string
}

/**
 * Helper function to determine query type from SQL
 */
function determineQueryType(sqlQuery: string): string {
  const upperQuery = sqlQuery.toUpperCase().trim()
  
  if (upperQuery.startsWith('SELECT')) return 'SELECT'
  if (upperQuery.startsWith('INSERT')) return 'INSERT'
  if (upperQuery.startsWith('UPDATE')) return 'UPDATE'
  if (upperQuery.startsWith('DELETE')) return 'DELETE'
  if (upperQuery.startsWith('CREATE')) return 'CREATE'
  if (upperQuery.startsWith('DROP')) return 'DROP'
  if (upperQuery.startsWith('ALTER')) return 'ALTER'
  if (upperQuery.startsWith('TRUNCATE')) return 'TRUNCATE'
  if (upperQuery.startsWith('EXPLAIN')) return 'EXPLAIN'
  if (upperQuery.startsWith('DESCRIBE') || upperQuery.startsWith('DESC')) return 'DESCRIBE'
  if (upperQuery.startsWith('SHOW')) return 'SHOW'
  if (upperQuery.startsWith('WITH')) return 'CTE'
  
  return 'UNKNOWN'
}

/**
 * Save a query execution to history
 */
export async function saveQueryToHistory(entry: QueryHistoryEntry) {
  try {
    console.log('🔄 Attempting to save query to history...')
    
    const user = await currentUser()
    console.log('👤 Current user:', user?.id)
    
    if (!user) {
      console.log('❌ No user found')
      return { success: false, error: 'Authentication required' }
    }

    // Verify user has access to this connection
    console.log('🔍 Checking connection access for connectionId:', entry.connectionId)
    
    const [connection] = await db
      .select()
      .from(dbConnections)
      .where(eq(dbConnections.id, entry.connectionId))

    console.log('🔗 Found connection:', connection?.id, 'User match:', connection?.userId === user.id)

    if (!connection || connection.userId !== user.id) {
      console.log('❌ Connection not found or access denied')
      return { success: false, error: 'Connection not found or access denied' }
    }

    // Determine query type from SQL
    const queryType = entry.queryType || determineQueryType(entry.sqlQuery)
    console.log('📝 Query type determined:', queryType)

    // Limit result data size to prevent database bloat (store only first 100 rows)
    let resultData = entry.resultData
    if (resultData && Array.isArray(resultData) && resultData.length > 100) {
      resultData = resultData.slice(0, 100)
      console.log('✂️ Trimmed result data to 100 rows')
    }

    const historyData = {
      userId: user.id,
      connectionId: entry.connectionId,
      chatId: entry.chatId || null,
      sqlQuery: entry.sqlQuery,
      queryType,
      success: entry.success,
      executionTime: entry.executionTime || null,
      rowCount: entry.rowCount || null,
      errorMessage: entry.errorMessage || null,
      resultData,
      resultColumns: entry.resultColumns || null,
      userIntent: entry.userIntent || null,
      generatedBy: entry.generatedBy || 'manual',
      validationEnabled: entry.validationEnabled ?? true,
      optimizationEnabled: entry.optimizationEnabled ?? true,
      forceExecution: entry.forceExecution ?? false,
      tags: entry.tags || null,
      isFavorite: entry.isFavorite ?? false,
      isBookmarked: entry.isBookmarked ?? false,
      validationResult: entry.validationResult || null,
      optimizationSuggestion: entry.optimizationSuggestion || null,
    }

    console.log('💾 Saving history data:', { ...historyData, resultData: resultData ? `${resultData.length} rows` : 'null' })

    const [savedEntry] = await db.insert(queryHistory).values(historyData).returning()

    console.log('✅ Query saved to history with ID:', savedEntry.id)
    return { success: true, data: savedEntry }
  } catch (error) {
    console.error('❌ Error saving query to history:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to save query' 
    }
  }
}

/**
 * Get query history for a connection with filtering and pagination
 */
export async function getQueryHistory(
  connectionId: number, 
  filters: QueryHistoryFilters = {}
) {
  try {
    console.log('📖 Loading query history for connection:', connectionId, 'filters:', filters)
    
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const {
      limit = 50,
      offset = 0,
      onlyBookmarked = false,
      onlyFavorites = false,
      queryType,
      sortBy = 'recent',
      searchQuery
    } = filters

    // Build where conditions
    let whereConditions = and(
      eq(queryHistory.userId, user.id),
      eq(queryHistory.connectionId, connectionId)
    )

    if (onlyBookmarked) {
      whereConditions = and(whereConditions, eq(queryHistory.isBookmarked, true))
    }

    if (onlyFavorites) {
      whereConditions = and(whereConditions, eq(queryHistory.isFavorite, true))
    }

    if (queryType && queryType !== 'all') {
      whereConditions = and(whereConditions, eq(queryHistory.queryType, queryType))
    }

    if (searchQuery) {
      whereConditions = and(
        whereConditions,
        or(
          like(queryHistory.sqlQuery, `%${searchQuery}%`),
          like(queryHistory.userIntent, `%${searchQuery}%`)
        )
      )
    }

    // Determine sort order
    let orderBy
    switch (sortBy) {
      case 'oldest':
        orderBy = asc(queryHistory.createdAt)
        break
      case 'execution_time':
        orderBy = desc(queryHistory.executionTime)
        break
      default:
        orderBy = desc(queryHistory.createdAt)
    }

    const history = await db
      .select({
        id: queryHistory.id,
        sqlQuery: queryHistory.sqlQuery,
        queryType: queryHistory.queryType,
        success: queryHistory.success,
        executionTime: queryHistory.executionTime,
        rowCount: queryHistory.rowCount,
        errorMessage: queryHistory.errorMessage,
        userIntent: queryHistory.userIntent,
        generatedBy: queryHistory.generatedBy,
        tags: queryHistory.tags,
        isFavorite: queryHistory.isFavorite,
        isBookmarked: queryHistory.isBookmarked,
        createdAt: queryHistory.createdAt,
        // Check if result data exists without loading it
        hasResultData: sql<boolean>`CASE WHEN ${queryHistory.resultData} IS NOT NULL THEN true ELSE false END`,
      })
      .from(queryHistory)
      .where(whereConditions)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset)

    console.log('📋 Found', history.length, 'history entries')
    return { success: true, data: history }
  } catch (error) {
    console.error('❌ Error fetching query history:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch history' 
    }
  }
}

/**
 * Get full query details including result data
 */
export async function getQueryDetails(queryId: number) {
  try {
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const [query] = await db
      .select()
      .from(queryHistory)
      .where(and(
        eq(queryHistory.id, queryId),
        eq(queryHistory.userId, user.id)
      ))

    if (!query) {
      return { success: false, error: 'Query not found' }
    }

    return { success: true, data: query }
  } catch (error) {
    console.error('Error fetching query details:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch query details' 
    }
  }
}

/**
 * Toggle bookmark status
 */
export async function toggleQueryBookmark(queryId: number) {
  try {
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const [query] = await db
      .select({ isBookmarked: queryHistory.isBookmarked })
      .from(queryHistory)
      .where(and(
        eq(queryHistory.id, queryId),
        eq(queryHistory.userId, user.id)
      ))

    if (!query) {
      return { success: false, error: 'Query not found' }
    }

    const newBookmarkStatus = !query.isBookmarked

    await db
      .update(queryHistory)
      .set({ 
        isBookmarked: newBookmarkStatus,
        updatedAt: new Date()
      })
      .where(eq(queryHistory.id, queryId))

    return { success: true, data: { isBookmarked: newBookmarkStatus } }
  } catch (error) {
    console.error('Error toggling bookmark:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to toggle bookmark' 
    }
  }
}

/**
 * Toggle favorite status
 */
export async function toggleQueryFavorite(queryId: number) {
  try {
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const [query] = await db
      .select({ isFavorite: queryHistory.isFavorite })
      .from(queryHistory)
      .where(and(
        eq(queryHistory.id, queryId),
        eq(queryHistory.userId, user.id)
      ))

    if (!query) {
      return { success: false, error: 'Query not found' }
    }

    const newFavoriteStatus = !query.isFavorite

    await db
      .update(queryHistory)
      .set({ 
        isFavorite: newFavoriteStatus,
        updatedAt: new Date()
      })
      .where(eq(queryHistory.id, queryId))

    return { success: true, data: { isFavorite: newFavoriteStatus } }
  } catch (error) {
    console.error('Error toggling favorite:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to toggle favorite' 
    }
  }
}

/**
 * Add tags to a query
 */
export async function updateQueryTags(queryId: number, tags: string[]) {
  try {
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate tags (max 10 tags, each max 50 characters)
    if (tags.length > 10) {
      return { success: false, error: 'Maximum 10 tags allowed' }
    }

    const validTags = tags
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0 && tag.length <= 50)

    await db
      .update(queryHistory)
      .set({ 
        tags: validTags,
        updatedAt: new Date()
      })
      .where(and(
        eq(queryHistory.id, queryId),
        eq(queryHistory.userId, user.id)
      ))

    return { success: true, data: { tags: validTags } }
  } catch (error) {
    console.error('Error updating tags:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update tags' 
    }
  }
}

/**
 * Delete query from history
 */
export async function deleteQueryFromHistory(queryId: number) {
  try {
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    await db
      .delete(queryHistory)
      .where(and(
        eq(queryHistory.id, queryId),
        eq(queryHistory.userId, user.id)
      ))

    return { success: true }
  } catch (error) {
    console.error('Error deleting query:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete query' 
    }
  }
}

/**
 * Bulk delete queries from history
 */
export async function bulkDeleteQueries(queryIds: number[]) {
  try {
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    if (queryIds.length === 0) {
      return { success: true, deletedCount: 0 }
    }

    // Delete queries in batches of 100
    let deletedCount = 0
    for (let i = 0; i < queryIds.length; i += 100) {
      const batch = queryIds.slice(i, i + 100)
      
      for (const queryId of batch) {
        await db
          .delete(queryHistory)
          .where(and(
            eq(queryHistory.id, queryId),
            eq(queryHistory.userId, user.id)
          ))
        deletedCount++
      }
    }

    return { success: true, deletedCount }
  } catch (error) {
    console.error('Error bulk deleting queries:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete queries' 
    }
  }
}

/**
 * Get query statistics for a connection
 */
export async function getQueryStatistics(connectionId: number) {
  try {
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Get all queries for this connection
    const allQueries = await db
      .select({
        id: queryHistory.id,
        success: queryHistory.success,
        queryType: queryHistory.queryType,
        executionTime: queryHistory.executionTime,
        rowCount: queryHistory.rowCount,
        isBookmarked: queryHistory.isBookmarked,
        isFavorite: queryHistory.isFavorite,
        createdAt: queryHistory.createdAt,
      })
      .from(queryHistory)
      .where(and(
        eq(queryHistory.userId, user.id),
        eq(queryHistory.connectionId, connectionId)
      ))

    const totalQueries = allQueries.length
    const successfulQueries = allQueries.filter(q => q.success)
    const failedQueries = allQueries.filter(q => !q.success)

    // Calculate average execution time for successful queries
    const successfulWithTime = successfulQueries.filter(q => q.executionTime !== null)
    const avgExecutionTime = successfulWithTime.length > 0
      ? successfulWithTime.reduce((sum, q) => sum + (q.executionTime || 0), 0) / successfulWithTime.length
      : 0

    // Get query type breakdown
    const queryTypeBreakdown = allQueries.reduce((acc, query) => {
      const type = query.queryType || 'UNKNOWN'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Calculate queries for the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const recentQueries = allQueries.filter(q => 
      new Date(q.createdAt!) > thirtyDaysAgo
    )

    return {
      success: true,
      data: {
        totalQueries,
        successfulQueries: successfulQueries.length,
        failedQueries: failedQueries.length,
        successRate: totalQueries > 0 ? Math.round((successfulQueries.length / totalQueries) * 100) : 0,
        averageExecutionTime: Math.round(avgExecutionTime),
        bookmarkedQueries: allQueries.filter(q => q.isBookmarked).length,
        favoriteQueries: allQueries.filter(q => q.isFavorite).length,
        queryTypeBreakdown,
        queriesLast30Days: recentQueries.length,
        totalRowsProcessed: allQueries.reduce((sum, q) => sum + (q.rowCount || 0), 0),
      }
    }
  } catch (error) {
    console.error('Error fetching statistics:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch statistics' 
    }
  }
}

/**
 * Get recent queries across all connections for a user
 */
export async function getRecentQueriesAcrossConnections(limit: number = 10) {
  try {
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const recentQueries = await db
      .select({
        id: queryHistory.id,
        sqlQuery: queryHistory.sqlQuery,
        success: queryHistory.success,
        queryType: queryHistory.queryType,
        connectionId: queryHistory.connectionId,
        createdAt: queryHistory.createdAt,
        connectionName: dbConnections.connectionName,
      })
      .from(queryHistory)
      .leftJoin(dbConnections, eq(queryHistory.connectionId, dbConnections.id))
      .where(eq(queryHistory.userId, user.id))
      .orderBy(desc(queryHistory.createdAt))
      .limit(limit)

    return { success: true, data: recentQueries }
  } catch (error) {
    console.error('Error fetching recent queries:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch recent queries' 
    }
  }
}
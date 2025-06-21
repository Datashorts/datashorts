// File: app/actions/remoteQuery.ts (COMPLETE ENHANCED - WITH DATABASE SCHEMA PERSISTENCE)
'use server'

import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/configs/db'
import { dbConnections } from '@/configs/schema'
import { eq } from 'drizzle-orm'
import { index as pinecone } from '@/app/lib/pinecone'
import OpenAI from 'openai'
import { incrementalSchemaUpdate, detectSchemaChangeType, smartSchemaUpdate } from '@/lib/utils/incrementalSchemaUpdates'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  schemaUpdate?: {
    updated: boolean
    type: 'none' | 'incremental' | 'smart' | 'targeted'
    tablesProcessed: number
    vectorsAdded: number
    vectorsRemoved: number
    vectorsUpdated: number
    schemaUpdated?: boolean
  }
}

interface SchemaEmbedding {
  tableName: string;
  text: string;
  columns: string;
  score: number;
}

/**
 * Get schema context from Pinecone embeddings
 */
export async function getSchemaFromEmbeddings(connectionId: string, query: string): Promise<SchemaEmbedding[]> {
  try {
    console.log('🧠 Retrieving schema from embeddings for connection:', connectionId);
    console.log('🔍 Query for embeddings search:', query);
    
    // Generate embedding for the query
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: `Database schema context for: ${query}`,
      encoding_format: "float",
    });

    // Search for relevant schema embeddings
    const searchResult = await pinecone.query({
      vector: response.data[0].embedding,
      topK: 8,
      filter: {
        connectionId: connectionId,
        pipeline: "pipeline2",
        type: "schema"
      },
      includeMetadata: true,
    });

    if (!searchResult.matches || searchResult.matches.length === 0) {
      console.log('⚠️ No schema embeddings found');
      return [];
    }

    // Process matches into schema context
    const schemaEmbeddings: SchemaEmbedding[] = searchResult.matches.map(match => ({
      tableName: match.metadata?.tableName as string || 'unknown',
      text: match.metadata?.text as string || '',
      columns: match.metadata?.columns as string || '',
      score: match.score || 0
    }));

    console.log('✅ Retrieved', schemaEmbeddings.length, 'relevant schema embeddings');
    
    // LOG EACH EMBEDDING CONTEXT
    console.log('📋 EMBEDDINGS CONTEXT DETAILS:');
    schemaEmbeddings.forEach((embedding, index) => {
      console.log(`📦 Embedding ${index + 1}:`);
      console.log(`  🏷️  Table: ${embedding.tableName}`);
      console.log(`  📊 Score: ${embedding.score?.toFixed(4)}`);
      console.log(`  📝 Text: ${embedding.text}`);
      console.log(`  📊 Columns: ${embedding.columns}`);
      console.log('  ─────────────────────────────────────');
    });
    
    return schemaEmbeddings;
    
  } catch (error) {
    console.error('❌ Error retrieving schema embeddings:', error);
    return [];
  }
}

/**
 * Get fresh schema from database and update db_connections table
 */
async function refreshDatabaseSchema(connectionId: string): Promise<{
  success: boolean;
  schema?: any[];
  error?: string;
}> {
  try {
    console.log('🔄 Refreshing database schema for connection:', connectionId);
    
    // Get connection details
    const [connection] = await db
      .select()
      .from(dbConnections)
      .where(eq(dbConnections.id, Number(connectionId)));

    if (!connection) {
      return { success: false, error: 'Connection not found' };
    }

    let freshSchema: any[] = [];

    // Get fresh schema based on database type
    if (connection.dbType === 'postgres' && connection.postgresUrl) {
      freshSchema = await getPostgresSchema(connection.postgresUrl);
    } else if (connection.dbType === 'mongodb' && connection.mongoUrl) {
      freshSchema = await getMongoSchema(connection.mongoUrl);
    } else {
      return { success: false, error: 'Unsupported database type or missing connection URL' };
    }

    // Update the db_connections table with fresh schema
    await db
      .update(dbConnections)
      .set({ 
        tableSchema: freshSchema,
        updatedAt: new Date()
      })
      .where(eq(dbConnections.id, Number(connectionId)));

    console.log('✅ Database schema updated in db_connections table');
    console.log('📊 Fresh schema contains', freshSchema.length, 'tables');

    return { success: true, schema: freshSchema };
  } catch (error) {
    console.error('❌ Error refreshing database schema:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to refresh schema' 
    };
  }
}

/**
 * Get PostgreSQL schema
 */
async function getPostgresSchema(postgresUrl: string): Promise<any[]> {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ 
      connectionString: postgresUrl,
      ssl: postgresUrl.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    // Get all tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const schema = [];

    for (const table of tablesResult.rows) {
      const tableName = table.table_name;
      
      // Get columns for each table
      const columnsResult = await pool.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      schema.push({
        tableName,
        columns: columnsResult.rows,
        columnCount: columnsResult.rows.length
      });
    }

    await pool.end();
    return schema;
  } catch (error) {
    console.error('Error getting PostgreSQL schema:', error);
    throw error;
  }
}

/**
 * Get MongoDB schema
 */
async function getMongoSchema(mongoUrl: string): Promise<any[]> {
  try {
    const { connectToMongoDB } = await import('@/configs/mongoDB');
    const collections = await connectToMongoDB(mongoUrl);
    
    return collections.map(collection => ({
      tableName: collection.collectionName,
      columns: collection.schema,
      columnCount: collection.schema.length
    }));
  } catch (error) {
    console.error('Error getting MongoDB schema:', error);
    throw error;
  }
}

/**
 * Enhanced schema update with database persistence
 */
async function updateSchemaEmbeddingsWithPersistence(
  connectionId: string, 
  sqlQuery: string
): Promise<{
  success: boolean;
  type: 'incremental' | 'smart' | 'targeted';
  tablesProcessed: number;
  vectorsAdded: number;
  vectorsRemoved: number;
  vectorsUpdated: number;
  schemaUpdated: boolean;
  details?: any;
}> {
  try {
    console.log('🔄 Starting enhanced schema update with database persistence');
    
    // Step 1: Detect the type of schema change
    const changeDetection = detectSchemaChangeType(sqlQuery);
    console.log('🎯 Change detection result:', changeDetection);
    
    let updateResult;
    let updateType: 'incremental' | 'smart' | 'targeted' = 'incremental';
    let schemaUpdated = false;
    
    // Step 2: Update embeddings based on change type
    if (changeDetection.type !== 'NONE' && changeDetection.affectedTable) {
      console.log('🧠 Using smart schema update for specific table changes');
      updateResult = await smartSchemaUpdate(connectionId, sqlQuery);
      updateType = 'smart';
    } else {
      console.log('🔄 Using incremental schema update for general changes');
      updateResult = await incrementalSchemaUpdate(connectionId);
      updateType = 'incremental';
    }
    
    // Step 3: If embeddings were updated successfully, refresh database schema
    if (updateResult.success && (updateResult.vectorsAdded > 0 || updateResult.vectorsUpdated > 0 || updateResult.vectorsRemoved > 0)) {
      console.log('📊 Embeddings updated, refreshing database schema...');
      
      const schemaRefreshResult = await refreshDatabaseSchema(connectionId);
      
      if (schemaRefreshResult.success) {
        console.log('✅ Database schema successfully updated in db_connections table');
        schemaUpdated = true;
      } else {
        console.error('❌ Failed to update database schema:', schemaRefreshResult.error);
      }
    }
    
    return {
      success: updateResult.success,
      type: updateType,
      tablesProcessed: updateResult.tablesProcessed,
      vectorsAdded: updateResult.vectorsAdded,
      vectorsRemoved: updateResult.vectorsRemoved,
      vectorsUpdated: updateResult.vectorsUpdated,
      schemaUpdated,
      details: {
        ...updateResult.details,
        databaseSchemaUpdated: schemaUpdated
      }
    };
    
  } catch (error) {
    console.error('❌ Error in enhanced schema update with persistence:', error);
    return {
      success: false,
      type: 'incremental',
      tablesProcessed: 0,
      vectorsAdded: 0,
      vectorsRemoved: 0,
      vectorsUpdated: 0,
      schemaUpdated: false
    };
  }
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
 * Detect if query execution resulted in schema changes
 */
function detectSchemaChanges(sqlQuery: string): boolean {
  const upperQuery = sqlQuery.toUpperCase().trim();
  
  const schemaChangePatterns = [
    'CREATE TABLE',
    'DROP TABLE', 
    'ALTER TABLE',
    'ADD COLUMN',
    'DROP COLUMN',
    'RENAME COLUMN',
    'MODIFY COLUMN',
    'ALTER COLUMN',
    'CREATE INDEX',
    'DROP INDEX',
    'RENAME TABLE'
  ];
  
  return schemaChangePatterns.some(pattern => upperQuery.includes(pattern));
}

/**
 * Save query execution to history with chatId support
 * Excludes schema discovery queries from being saved to history
 */
async function saveToHistory(
  connectionId: string,
  sqlQuery: string,
  result: QueryResponse,
  executionTime: number,
  options: {
    validateQuery?: boolean
    optimizeQuery?: boolean
    forceExecution?: boolean
    chatId?: number
    skipHistory?: boolean  // New option to skip history saving
  } = {}
) {
  try {
    // Skip saving if explicitly requested or if it's a schema discovery query
    if (options.skipHistory) {
      console.log('⏭️ saveToHistory: Skipping history save (skipHistory = true)');
      return { success: true };
    }

    // Detect and skip schema discovery queries
    const upperQuery = sqlQuery.toUpperCase().trim();
    const isSchemaQuery = upperQuery.includes('INFORMATION_SCHEMA') || 
                         upperQuery.includes('SHOW TABLES') ||
                         upperQuery.includes('DESCRIBE ') ||
                         upperQuery.includes('\\D ');
    
    if (isSchemaQuery) {
      console.log('⏭️ saveToHistory: Skipping schema discovery query from history');
      return { success: true };
    }

    console.log('💾 saveToHistory: Starting...')
    console.log('💾 saveToHistory: Received options:', JSON.stringify(options, null, 2))
    console.log('🔗 saveToHistory: Connection ID:', connectionId)
    console.log('📊 saveToHistory: Result success:', result.success)
    
    const { saveQueryToHistory } = await import('@/app/actions/queryHistory')
    
    const historyEntry = {
      connectionId: Number(connectionId),
      chatId: options.chatId,
      sqlQuery: sqlQuery.trim(),
      success: result.success,
      executionTime,
      rowCount: result.data?.rowCount || 0,
      errorMessage: result.error,
      resultData: result.data?.rows?.slice(0, 50), // Store first 50 rows
      resultColumns: result.data?.columns,
      generatedBy: 'manual' as const,
      validationEnabled: options.validateQuery !== false,
      optimizationEnabled: options.optimizeQuery || false,
      forceExecution: options.forceExecution || false,
    }
    
    console.log('📋 saveToHistory: History entry chatId:', historyEntry.chatId)
    
    const saveResult = await saveQueryToHistory(historyEntry)
    console.log('💾 saveToHistory: Save result:', saveResult)
    
    if (!saveResult.success) {
      console.error('❌ saveToHistory: Failed to save:', saveResult.error)
    } else {
      console.log('✅ saveToHistory: Successfully saved with ID:', saveResult.data?.id)
    }
    
    return saveResult
  } catch (error) {
    console.error('💥 saveToHistory: Error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to save history' }
  }
}

/**
 * Enhanced execute query with database schema persistence
 */
export async function executeRemoteQuery(
  connectionId: string,
  sqlQuery: string,
  options: {
    validateQuery?: boolean
    optimizeQuery?: boolean
    forceExecution?: boolean
    saveToHistory?: boolean
    chatId?: number
  } = {}
): Promise<QueryResponse> {
  const startTime = Date.now()
  
  try {
    console.log('🎯 executeRemoteQuery: Starting with enhanced schema persistence...')
    console.log('🎯 executeRemoteQuery: Received options:', JSON.stringify(options, null, 2))
    console.log('🎯 executeRemoteQuery: chatId:', options.chatId)
    
    const user = await currentUser()
    if (!user) {
      return {
        success: false,
        error: 'Authentication required'
      }
    }

    // QUICK SECURITY CHECK
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
      const errorResult = {
        success: false,
        error: 'Connection not found or access denied'
      }
      
      if (options.saveToHistory !== false) {
        console.log('🔄 executeRemoteQuery: Saving failed query with chatId:', options.chatId)
        await saveToHistory(connectionId, sqlQuery, errorResult, Date.now() - startTime, {
          validateQuery: options.validateQuery,
          optimizeQuery: options.optimizeQuery,
          forceExecution: options.forceExecution,
          chatId: options.chatId
        })
      }
      
      return errorResult
    }

    // Get schema context from embeddings
    let schemaContext: SchemaEmbedding[] = [];
    try {
      schemaContext = await getSchemaFromEmbeddings(connectionId, sqlQuery);
    } catch (embeddingError) {
      console.error('Error getting schema context:', embeddingError);
    }

    console.log('🧠 Using schema context with', schemaContext.length, 'tables');

    // Execute query
    const result = await executeBasicQuery(connectionId, sqlQuery);
    const executionTime = Date.now() - startTime;
    
    console.log('🚀 executeRemoteQuery: Query executed successfully');
    
    // Initialize schema update result
    let schemaUpdate = {
      updated: false,
      type: 'none' as 'none' | 'incremental' | 'smart' | 'targeted',
      tablesProcessed: 0,
      vectorsAdded: 0,
      vectorsRemoved: 0,
      vectorsUpdated: 0,
      schemaUpdated: false
    };

    // Check if schema was modified and update both embeddings and database
    if (result.success && detectSchemaChanges(sqlQuery)) {
      console.log('🔄 Schema changes detected, performing enhanced update with persistence...');
      
      const updateResult = await updateSchemaEmbeddingsWithPersistence(connectionId, sqlQuery);
      
      schemaUpdate = {
        updated: updateResult.success,
        type: updateResult.type,
        tablesProcessed: updateResult.tablesProcessed,
        vectorsAdded: updateResult.vectorsAdded,
        vectorsRemoved: updateResult.vectorsRemoved,
        vectorsUpdated: updateResult.vectorsUpdated,
        schemaUpdated: updateResult.schemaUpdated
      };
      
      console.log('📊 Enhanced schema update result:', schemaUpdate);
    }

    // Add schemaUpdate to result
    const enhancedResult = {
      ...result,
      schemaUpdate
    };

    // Save to history if enabled
    if (options.saveToHistory !== false) {
      console.log('🔄 executeRemoteQuery: About to save to history with chatId:', options.chatId)
      
      const saveOptions = {
        validateQuery: options.validateQuery,
        optimizeQuery: options.optimizeQuery,
        forceExecution: options.forceExecution,
        chatId: options.chatId
      }
      
      console.log('🔄 executeRemoteQuery: Save options being passed:', JSON.stringify(saveOptions, null, 2))
      
      await saveToHistory(connectionId, sqlQuery, result, executionTime, saveOptions)
    } else {
      console.log('⏭️ executeRemoteQuery: Skipping history save (saveToHistory = false)')
    }
    
    return enhancedResult
    
  } catch (error) {
    console.error('💥 executeRemoteQuery: Error:', error)
    const errorResult = {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    }
    
    // Save failed query to history if enabled
    if (options.saveToHistory !== false) {
      console.log('🔄 executeRemoteQuery: Saving error query with chatId:', options.chatId)
      await saveToHistory(connectionId, sqlQuery, errorResult, Date.now() - startTime, {
        validateQuery: options.validateQuery,
        optimizeQuery: options.optimizeQuery,
        forceExecution: options.forceExecution,
        chatId: options.chatId
      })
    }
    
    return errorResult
  }
}

/**
 * Enhanced query explanation with schema embeddings context
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

    // Get schema context from embeddings only
    let schemaContext: SchemaEmbedding[] = []
    try {
      schemaContext = await getSchemaFromEmbeddings(connectionId, sqlQuery)
    } catch (error) {
      console.error('Error getting schema context for explanation:', error)
    }

    try {
      const { openaiClient } = await import('@/app/lib/clients')
      
      const schemaContextText = schemaContext.map(embedding => 
        `Table: ${embedding.tableName}\nColumns: ${embedding.columns}\nContext: ${embedding.text}`
      ).join('\n\n');

      // LOG THE EXACT CONTEXT SENT TO LLM
      console.log('🤖 EXPLAIN QUERY - CONTEXT SENT TO LLM:');
      console.log('================================================');
      console.log(`📋 Schema Context Text (${schemaContextText.length} characters):`);
      console.log(schemaContextText);
      console.log('================================================');

      const prompt = `Explain this SQL query briefly: ${sqlQuery}

Available schema context (from embeddings):
${schemaContextText}`

      console.log('🤖 EXPLAIN QUERY - FULL PROMPT SENT TO LLM:');
      console.log('================================================');
      console.log(prompt);
      console.log('================================================');

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "Explain SQL queries concisely using the provided schema embeddings context."
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
        explanation,
        schemaContext: schemaContext.length,
        contextSource: 'embeddings'
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
 * Enhanced query suggestions with schema embeddings context
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

    // Get schema context from embeddings only
    let schemaContext: SchemaEmbedding[] = []
    try {
      schemaContext = await getSchemaFromEmbeddings(connectionId, userIntent)
    } catch (error) {
      console.error('Error getting schema context for suggestions:', error)
    }

    try {
      const { openaiClient } = await import('@/app/lib/clients')
      
      const schemaContextText = schemaContext.map(embedding => 
        `${embedding.tableName}: ${embedding.columns}`
      ).join('\n');

      // LOG THE EXACT CONTEXT SENT TO LLM
      console.log('🤖 GET SUGGESTIONS - CONTEXT SENT TO LLM:');
      console.log('================================================');
      console.log(`📋 Schema Context Text (${schemaContextText.length} characters):`);
      console.log(schemaContextText);
      console.log('================================================');

      const prompt = `Based on: "${userIntent}", suggest 3 SQL queries in JSON format:
{
  "suggestions": [
    {"query": "SELECT ...", "description": "...", "difficulty": "beginner"}
  ]
}

Schema context (from embeddings):
${schemaContextText}`

      console.log('🤖 GET SUGGESTIONS - FULL PROMPT SENT TO LLM:');
      console.log('================================================');
      console.log(prompt);
      console.log('================================================');

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a SQL assistant using schema embeddings context. Provide JSON responses only."
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
        suggestions: result.suggestions || [],
        schemaContext: schemaContext.length,
        contextSource: 'embeddings'
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
 * Enhanced database schema retrieval with embeddings support
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

    // Get schema from embeddings only
    let schema: any[] = []
    try {
      const schemaEmbeddings = await getSchemaFromEmbeddings(connectionId, 'get database schema');
      
      if (schemaEmbeddings.length > 0) {
        console.log('✅ Using schema from embeddings');
        schema = schemaEmbeddings.map(embedding => ({
          tableName: embedding.tableName,
          columns: embedding.columns
        }));
      } else {
        console.log('⚠️ No embeddings found for schema');
      }
    } catch (error) {
      console.error('Error getting schema from embeddings:', error);
    }

    return {
      success: true,
      schema,
      connectionName: connection.connectionName,
      dbType: connection.dbType,
      schemaSource: 'embeddings'
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
 * Enhanced batch execution with incremental schema updates support
 */
export async function executeBatchQueries(
  connectionId: string,
  queries: string[],
  options: {
    validateQueries?: boolean
    stopOnError?: boolean
    transactional?: boolean
    saveToHistory?: boolean
    chatId?: number
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
        errorCount: 1,
        schemaUpdate: {
          updated: false,
          totalTablesProcessed: 0,
          totalVectorsAdded: 0,
          totalVectorsRemoved: 0,
          totalVectorsUpdated: 0,
          updateDetails: []
        }
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
        errorCount: 1,
        schemaUpdate: {
          updated: false,
          totalTablesProcessed: 0,
          totalVectorsAdded: 0,
          totalVectorsRemoved: 0,
          totalVectorsUpdated: 0,
          updateDetails: []
        }
      }
    }

    // Execute queries with minimal processing
    const results = []
    let successCount = 0
    let errorCount = 0
    let totalSchemaUpdates = {
      updated: false,
      totalTablesProcessed: 0,
      totalVectorsAdded: 0,
      totalVectorsRemoved: 0,
      totalVectorsUpdated: 0,
      updateDetails: [] as any[]
    }
    const startTime = Date.now()

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i].trim();
      if (!query) continue;

      const result = await executeRemoteQuery(connectionId, query, {
        validateQuery: false,
        optimizeQuery: false,
        forceExecution: options.validateQueries ? false : true,
        saveToHistory: options.saveToHistory !== false,
        chatId: options.chatId
      })
      
      results.push(result)
      
      if (result.success) {
        successCount++
        // Accumulate schema updates
        if (result.schemaUpdate?.updated) {
          totalSchemaUpdates.updated = true;
          totalSchemaUpdates.totalTablesProcessed += result.schemaUpdate.tablesProcessed;
          totalSchemaUpdates.totalVectorsAdded += result.schemaUpdate.vectorsAdded;
          totalSchemaUpdates.totalVectorsRemoved += result.schemaUpdate.vectorsRemoved;
          totalSchemaUpdates.totalVectorsUpdated += result.schemaUpdate.vectorsUpdated;
          totalSchemaUpdates.updateDetails.push({
            queryIndex: i,
            query: query.substring(0, 100) + '...',
            ...result.schemaUpdate
          });
        }
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
      errorCount,
      schemaUpdate: totalSchemaUpdates
    }
  } catch (error) {
    console.error('Error in executeBatchQueries:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      results: [],
      totalExecutionTime: 0,
      successCount: 0,
      errorCount: 1,
      schemaUpdate: {
        updated: false,
        totalTablesProcessed: 0,
        totalVectorsAdded: 0,
        totalVectorsRemoved: 0,
        totalVectorsUpdated: 0,
        updateDetails: []
      }
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
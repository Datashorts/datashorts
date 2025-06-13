// lib/agents2/remoteQueryAgent.ts (Enhanced with Incremental Schema Updates)
import { executeSQLQuery } from '@/app/lib/db/executeQuery';
import { openaiClient } from '@/app/lib/clients';
import { index as pinecone } from '@/app/lib/pinecone';
import { db } from '@/configs/db';
import { dbConnections } from '@/configs/schema';
import { eq } from 'drizzle-orm';
import OpenAI from 'openai';
import { 
  incrementalSchemaUpdate, 
  smartSchemaUpdate, 
  detectSchemaChangeType 
} from '@/lib/utils/incrementalSchemaUpdates';

interface QueryValidationResult {
  isValid: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  warnings: string[];
  suggestions?: string[];
  estimatedImpact?: string;
}

interface QueryOptimizationSuggestion {
  originalQuery: string;
  optimizedQuery: string;
  explanation: string;
  expectedImprovement: string;
}

interface RemoteQueryResult {
  success: boolean;
  data?: {
    rows: any[];
    rowCount: number;
    columns: string[];
    executionTime: number;
  };
  error?: string;
  validation?: QueryValidationResult;
  optimization?: QueryOptimizationSuggestion;
  metadata?: {
    queryType: string;
    affectedTables: string[];
    readOnly: boolean;
  };
  schemaUpdate?: {
    updated: boolean;
    type: 'none' | 'incremental' | 'smart' | 'targeted';
    tablesProcessed: number;
    vectorsAdded: number;
    vectorsRemoved: number;
    vectorsUpdated: number;
    details?: any;
  };
}

interface SchemaEmbedding {
  tableName: string;
  text: string;
  columns: string;
  score: number;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Retrieve schema context from Pinecone embeddings
 */
async function getSchemaEmbeddingsContext(connectionId: string, queryText: string): Promise<SchemaEmbedding[]> {
  try {
    console.log('🔍 Retrieving schema embeddings from Pinecone for connection:', connectionId);
    
    // Generate embedding for the query
    const queryEmbedding = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: `Database schema for: ${queryText}`,
      encoding_format: "float",
    });

    // Search for relevant schema embeddings
    const searchResult = await pinecone.query({
      vector: queryEmbedding.data[0].embedding,
      topK: 10,
      filter: {
        connectionId: connectionId,
        pipeline: "pipeline2",
        type: "schema"
      },
      includeMetadata: true,
    });

    if (!searchResult.matches || searchResult.matches.length === 0) {
      console.log('⚠️ No schema embeddings found for connection:', connectionId);
      return [];
    }

    // Process matches into schema context
    const schemaContext: SchemaEmbedding[] = searchResult.matches.map(match => ({
      tableName: match.metadata?.tableName as string || 'unknown',
      text: match.metadata?.text as string || '',
      columns: match.metadata?.columns as string || '',
      score: match.score || 0
    }));

    console.log('✅ Retrieved', schemaContext.length, 'schema embeddings');
    return schemaContext;
    
  } catch (error) {
    console.error('❌ Error retrieving schema embeddings:', error);
    return [];
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
 * Enhanced schema update with incremental approach
 */
async function updateSchemaEmbeddingsIncremental(connectionId: string, sqlQuery: string): Promise<{
  success: boolean;
  type: 'incremental' | 'smart' | 'targeted';
  tablesProcessed: number;
  vectorsAdded: number;
  vectorsRemoved: number;
  vectorsUpdated: number;
  details?: any;
  error?: string;
}> {
  try {
    console.log('🔄 Starting incremental schema update for connection:', connectionId);
    console.log('🔍 Analyzing query for schema changes:', sqlQuery);
    
    // Detect the type of schema change
    const changeDetection = detectSchemaChangeType(sqlQuery);
    console.log('🎯 Change detection result:', changeDetection);
    
    let updateResult;
    let updateType: 'incremental' | 'smart' | 'targeted' = 'incremental';
    
    // Choose update strategy based on change type
    if (changeDetection.type !== 'NONE' && changeDetection.affectedTable) {
      // Use smart update for specific table changes
      console.log('🧠 Using smart schema update');
      updateResult = await smartSchemaUpdate(connectionId, sqlQuery);
      updateType = 'smart';
    } else {
      // Use incremental update for general changes
      console.log('🔄 Using incremental schema update');
      updateResult = await incrementalSchemaUpdate(connectionId);
      updateType = 'incremental';
    }
    
    if (updateResult.success) {
      console.log('✅ Schema update completed:', {
        type: updateType,
        tablesProcessed: updateResult.tablesProcessed,
        vectorsAdded: updateResult.vectorsAdded,
        vectorsRemoved: updateResult.vectorsRemoved,
        vectorsUpdated: updateResult.vectorsUpdated
      });
      
      return {
        success: true,
        type: updateType,
        tablesProcessed: updateResult.tablesProcessed,
        vectorsAdded: updateResult.vectorsAdded,
        vectorsRemoved: updateResult.vectorsRemoved,
        vectorsUpdated: updateResult.vectorsUpdated,
        details: updateResult.details
      };
    } else {
      console.error('❌ Schema update failed:', updateResult.error);
      return {
        success: false,
        type: updateType,
        tablesProcessed: 0,
        vectorsAdded: 0,
        vectorsRemoved: 0,
        vectorsUpdated: 0,
        error: updateResult.error
      };
    }
    
  } catch (error) {
    console.error('❌ Error in incremental schema update:', error);
    return {
      success: false,
      type: 'incremental',
      tablesProcessed: 0,
      vectorsAdded: 0,
      vectorsRemoved: 0,
      vectorsUpdated: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Enhanced validate query with schema embeddings context
 */
async function validateQuery(sqlQuery: string, schemaEmbeddings: SchemaEmbedding[]): Promise<QueryValidationResult> {
  try {
    // Create schema context from embeddings
    const schemaContext = schemaEmbeddings.map(embedding => 
      `Table: ${embedding.tableName} - ${embedding.columns}`
    ).join('\n');

    const prompt = `
Analyze this SQL query for potential issues, security risks, and optimization opportunities:

Query: ${sqlQuery}

Relevant schema context from embeddings:
${schemaContext}

Please evaluate:
1. Security risks (SQL injection potential, privilege escalation)
2. Performance impact (missing indexes, expensive operations)
3. Data safety (destructive operations, large result sets)
4. Query correctness (syntax, table/column existence)

Respond in JSON format:
{
  "isValid": boolean,
  "riskLevel": "low" | "medium" | "high",
  "warnings": ["warning1", "warning2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "estimatedImpact": "description of expected impact"
}
`;

    const response = await openaiClient.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a database security and performance expert. Analyze SQL queries using schema embeddings context for potential issues and provide recommendations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 500
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      isValid: result.isValid ?? true,
      riskLevel: result.riskLevel ?? 'low',
      warnings: result.warnings ?? [],
      suggestions: result.suggestions ?? [],
      estimatedImpact: result.estimatedImpact ?? 'Unknown impact'
    };
  } catch (error) {
    console.error('Error validating query:', error);
    return {
      isValid: true,
      riskLevel: 'medium',
      warnings: ['Could not validate query automatically'],
      estimatedImpact: 'Unknown impact'
    };
  }
}

/**
 * Enhanced optimize query with schema embeddings context
 */
async function optimizeQuery(sqlQuery: string, schemaEmbeddings: SchemaEmbedding[]): Promise<QueryOptimizationSuggestion | null> {
  try {
    // Basic query analysis first
    const upperQuery = sqlQuery.toUpperCase().trim();
    
    // Skip optimization for very simple queries
    if (upperQuery.length < 20 || 
        (!upperQuery.includes('JOIN') && !upperQuery.includes('WHERE') && 
         !upperQuery.includes('ORDER BY') && !upperQuery.includes('GROUP BY') &&
         !upperQuery.includes('CROSS') && !upperQuery.includes('SUBQUERY') &&
         !upperQuery.includes('SELECT') || upperQuery.includes('LIMIT'))) {
      return null;
    }

    // Create schema context from embeddings
    const schemaContext = schemaEmbeddings.map(embedding => 
      `Table: ${embedding.tableName}\nColumns: ${embedding.columns}\nContext: ${embedding.text}`
    ).join('\n\n');

    const prompt = `
Analyze and optimize this SQL query for better performance using schema embeddings context:

Original Query:
${sqlQuery}

Database Schema Context (from embeddings):
${schemaContext}

Look for these optimization opportunities:
1. Unnecessary CROSS JOINs that can be eliminated or converted to proper JOINs
2. Redundant subqueries that can be converted to JOINs or window functions
3. Missing LIMIT clauses for potentially large result sets
4. Inefficient WHERE conditions that can be optimized
5. Redundant DISTINCT operations
6. Function calls on columns that prevent index usage
7. Complex nested queries that can be simplified
8. Redundant EXISTS or IN clauses
9. Inefficient ORDER BY operations
10. Subqueries in SELECT that can be converted to JOINs

If meaningful optimizations are possible, provide:
- The optimized query with concrete improvements
- Clear explanation of each change made
- Expected performance improvement

Respond in JSON format:
{
  "canOptimize": true/false,
  "optimizedQuery": "complete optimized SQL here",
  "explanation": "detailed explanation of what was changed and why",
  "expectedImprovement": "specific performance improvement description",
  "changes": ["specific change 1", "specific change 2"]
}

If no meaningful optimizations are possible, respond with:
{"canOptimize": false, "reason": "explanation why no optimization is needed"}
`;

    const response = await openaiClient.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert SQL query optimizer using schema embeddings context. Analyze queries and suggest concrete improvements for better performance."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 1200
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    if (!result.canOptimize) {
      return null;
    }

    return {
      originalQuery: sqlQuery,
      optimizedQuery: result.optimizedQuery || sqlQuery,
      explanation: result.explanation || 'Query optimized for better performance',
      expectedImprovement: result.expectedImprovement || 'Performance improvement expected'
    };
  } catch (error) {
    console.error('Error optimizing query:', error);
    return null;
  }
}

/**
 * Analyze query metadata
 */
function analyzeQueryMetadata(sqlQuery: string): {
  queryType: string;
  affectedTables: string[];
  readOnly: boolean;
} {
  const upperQuery = sqlQuery.toUpperCase();
  
  // Determine query type
  let queryType = 'UNKNOWN';
  if (upperQuery.includes('SELECT')) queryType = 'SELECT';
  else if (upperQuery.includes('INSERT')) queryType = 'INSERT';
  else if (upperQuery.includes('UPDATE')) queryType = 'UPDATE';
  else if (upperQuery.includes('DELETE')) queryType = 'DELETE';
  else if (upperQuery.includes('CREATE')) queryType = 'CREATE';
  else if (upperQuery.includes('DROP')) queryType = 'DROP';
  else if (upperQuery.includes('ALTER')) queryType = 'ALTER';

  // Extract table names (simplified)
  const tableMatches = sqlQuery.match(/(?:FROM|JOIN|INTO|UPDATE|TABLE)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi);
  const affectedTables = tableMatches ? 
    [...new Set(tableMatches.map(match => match.split(/\s+/).pop()!.toLowerCase()))] : 
    [];

  // Determine if read-only
  const readOnly = queryType === 'SELECT' || upperQuery.includes('EXPLAIN') || upperQuery.includes('DESCRIBE');

  return {
    queryType,
    affectedTables,
    readOnly
  };
}

/**
 * Enhanced Remote Query Execution Agent with Incremental Schema Updates
 */
export async function remoteQueryAgent(
  sqlQuery: string,
  connectionId: string,
  schema: any[] = [], // Keep for backward compatibility, but use embeddings primarily
  options: {
    validateQuery?: boolean;
    optimizeQuery?: boolean;
    forceExecution?: boolean;
    saveToHistory?: boolean | undefined;
    chatId?: number;
  } = {}
): Promise<RemoteQueryResult> {
  const startTime = Date.now();
  
  try {
    console.log('🎯 Enhanced Remote Query Agent with Incremental Updates: Starting execution...');
    console.log('📝 Query:', sqlQuery);
    console.log('🔗 Connection ID:', connectionId);
    console.log('💬 Chat ID:', options.chatId);
    console.log('⚙️ Options:', options);

    // Analyze query metadata
    const metadata = analyzeQueryMetadata(sqlQuery);
    console.log('📊 Query metadata:', metadata);

    // Get schema context from embeddings instead of raw schema
    const schemaEmbeddings = await getSchemaEmbeddingsContext(connectionId, sqlQuery);
    console.log('🧠 Retrieved', schemaEmbeddings.length, 'relevant schema embeddings');

    // Validate query if requested (using embeddings context)
    let validation: QueryValidationResult | undefined;
    if (options.validateQuery !== false && schemaEmbeddings.length > 0) {
      console.log('🔍 Validating query with embeddings context...');
      validation = await validateQuery(sqlQuery, schemaEmbeddings);
      console.log('✅ Validation result:', validation);
      
      // Block high-risk queries unless forced
      if (validation.riskLevel === 'high' && !options.forceExecution) {
        return {
          success: false,
          error: `High-risk query blocked. Warnings: ${validation.warnings.join(', ')}`,
          validation,
          metadata
        };
      }
    }

    // Get optimization suggestions if requested (using embeddings context)
    let optimization: QueryOptimizationSuggestion | undefined;
    if (options.optimizeQuery && schemaEmbeddings.length > 0) {
      console.log('⚡ Optimizing query with embeddings context...');
      optimization = (await optimizeQuery(sqlQuery, schemaEmbeddings)) ?? undefined;
      console.log('🔧 Optimization result:', optimization);
    }

    // Execute the query
    console.log('🚀 Executing SQL query...');
    const result = await executeSQLQuery(connectionId, sqlQuery);
    const executionTime = Date.now() - startTime;
    console.log('📈 Query executed in', executionTime, 'ms');

    // Initialize schema update result
    let schemaUpdate = {
      updated: false,
      type: 'none' as 'none' | 'incremental' | 'smart' | 'targeted',
      tablesProcessed: 0,
      vectorsAdded: 0,
      vectorsRemoved: 0,
      vectorsUpdated: 0
    };

    // Check if schema was modified and update embeddings incrementally if needed
    if (result.success && detectSchemaChanges(sqlQuery)) {
      console.log('🔄 Schema changes detected, performing incremental update...');
    
      const updateResult = await updateSchemaEmbeddingsIncremental(connectionId, sqlQuery);
    
      schemaUpdate = {
        updated: updateResult.success,
        type: updateResult.type,
        tablesProcessed: updateResult.tablesProcessed,
        vectorsAdded: updateResult.vectorsAdded,
        vectorsRemoved: updateResult.vectorsRemoved,
        vectorsUpdated: updateResult.vectorsUpdated
      };
    
      console.log('📊 Incremental schema update result:', schemaUpdate);
    }

    if (!result.success) {
      console.log('❌ Query failed, attempting to save failed query to history...');
      
      // Save failed query to history if enabled
      if (options.saveToHistory !== false) {
        try {
          const { saveQueryToHistory } = await import('@/app/actions/queryHistory');
          
          const historyEntry = {
            connectionId: Number(connectionId),
            chatId: options.chatId,
            sqlQuery: sqlQuery.trim(),
            success: false,
            executionTime,
            errorMessage: result.error,
            generatedBy: 'manual' as const,
            validationEnabled: options.validateQuery !== false,
            optimizationEnabled: options.optimizeQuery || false,
            forceExecution: options.forceExecution || false,
            validationResult: validation,
            optimizationSuggestion: optimization,
          };

          const saveResult = await saveQueryToHistory(historyEntry);
          console.log('💾 Failed query save result:', saveResult);
        } catch (historyError) {
          console.error('💥 Error saving failed query to history:', historyError);
        }
      }

      return {
        success: false,
        error: result.error,
        validation,
        optimization,
        metadata,
        schemaUpdate
      };
    }

    // Extract column names from the first row
    const columns = result.rows && result.rows.length > 0 ? Object.keys(result.rows[0]) : [];

    const queryResult: RemoteQueryResult = {
      success: true,
      data: {
        rows: result.rows || [],
        rowCount: result.rowCount || 0,
        columns,
        executionTime
      },
      validation,
      optimization,
      metadata,
      schemaUpdate
    };

    console.log('✅ Query executed successfully with incremental schema updates');

    // Save successful query to history if enabled
    if (options.saveToHistory !== false) {
      try {
        const { saveQueryToHistory } = await import('@/app/actions/queryHistory');
        
        const historyEntry = {
          connectionId: Number(connectionId),
          chatId: options.chatId,
          sqlQuery: sqlQuery.trim(),
          success: true,
          executionTime,
          rowCount: result.rowCount || 0,
          resultData: result.rows?.slice(0, 50),
          resultColumns: columns,
          generatedBy: 'manual' as const,
          validationEnabled: options.validateQuery !== false,
          optimizationEnabled: options.optimizeQuery || false,
          forceExecution: options.forceExecution || false,
          validationResult: validation,
          optimizationSuggestion: optimization,
        };

        const saveResult = await saveQueryToHistory(historyEntry);
        console.log('💾 Successful query save result:', saveResult);
      } catch (historyError) {
        console.error('💥 Error saving successful query to history:', historyError);
      }
    }

    return queryResult;

  } catch (error) {
    console.error('💥 Error in enhanced remote query agent:', error);
    
    // Save failed query to history if enabled
    if (options.saveToHistory !== false) {
      try {
        const { saveQueryToHistory } = await import('@/app/actions/queryHistory');
        
        const historyEntry = {
          connectionId: Number(connectionId),
          chatId: options.chatId,
          sqlQuery: sqlQuery.trim(),
          success: false,
          executionTime: Date.now() - startTime,
          errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
          generatedBy: 'manual' as const,
          validationEnabled: options.validateQuery !== false,
          optimizationEnabled: options.optimizeQuery || false,
          forceExecution: options.forceExecution || false,
        };

        await saveQueryToHistory(historyEntry);
      } catch (historyError) {
        console.error('💥 Error saving exception query to history:', historyError);
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      metadata: analyzeQueryMetadata(sqlQuery),
      schemaUpdate: {
        updated: false,
        type: 'none',
        tablesProcessed: 0,
        vectorsAdded: 0,
        vectorsRemoved: 0,
        vectorsUpdated: 0
      }
    };
  }
}

// Enhanced batch query agent with incremental schema updates support
export async function batchQueryAgent(
  queries: string[],
  connectionId: string,
  schema: any[] = [],
  options: {
    validateQueries?: boolean;
    stopOnError?: boolean;
    transactional?: boolean;
    saveToHistory?: boolean;
    chatId?: number;
  } = {}
): Promise<{
  success: boolean;
  results: RemoteQueryResult[];
  totalExecutionTime: number;
  successCount: number;
  errorCount: number;
  schemaUpdate: {
    updated: boolean;
    totalTablesProcessed: number;
    totalVectorsAdded: number;
    totalVectorsRemoved: number;
    totalVectorsUpdated: number;
    updateDetails: any[];
  };
}> {
  const startTime = Date.now();
  const results: RemoteQueryResult[] = [];
  let successCount = 0;
  let errorCount = 0;
  
  // Track cumulative schema updates
  let totalSchemaUpdates = {
    updated: false,
    totalTablesProcessed: 0,
    totalVectorsAdded: 0,
    totalVectorsRemoved: 0,
    totalVectorsUpdated: 0,
    updateDetails: [] as any[]
  };

  console.log(`Batch Query Agent with Incremental Updates: Executing ${queries.length} queries with chatId: ${options.chatId}`);

  try {
    // If transactional, wrap in BEGIN/COMMIT
    if (options.transactional) {
      await executeSQLQuery(connectionId, 'BEGIN');
    }

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i].trim();
      if (!query) continue;

      console.log(`Executing query ${i + 1}/${queries.length}: ${query.substring(0, 100)}...`);

      const result = await remoteQueryAgent(query, connectionId, schema, {
        validateQuery: options.validateQueries,
        optimizeQuery: false, // Skip optimization for batch to improve performance
        saveToHistory: options.saveToHistory !== false,
        chatId: options.chatId
      });

      results.push(result);

      if (result.success) {
        successCount++;
        
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
        errorCount++;
        
        // Stop on error if requested
        if (options.stopOnError) {
          if (options.transactional) {
            await executeSQLQuery(connectionId, 'ROLLBACK');
          }
          break;
        }
      }
    }

    // Commit transaction if successful
    if (options.transactional && errorCount === 0) {
      await executeSQLQuery(connectionId, 'COMMIT');
    } else if (options.transactional && errorCount > 0) {
      await executeSQLQuery(connectionId, 'ROLLBACK');
    }

    const totalExecutionTime = Date.now() - startTime;

    console.log('🏁 Batch execution completed with incremental schema updates:', {
      successCount,
      errorCount,
      schemaUpdatesPerformed: totalSchemaUpdates.updated,
      totalTablesProcessed: totalSchemaUpdates.totalTablesProcessed,
      totalVectorsModified: totalSchemaUpdates.totalVectorsAdded + totalSchemaUpdates.totalVectorsRemoved + totalSchemaUpdates.totalVectorsUpdated
    });

    return {
      success: errorCount === 0,
      results,
      totalExecutionTime,
      successCount,
      errorCount,
      schemaUpdate: totalSchemaUpdates
    };

  } catch (error) {
    console.error('Error in batch query execution:', error);
    
    // Rollback transaction on error
    if (options.transactional) {
      try {
        await executeSQLQuery(connectionId, 'ROLLBACK');
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
    }

    return {
      success: false,
      results,
      totalExecutionTime: Date.now() - startTime,
      successCount,
      errorCount: errorCount + 1,
      schemaUpdate: totalSchemaUpdates
    };
  }
}
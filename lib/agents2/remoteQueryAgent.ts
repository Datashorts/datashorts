// File: lib/agents2/remoteQueryAgent.ts
import { executeSQLQuery } from '@/app/lib/db/executeQuery';
import { openaiClient } from '@/app/lib/clients';

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
}

/**
 * Validate SQL query for safety and potential issues
 */
async function validateQuery(sqlQuery: string, schema: any[]): Promise<QueryValidationResult> {
  try {
    const prompt = `
Analyze this SQL query for potential issues, security risks, and optimization opportunities:

Query: ${sqlQuery}

Available tables and columns:
${schema.map(table => `
Table: ${table.tableName}
Columns: ${table.columns.map((col: any) => `${col.column_name} (${col.data_type})`).join(', ')}
`).join('\n')}

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
          content: "You are a database security and performance expert. Analyze SQL queries for potential issues and provide recommendations."
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
 * Suggest query optimizations
 */
async function optimizeQuery(sqlQuery: string, schema: any[]): Promise<QueryOptimizationSuggestion | null> {
  try {
    // Basic query analysis first
    const upperQuery = sqlQuery.toUpperCase().trim()
    
    // Skip optimization for very simple queries
    if (upperQuery.length < 20 || 
        (!upperQuery.includes('JOIN') && !upperQuery.includes('WHERE') && 
         !upperQuery.includes('ORDER BY') && !upperQuery.includes('GROUP BY') &&
         !upperQuery.includes('CROSS') && !upperQuery.includes('SUBQUERY') &&
         !upperQuery.includes('SELECT') || upperQuery.includes('LIMIT'))) {
      return null
    }

    const prompt = `
Analyze and optimize this SQL query for better performance:

Original Query:
${sqlQuery}

Database Schema:
${schema.map(table => `
Table: ${table.tableName}
Columns: ${table.columns.map((col: any) => `${col.column_name} (${col.data_type})`).join(', ')}
`).join('\n')}

Look for these optimization opportunities:
1. Unnecessary CROSS JOINs that can be eliminated or converted to proper JOINs
2. Redundant subqueries that can be converted to JOINs or window functions
3. Missing LIMIT clauses for potentially large result sets
4. Inefficient WHERE conditions that can be optimized
5. Redundant DISTINCT operations
6. Function calls on columns that prevent index usage (like DATE(), UPPER(), etc.)
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
`

    const response = await openaiClient.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert SQL query optimizer. Analyze queries and suggest concrete improvements for better performance. Focus on practical optimizations that will have measurable impact. Be specific about what changes you're making."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 1200
    })

    const result = JSON.parse(response.choices[0].message.content || '{}')
    
    if (!result.canOptimize) {
      return null
    }

    return {
      originalQuery: sqlQuery,
      optimizedQuery: result.optimizedQuery || sqlQuery,
      explanation: result.explanation || 'Query optimized for better performance',
      expectedImprovement: result.expectedImprovement || 'Performance improvement expected'
    }
  } catch (error) {
    console.error('Error optimizing query:', error)
    return null
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
 * Remote Query Execution Agent
 */
export async function remoteQueryAgent(
  sqlQuery: string,
  connectionId: string,
  schema: any[] = [],
  options: {
    validateQuery?: boolean;
    optimizeQuery?: boolean;
    forceExecution?: boolean;
  } = {}
): Promise<RemoteQueryResult> {
  const startTime = Date.now();
  
  try {
    console.log('Remote Query Agent: Executing query on connection', connectionId);
    console.log('Query:', sqlQuery);

    // Analyze query metadata
    const metadata = analyzeQueryMetadata(sqlQuery);
    console.log('Query metadata:', metadata);

    // Validate query if requested
    let validation: QueryValidationResult | undefined;
    if (options.validateQuery !== false && schema.length > 0) {
      console.log('Validating query...');
      validation = await validateQuery(sqlQuery, schema);
      console.log('Validation result:', validation);
      
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

    // Get optimization suggestions if requested
    let optimization: QueryOptimizationSuggestion | undefined;
    if (options.optimizeQuery && schema.length > 0) {
      console.log('Optimizing query...');
      optimization = (await optimizeQuery(sqlQuery, schema)) ?? undefined;
      console.log('Optimization result:', optimization);
    }

    // Execute the query
    console.log('Executing SQL query...');
    const result = await executeSQLQuery(connectionId, sqlQuery);
    const executionTime = Date.now() - startTime;

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        validation,
        optimization,
        metadata
      };
    }

    // Extract column names from the first row
    const columns = result.rows && result.rows.length > 0 ? Object.keys(result.rows[0]) : [];

    return {
      success: true,
      data: {
        rows: result.rows || [],
        rowCount: result.rowCount || 0,
        columns,
        executionTime
      },
      validation,
      optimization,
      metadata
    };

  } catch (error) {
    console.error('Error in remote query agent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      metadata: analyzeQueryMetadata(sqlQuery)
    };
  }
}

/**
 * Batch query execution for multiple queries
 */
export async function batchQueryAgent(
  queries: string[],
  connectionId: string,
  schema: any[] = [],
  options: {
    validateQueries?: boolean;
    stopOnError?: boolean;
    transactional?: boolean;
  } = {}
): Promise<{
  success: boolean;
  results: RemoteQueryResult[];
  totalExecutionTime: number;
  successCount: number;
  errorCount: number;
}> {
  const startTime = Date.now();
  const results: RemoteQueryResult[] = [];
  let successCount = 0;
  let errorCount = 0;

  console.log(`Batch Query Agent: Executing ${queries.length} queries`);

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
        optimizeQuery: false // Skip optimization for batch to improve performance
      });

      results.push(result);

      if (result.success) {
        successCount++;
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

    return {
      success: errorCount === 0,
      results,
      totalExecutionTime,
      successCount,
      errorCount
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
      errorCount: errorCount + 1
    };
  }
}

/**
 * Query explanation agent - explains what a query does
 */
export async function explainQueryAgent(
  sqlQuery: string,
  schema: any[] = []
): Promise<{
  success: boolean;
  explanation?: string;
  queryPlan?: any;
  error?: string;
}> {
  try {
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
`;

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
    });

    return {
      success: true,
      explanation: response.choices[0].message.content || 'No explanation available'
    };

  } catch (error) {
    console.error('Error explaining query:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to explain query'
    };
  }
}

/**
 * Query suggestion agent - suggests queries based on user intent
 */
export async function suggestQueriesAgent(
  userIntent: string,
  schema: any[]
): Promise<{
  success: boolean;
  suggestions?: Array<{
    query: string;
    description: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
  }>;
  error?: string;
}> {
  try {
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
`;

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
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      success: true,
      suggestions: result.suggestions || []
    };

  } catch (error) {
    console.error('Error suggesting queries:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to suggest queries'
    };
  }
}
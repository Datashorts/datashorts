"use server";

import OpenAI from "openai";
import { index as pinecone } from "@/app/lib/pinecone";
import { db } from "@/configs/db";
import { dbConnections, chats } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { getExistingPool, getPool } from "@/app/lib/db/pool";
import { currentUser } from "@clerk/nextjs/server";
import { taskManager } from "@/lib/agents2/taskManager";
import { researcher } from "@/lib/agents2/researcher";
import { visualizer } from "@/lib/agents2/visualizer";
import predictive from "@/lib/agents2/predictive";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Validate SQL query for common syntax errors and attempt to fix them
 * @param sqlQuery The SQL query to validate
 * @returns Object indicating if the query is valid, with optional fixed query and error
 */
function validateSqlQuery(sqlQuery: string): {
  valid: boolean;
  fixedQuery?: string;
  error?: string;
} {
  if (!sqlQuery || typeof sqlQuery !== "string") {
    return { valid: false, error: "Empty or invalid SQL query" };
  }

  try {
    // Check for unbalanced quotes
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let lastChar = "";

    for (let i = 0; i < sqlQuery.length; i++) {
      const char = sqlQuery[i];

      // Handle single quotes
      if (char === "'" && lastChar !== "\\") {
        inSingleQuote = !inSingleQuote;
      }

      // Handle double quotes
      if (char === '"' && lastChar !== "\\" && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
      }

      lastChar = char;
    }

    // If we're still in a quote at the end, the query has unbalanced quotes
    if (inSingleQuote || inDoubleQuote) {
      let fixedQuery = sqlQuery;

      // Try to fix the query by adding closing quotes
      if (inSingleQuote) {
        fixedQuery += "'";
      }

      if (inDoubleQuote) {
        fixedQuery += '"';
      }

      return {
        valid: false,
        fixedQuery,
        error: `Unbalanced quotes in SQL query${inDoubleQuote ? ': missing closing double quote (")' : ""}${inSingleQuote ? ": missing closing single quote (')" : ""}`,
      };
    }

    // Check for basic syntax issues
    if (!sqlQuery.toUpperCase().includes("SELECT")) {
      return { valid: false, error: "Query must include a SELECT statement" };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error:
        error instanceof Error ? error.message : "Unknown validation error",
    };
  }
}

/**
 * Execute SQL query on the database connection
 * @param connectionId The database connection ID
 * @param sqlQuery The SQL query to execute
 * @returns The query results
 */
async function executeSQLQuery(connectionId: string, sqlQuery: string) {
  try {
    // Validate the SQL query before executing
    const validation = validateSqlQuery(sqlQuery);
    if (!validation.valid) {
      console.log("SQL validation failed:", validation.error);

      // If we have a fixed query, use it
      if (validation.fixedQuery) {
        console.log("Using fixed SQL query:", validation.fixedQuery);
        sqlQuery = validation.fixedQuery;
      } else {
        // If we couldn't fix it, return the error
        return {
          success: false,
          error: validation.error,
        };
      }
    }

    const [connection] = await db
      .select()
      .from(dbConnections)
      .where(eq(dbConnections.id, Number(connectionId)));

    if (!connection) {
      throw new Error("Connection not found");
    }

    let pool = getExistingPool(connectionId);
    if (!pool) {
      console.log(
        "No existing pool found, creating new pool for connection:",
        connectionId
      );
      if (!connection.postgresUrl) {
        throw new Error("Database connection URL is missing");
      }
      pool = getPool(connectionId, connection.postgresUrl);
    }

    const result = await pool.query(sqlQuery);
    console.log("Query executed successfully");

    return {
      success: true,
      rows: result.rows,
      rowCount: result.rowCount,
    };
  } catch (error) {
    console.error("Error executing SQL query:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    };
  }
}

/**
 * Generate SQL query based on database type, schema, and user query
 */
export async function generateSQLQuery(schema: any[], userQuery: string, connectionId: string) {
  try {
    // Get database type from connection
    const [connection] = await db
      .select()
      .from(dbConnections)
      .where(eq(dbConnections.id, Number(connectionId)));

    if (!connection) {
      throw new Error('Connection not found');
    }

    const dbType = connection.dbType;

    // Analyze schema to identify relationships and key columns
    type SchemaAnalysis = {
      [key: string]: {
        columns: Array<{
          name: string;
          type: string;
          isId: boolean;
          isPrimaryKey: boolean;
          isForeignKey: boolean;
          referencesTable: string | null;
          isNameColumn: boolean;
        }>;
        primaryKey: { name: string } | undefined;
        foreignKeys: Array<{ name: string; referencesTable: string | null }>;
        nameColumns: Array<{ name: string }>;
        referencedBy: Array<{ table: string; foreignKey: string }>;
      };
    };

    const schemaAnalysis = schema.reduce<SchemaAnalysis>((acc, table) => {
      const columns = table.columns.split(',').map((col: string) => {
        const [name, type] = col.trim().split('(');
        const colName = name.trim();
        return {
          name: colName,
          type: type ? type.replace(')', '').trim() : '',
          isId: colName.toLowerCase().endsWith('id'),
          isPrimaryKey: colName.toLowerCase() === 'id',
          isForeignKey: colName.toLowerCase().endsWith('id') && colName.toLowerCase() !== 'id',
          referencesTable: colName.toLowerCase().endsWith('id') ? 
            colName.toLowerCase().slice(0, -2).trim() : null,
          isNameColumn: colName.toLowerCase().includes('name') || 
                       colName.toLowerCase().includes('title') ||
                       colName.toLowerCase().includes('description')
        };
      });

      acc[table.tableName] = {
        columns,
        primaryKey: columns.find((col: { isPrimaryKey: boolean }) => col.isPrimaryKey),
        foreignKeys: columns.filter((col: { isForeignKey: boolean }) => col.isForeignKey).map((fk: { name: string; referencesTable: string | null }) => ({
          name: fk.name,
          referencesTable: fk.referencesTable
        })),
        nameColumns: columns.filter((col: { isNameColumn: boolean }) => col.isNameColumn),
        referencedBy: []
      };
      return acc;
    }, {});

    // Populate referencedBy relationships
    Object.entries(schemaAnalysis).forEach(([tableName, analysis]) => {
      analysis.foreignKeys.forEach(fk => {
        const referencedTable = fk.referencesTable;
        if (referencedTable && schemaAnalysis[referencedTable]) {
          schemaAnalysis[referencedTable].referencedBy.push({
            table: tableName,
            foreignKey: fk.name
          });
        }
      });
    });

    // Analyze user query to identify relevant tables and relationships
    const queryAnalysis = {
      mentionedTables: Object.keys(schemaAnalysis).filter(tableName => 
        userQuery.toLowerCase().includes(tableName.toLowerCase())
      ),
      searchTerms: userQuery.toLowerCase().split(/\s+/).filter(term => 
        term.length > 3 && !['what', 'when', 'where', 'which', 'that', 'this', 'have', 'does', 'doesn\'t'].includes(term)
      )
    };

    // Database-specific SQL generation instructions
    const dbSpecificInstructions = dbType === 'mysql' ? `
MySQL-specific rules:
1. Use backticks (\`) around table and column names instead of double quotes
2. Use LIKE for case-insensitive text matching (MySQL is case-insensitive by default)
3. For text searches, use: column LIKE '%term%' to match partial text
4. Use LIMIT instead of FETCH FIRST
5. String comparisons are case-insensitive by default
6. Use DATE_FORMAT() for date formatting
7. Use CONCAT() for string concatenation
8. BOOLEAN type is treated as TINYINT(1)
9. Auto-increment columns use AUTO_INCREMENT
10. Use SHOW TABLES and DESCRIBE for metadata queries
` : `
PostgreSQL-specific rules:
1. Always use double quotes around table and column names
2. Use ILIKE for case-insensitive text matching
3. For text searches, use: column ILIKE '%term%' to match partial text
4. Use LIMIT or FETCH FIRST
5. String comparisons are case-sensitive by default
6. Use TO_CHAR() for date formatting
7. Use || for string concatenation
8. BOOLEAN is a native type
9. Auto-increment columns use SERIAL or IDENTITY
10. Use information_schema for metadata queries
`;

    const prompt = `Given the following database schema analysis and user query, generate a ${dbType.toUpperCase()} SQL query to answer the question.

${dbSpecificInstructions}

General rules:
1. Use appropriate JOINs based on the schema relationships
2. Consider common variations and typos in text searches
3. Consider all relevant table relationships when generating the query
4. Use table aliases for better readability
5. Only include necessary columns in the SELECT clause

Schema Analysis:
${Object.entries(schemaAnalysis).map(([tableName, analysis]) => `
Table: ${dbType === 'mysql' ? '`' + tableName + '`' : '"' + tableName + '"'}
- Primary Key: ${analysis.primaryKey?.name || 'None'}
- Foreign Keys: ${analysis.foreignKeys.map(fk => `${fk.name} (references ${fk.referencesTable})`).join(', ') || 'None'}
- Referenced By: ${analysis.referencedBy.map(ref => `${ref.table} (via ${ref.foreignKey})`).join(', ') || 'None'}
- Name/Text Columns: ${analysis.nameColumns.map(col => col.name).join(', ') || 'None'}
- All Columns: ${analysis.columns.map(col => `${col.name} (${col.type})`).join(', ')}
`).join('\n')}

Query Analysis:
- Mentioned Tables: ${queryAnalysis.mentionedTables.join(', ') || 'None'}
- Search Terms: ${queryAnalysis.searchTerms.join(', ') || 'None'}

User Query: ${userQuery}

Please generate a ${dbType.toUpperCase()} SQL query that will answer this question. Only return the SQL query without any explanation.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a ${dbType.toUpperCase()} SQL expert. Generate only the SQL query without any explanation or additional text. 
Consider the following when generating the query:
1. Use appropriate JOINs based on the schema relationships
2. For text searches, use ${dbType === 'mysql' ? 'LIKE' : 'ILIKE'} with wildcards
3. Consider all possible relationships between tables
4. Use table aliases for better readability
5. Only include necessary columns in the SELECT clause
6. Use the actual table and column names from the schema
7. Consider both direct and indirect relationships between tables
8. Follow ${dbType.toUpperCase()}-specific syntax rules`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 300
    });

    if (!response.choices?.[0]?.message?.content) {
      throw new Error('No response content from OpenAI');
    }

    let sqlQuery = response.choices[0].message.content.trim();
    
    // Clean up the query
    sqlQuery = sqlQuery.replace(/```sql/gi, '').replace(/```/g, '').trim();
    
    // Validate query based on database type
    if (dbType === 'mysql') {
      // Ensure MySQL uses backticks
      if (sqlQuery.includes('"') && !sqlQuery.includes('`')) {
        // Convert PostgreSQL-style quotes to MySQL backticks
        sqlQuery = sqlQuery.replace(/"([^"]+)"/g, '`$1`');
      }
    } else if (dbType === 'postgres') {
      // Ensure PostgreSQL uses double quotes
      if (sqlQuery.includes('`') && !sqlQuery.includes('"')) {
        // Convert MySQL-style backticks to PostgreSQL quotes
        sqlQuery = sqlQuery.replace(/`([^`]+)`/g, '"$1"');
      }
    }

    console.log(`Generated ${dbType.toUpperCase()} SQL query:`, sqlQuery);
    return sqlQuery;
  } catch (error) {
    console.error('Error generating SQL query:', error);
    throw new Error('Failed to generate SQL query');
  }
}

/**
 * Generate embeddings for a query using OpenAI
 * @param query The user's query text
 * @returns The embedding vector
 */
async function generateQueryEmbeddings(query: string) {
  try {
    const enhancedQuery = `Find database tables containing: ${query}`;

    console.log("Generating embeddings for query:", enhancedQuery);

    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: enhancedQuery,
      encoding_format: "float",
    });

    console.log("Successfully generated query embeddings");
    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating query embeddings:", error);
    throw new Error("Failed to generate query embeddings");
  }
}

/**
 * Process a query for pipeline 2
 * @param query The user's query
 * @param connectionId The database connection ID
 * @param predictiveMode Whether to force predictive mode
 */
export async function processPipeline2Query(
  query: string,
  connectionId: string,
  predictiveMode: boolean = false
) {
  try {
    console.log("Processing Pipeline 2 query:", query);
    console.log("Connection ID:", connectionId);
    console.log("Predictive Mode:", predictiveMode);

    const user = await currentUser();
    if (!user) {
      throw new Error("No authenticated user found");
    }

    const queryEmbedding = await generateQueryEmbeddings(query);
    console.log("Generated query embeddings, length:", queryEmbedding.length);

    const queryResponse = await pinecone.query({
      vector: queryEmbedding,
      topK: 10,
      filter: {
        connectionId: connectionId,
        pipeline: "pipeline2",
        type: "schema",
      },
      includeMetadata: true,
    });

    console.log(
      "Raw Pinecone query response:",
      JSON.stringify(queryResponse, null, 2)
    );
    console.log("Number of matches found:", queryResponse.matches?.length || 0);

    if (!queryResponse.matches || queryResponse.matches.length === 0) {
      console.log(
        "No matches found in Pinecone. Checking if embeddings exist..."
      );
      return {
        success: true,
        reconstructedSchema: [],
        matches: [],
        debug: {
          message: "No matches found in Pinecone",
          connectionId,
          query,
        },
      };
    }

    const tableMatches = new Map();
    queryResponse.matches.forEach((match) => {
      console.log("Processing match:", match);
      const tableName = match.metadata?.tableName;
      if (!tableName) {
        console.log("Match has no tableName in metadata:", match);
        return;
      }

      let relevanceScore = match.score || 0;

      if (query.toLowerCase().includes(String(tableName).toLowerCase())) {
        relevanceScore += 0.2;
        console.log(`Boosted score for table ${tableName} due to name match`);
      }

      const columns = String(match.metadata?.columns || "");
      const columnMatches = columns
        .toLowerCase()
        .split(",")
        .filter((col) => {
          const colName = col.split("(")[0].trim().toLowerCase();
          return (
            query.toLowerCase().includes(colName) ||
            colName.includes("id") ||
            colName.includes("user") ||
            colName.includes("post")
          );
        });

      if (columnMatches.length > 0) {
        relevanceScore += 0.1 * columnMatches.length;
        console.log(
          `Boosted score for table ${tableName} due to column matches:`,
          columnMatches
        );
      }

      if (
        !tableMatches.has(tableName) ||
        relevanceScore > tableMatches.get(tableName).score
      ) {
        tableMatches.set(tableName, {
          tableName,
          text: match.metadata?.text,
          columns: match.metadata?.columns,
          score: relevanceScore,
        });
      }
    });

    const reconstructedSchema = Array.from(tableMatches.values()).sort(
      (a, b) => b.score - a.score
    );

    console.log("Final reconstructed schema:", reconstructedSchema);

    let taskResult;
    if (predictiveMode) {
      console.log("Predictive mode enabled, forcing predictive agent");
      taskResult = {
        next: "predictive",
        reason: "Predictive mode is enabled",
        requiresMultiAgent: false,
      };
    } else {
      taskResult = await taskManager(query, reconstructedSchema);
      if (taskResult.next === "predictive") {
        taskResult = {
          next: "researcher",
          reason: "Predictive mode is disabled, using researcher instead",
          requiresMultiAgent: false,
        };
      }
    }
    console.log("Task manager result:", taskResult);

    let analysisResult;
    let agentFailure = false;
    let fallbackQueryResult = null;
    let fallbackSqlQuery = null;

    try {
      if (taskResult.next === "researcher") {
        analysisResult = await researcher(
          query,
          reconstructedSchema,
          connectionId
        );

        if (
          analysisResult &&
          analysisResult.queryResult &&
          analysisResult.queryResult.rows
        ) {
          const rows = analysisResult.queryResult.rows;
          if (rows.length === 0) {
            analysisResult.details.push(
              "Note: The query returned no results. This could mean either:",
              "1. The user doesn't exist in the database",
              "2. The user exists but has no posts",
              "3. The query might need to be adjusted to better match the database schema"
            );
          }
        }
      } else if (taskResult.next === "visualizer") {
        const messages = [{ role: "user", content: query }];
        analysisResult = await visualizer(
          messages,
          reconstructedSchema,
          connectionId
        );
      } else if (taskResult.next === "predictive") {
        console.log(
          "Calling predictive agent with database context and user query"
        );
        analysisResult = await predictive(
          query,
          reconstructedSchema,
          connectionId
        );
      } else {
        throw new Error("Invalid task manager result");
      }
    } catch (agentError) {
      console.error(`Agent ${taskResult.next} failed:`, agentError);
      agentFailure = true;

      // Extract SQL query from the error or generate a simple one
      if (
        agentError &&
        typeof agentError === "object" &&
        "sqlQuery" in agentError &&
        (agentError as any).sqlQuery
      ) {
        fallbackSqlQuery = agentError.sqlQuery;
      } else if (analysisResult && analysisResult.sqlQuery) {
        fallbackSqlQuery = analysisResult.sqlQuery;
      } else {
        // Try to generate a simple query based on the schema
        try {
          fallbackSqlQuery = await generateSQLQuery(reconstructedSchema, query, connectionId);
          console.log("Generated fallback SQL query:", fallbackSqlQuery);
        } catch (sqlGenError) {
          console.error("Failed to generate fallback SQL query:", sqlGenError);
        }
      }

      // If we have a SQL query, execute it to get results
      if (fallbackSqlQuery) {
        try {
          fallbackQueryResult = await executeSQLQuery(
            connectionId,
            fallbackSqlQuery
          );
          console.log(
            "Executed fallback SQL query with results:",
            fallbackQueryResult
          );

          // Create a minimal analysis result with just the query and results
          analysisResult = {
            content: {
              title: "Query Results",
              summary:
                "Agent processing failed, but here are the raw query results.",
              details: [
                "The agent encountered an error due to context limitations.",
                "Below are the raw results from the SQL query.",
              ],
              metrics: {},
            },
            sqlQuery: fallbackSqlQuery,
            queryResult: fallbackQueryResult,
          };
        } catch (sqlExecError) {
          console.error("Failed to execute fallback SQL query:", sqlExecError);
          // If the fallback query fails, try a simpler query
          try {
            const simpleQuery = `SELECT * FROM \`${reconstructedSchema[0]?.tableName}\` LIMIT 10`;
            console.log("Trying simple fallback query:", simpleQuery);
            const simpleResult = await executeSQLQuery(
              connectionId,
              simpleQuery
            );

            if (simpleResult.success) {
              fallbackQueryResult = simpleResult;
              fallbackSqlQuery = simpleQuery;

              analysisResult = {
                content: {
                  title: "Query Results",
                  summary: "Agent processing failed, using simplified query.",
                  details: [
                    "The agent encountered an error due to context limitations.",
                    "A simplified query was used to show some data from the main table.",
                  ],
                  metrics: {},
                },
                sqlQuery: simpleQuery,
                queryResult: simpleResult,
              };
            }
          } catch (simpleQueryError) {
            console.error(
              "Failed to execute simple fallback query:",
              simpleQueryError
            );
          }
        }
      }

      if (!analysisResult) {
        // Provide minimal fallback if everything else fails
        analysisResult = {
          content: {
            title: "Query Error",
            summary: "Unable to process your query due to context limitations.",
            details: [
              "The agent encountered an error while processing your query.",
              "This might be due to complexity or context limitations.",
            ],
            metrics: {},
          },
          sqlQuery: fallbackSqlQuery,
        };
      }
    }

    // Add a check after the try-catch block to detect if the agent failed but the error wasn't caught
    // This handles cases where the agent returns a result but it's actually an error message
    if (
      !agentFailure &&
      analysisResult &&
      (analysisResult.summary ===
        "Unable to complete analysis due to an error" ||
        analysisResult.content?.summary ===
          "Unable to complete analysis due to an error" ||
        (analysisResult.metrics &&
          analysisResult.metrics.error === "Analysis failed"))
    ) {
      console.log("Detected agent failure from result content");
      agentFailure = true;

      // Try to generate a SQL query if one doesn't exist
      if (!analysisResult.sqlQuery) {
        try {
          const generatedSqlQuery = await generateSQLQuery(
            reconstructedSchema,
            query,
            connectionId
          );
          console.log(
            "Generated SQL query after detecting failure:",
            generatedSqlQuery
          );

          // Execute the generated SQL query
          const queryResult = await executeSQLQuery(
            connectionId,
            generatedSqlQuery
          );
          console.log(
            "Executed SQL query after detecting failure:",
            queryResult
          );

          if (queryResult.success) {
            // Update the analysis result with the SQL query and results
            analysisResult.sqlQuery = generatedSqlQuery;
            analysisResult.queryResult = queryResult;
          } else {
            // If the query failed, try a simpler query
            const simpleQuery = `SELECT * FROM \`${reconstructedSchema[0]?.tableName}\` LIMIT 10`;
            console.log("Trying simple query after failure:", simpleQuery);
            const simpleResult = await executeSQLQuery(
              connectionId,
              simpleQuery
            );

            if (simpleResult.success) {
              analysisResult.sqlQuery = simpleQuery;
              analysisResult.queryResult = simpleResult;

              // Update the content to reflect the simplified query
              if (analysisResult.content) {
                analysisResult.content.details = [
                  ...(analysisResult.content.details || []),
                  "Using a simplified query to show some data from the main table.",
                ];
              }
            }
          }
        } catch (error) {
          console.error(
            "Failed to generate or execute SQL query after detecting failure:",
            error
          );
        }
      }
    }

    // Update the taskResult with the agent failure flag
    taskResult = { ...taskResult, agentFailure };

    const tablesUsed = reconstructedSchema.map((table) => table.tableName);
    const chatEntry = {
      message: query,
      response: JSON.stringify({
        taskResult,
        analysisResult,
        tablesUsed,
        timestamp: new Date().toISOString(),
        agentFailure,
      }),
      timestamp: new Date().toISOString(),
    };

    const existingChats = await db
      .select()
      .from(chats)
      .where(eq(chats.connectionId, Number(connectionId)));

    if (existingChats.length > 0) {
      const existingChat = existingChats[0];

      const conversation =
        (existingChat.conversation as unknown as Array<{
          message: string;
          response: string;
          timestamp: string;
          bookmarked?: boolean;
        }>) || [];

      conversation.push(chatEntry);

      await db
        .update(chats)
        .set({
          conversation,
          updatedAt: new Date(),
        })
        .where(eq(chats.id, existingChat.id));
    } else {
      await db.insert(chats).values({
        userId: user.id,
        connectionId: parseInt(String(connectionId)),
        conversation: [chatEntry],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return {
      success: true,
      reconstructedSchema,
      matches: queryResponse.matches,
      taskResult,
      analysisResult,
      agentFailure,
      debug: {
        message: agentFailure
          ? "Query processed with fallback"
          : "Query processed successfully",
        connectionId,
        query,
        matchCount: reconstructedSchema.length,
      },
    };
  } catch (error) {
    console.error("Error processing Pipeline 2 query:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
      debug: {
        message: "Error occurred during query processing",
        connectionId,
        query,
      },
    };
  }
}
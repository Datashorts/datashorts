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
 * Generate SQL query using Grok based on schema and user query
 * @param schema The reconstructed schema information
 * @param userQuery The original user query
 * @returns The generated SQL query
 */
export async function generateSQLQuery(schema: any[], userQuery: string) {
  try {
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
      const columns = table.columns.split(",").map((col: string) => {
        const [name, type] = col.trim().split("(");
        const colName = name.trim();
        return {
          name: colName,
          type: type ? type.replace(")", "").trim() : "",
          isId: colName.toLowerCase().endsWith("id"),
          isPrimaryKey: colName.toLowerCase() === "id",
          isForeignKey:
            colName.toLowerCase().endsWith("id") &&
            colName.toLowerCase() !== "id",
          referencesTable: colName.toLowerCase().endsWith("id")
            ? colName.toLowerCase().slice(0, -2).trim()
            : null,
          isNameColumn:
            colName.toLowerCase().includes("name") ||
            colName.toLowerCase().includes("title") ||
            colName.toLowerCase().includes("description"),
        };
      });

      acc[table.tableName] = {
        columns,
        primaryKey: columns.find(
          (col: { isPrimaryKey: boolean }) => col.isPrimaryKey
        ),
        foreignKeys: columns
          .filter((col: { isForeignKey: boolean }) => col.isForeignKey)
          .map((fk: { name: string; referencesTable: string | null }) => ({
            name: fk.name,
            referencesTable: fk.referencesTable,
          })),
        nameColumns: columns.filter(
          (col: { isNameColumn: boolean }) => col.isNameColumn
        ),
        referencedBy: [], // Will be populated below
      };
      return acc;
    }, {});

    // Populate referencedBy relationships
    Object.entries(schemaAnalysis).forEach(([tableName, analysis]) => {
      analysis.foreignKeys.forEach((fk) => {
        const referencedTable = fk.referencesTable;
        if (referencedTable && schemaAnalysis[referencedTable]) {
          schemaAnalysis[referencedTable].referencedBy.push({
            table: tableName,
            foreignKey: fk.name,
          });
        }
      });
    });

    // Analyze user query to identify relevant tables and relationships
    const queryAnalysis = {
      mentionedTables: Object.keys(schemaAnalysis).filter((tableName) =>
        userQuery.toLowerCase().includes(tableName.toLowerCase())
      ),
      searchTerms: userQuery
        .toLowerCase()
        .split(/\s+/)
        .filter(
          (term) =>
            term.length > 3 &&
            ![
              "what",
              "when",
              "where",
              "which",
              "that",
              "this",
              "have",
              "does",
              "doesn't",
            ].includes(term)
        ),
    };

    const prompt = `Given the following database schema analysis and user query, generate a SQL query to answer the question. IMPORTANT: 
1. Always use double quotes around table and column names in PostgreSQL
2. Use ILIKE for case-insensitive text matching
3. When searching for names or text, use ILIKE with wildcards to handle variations
4. For text searches, use: column ILIKE '%term%' to match partial text
5. Consider common variations and typos
6. Use appropriate JOINs based on the schema relationships
7. Consider all relevant table relationships when generating the query
8. Use table aliases for better readability
9. Only include necessary columns in the SELECT clause
10. DO NOT use LIMIT in the query unless specifically asked for in the user query
11. Make sure all quotes are properly closed in the SQL query

Schema Analysis:
${Object.entries(schemaAnalysis)
  .map(
    ([tableName, analysis]) => `
Table: "${tableName}"
- Primary Key: ${analysis.primaryKey?.name || "None"}
- Foreign Keys: ${analysis.foreignKeys.map((fk) => `${fk.name} (references ${fk.referencesTable})`).join(", ") || "None"}
- Referenced By: ${analysis.referencedBy.map((ref) => `${ref.table} (via ${ref.foreignKey})`).join(", ") || "None"}
- Name/Text Columns: ${analysis.nameColumns.map((col) => col.name).join(", ") || "None"}
- All Columns: ${analysis.columns.map((col) => `${col.name} (${col.type})`).join(", ")}
`
  )
  .join("\n")}

Query Analysis:
- Mentioned Tables: ${queryAnalysis.mentionedTables.join(", ") || "None"}
- Search Terms: ${queryAnalysis.searchTerms.join(", ") || "None"}

User Query: ${userQuery}

Please generate a SQL query that will answer this question. Only return the SQL query without any explanation. Remember to use double quotes around table and column names, ILIKE for text matching, and ensure all quotes are properly closed. DO NOT use LIMIT in the query unless specifically requested by the user.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a SQL expert. Generate only the SQL query without any explanation or additional text. 
Consider the following when generating the query:
1. Use appropriate JOINs based on the schema relationships
2. For text searches, use ILIKE with wildcards
3. Consider all possible relationships between tables
4. Use table aliases for better readability
5. Only include necessary columns in the SELECT clause
6. Use the actual table and column names from the schema
7. Consider both direct and indirect relationships between tables
8. DO NOT add LIMIT clauses unless explicitly requested in the user query
9. CRITICAL: Ensure all quotes in the SQL are properly closed and balanced`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 150,
    });

    if (!response.choices?.[0]?.message?.content) {
      throw new Error("No response content from OpenAI");
    }

    let sqlQuery = response.choices[0].message.content.trim();

    // Validate the generated SQL query
    const validation = validateSqlQuery(sqlQuery);
    if (!validation.valid && validation.fixedQuery) {
      console.log("Fixing SQL query:", validation.error);
      sqlQuery = validation.fixedQuery;
    }

    const queryValidation = {
      hasJoins: sqlQuery.toLowerCase().includes("join"),
      hasWhere: sqlQuery.toLowerCase().includes("where"),
      hasIlike: sqlQuery.toLowerCase().includes("ilike"),
      mentionedTables: Object.keys(schemaAnalysis).filter((table) =>
        sqlQuery.toLowerCase().includes(`"${table.toLowerCase()}"`)
      ),
    };

    if (
      !queryValidation.hasJoins &&
      queryValidation.mentionedTables.length > 1
    ) {
      const tables = queryValidation.mentionedTables;
      const relationships = [];

      for (let i = 0; i < tables.length; i++) {
        for (let j = i + 1; j < tables.length; j++) {
          const table1 = schemaAnalysis[tables[i]];
          const table2 = schemaAnalysis[tables[j]];

          const directRelationship =
            table1.foreignKeys.find((fk) => fk.referencesTable === tables[j]) ||
            table2.foreignKeys.find((fk) => fk.referencesTable === tables[i]);

          if (directRelationship) {
            relationships.push({
              table1: tables[i],
              table2: tables[j],
              foreignKey: directRelationship.name,
            });
          }
        }
      }

      if (relationships.length > 0) {
        const baseTable = relationships[0].table1;
        let joinClause = `FROM "${baseTable}"`;

        relationships.forEach((rel) => {
          const joinTable = rel.table1 === baseTable ? rel.table2 : rel.table1;
          const fkColumn = rel.foreignKey;
          joinClause += ` JOIN "${joinTable}" ON "${baseTable}"."${fkColumn}" = "${joinTable}"."id"`;
        });

        sqlQuery = sqlQuery.replace(/FROM\s+"[^"]+"/i, joinClause);
      }
    }

    return sqlQuery;
  } catch (error) {
    console.error("Error generating SQL query:", error);
    throw new Error("Failed to generate SQL query");
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
              "1. The requested data doesn't exist in the database",
              "2. The search criteria might need to be adjusted"
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

      // No fallback SQL generation or execution
      analysisResult = {
        content: {
          title: "Query Error",
          summary: "Unable to process your query.",
          details: [
            "The system encountered an error while processing your query.",
            "Please try rephrasing your question or try a different query.",
          ],
          metrics: {},
        },
      };
    }

    // No detection block here - removed completely

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
          ? "Error occurred during query processing"
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
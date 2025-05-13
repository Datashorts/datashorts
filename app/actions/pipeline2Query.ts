'use server'

import OpenAI from 'openai';
import { index as pinecone } from '@/app/lib/pinecone';
import { db } from '@/configs/db';
import { dbConnections, chats } from '@/configs/schema';
import { eq } from 'drizzle-orm';
import { getExistingPool, getPool } from '@/app/lib/db/pool';
import { currentUser } from '@clerk/nextjs/server';
import { taskManager } from '@/lib/agents2/taskManager';
import { researcher } from '@/lib/agents2/researcher';
import { visualizer } from '@/lib/agents2/visualizer';


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Execute SQL query on the database connection
 * @param connectionId The database connection ID
 * @param sqlQuery The SQL query to execute
 * @returns The query results
 */
async function executeSQLQuery(connectionId: string, sqlQuery: string) {
  try {

    const [connection] = await db
      .select()
      .from(dbConnections)
      .where(eq(dbConnections.id, connectionId));

    if (!connection) {
      throw new Error('Connection not found');
    }


    let pool = getExistingPool(connectionId);
    if (!pool) {
      console.log('No existing pool found, creating new pool for connection:', connectionId);
      pool = getPool(connectionId, connection.postgresUrl);
    }


    const result = await pool.query(sqlQuery);
    console.log('Query executed successfully');

    return {
      success: true,
      rows: result.rows,
      rowCount: result.rowCount
    };
  } catch (error) {
    console.error('Error executing SQL query:', error);
    return {
      success: false,
      error: error.message
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
    const schemaAnalysis = schema.reduce((acc, table) => {
      const columns = table.columns.split(',').map(col => {
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
        primaryKey: columns.find(col => col.isPrimaryKey),
        foreignKeys: columns.filter(col => col.isForeignKey),
        nameColumns: columns.filter(col => col.isNameColumn),
        referencedBy: [] // Will be populated below
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

Schema Analysis:
${Object.entries(schemaAnalysis).map(([tableName, analysis]) => `
Table: "${tableName}"
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

Please generate a SQL query that will answer this question. Only return the SQL query without any explanation. Remember to use double quotes around table and column names and ILIKE for text matching.`;

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
7. Consider both direct and indirect relationships between tables`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 150
    });

    let sqlQuery = response.choices[0].message.content.trim();
    
    // Validate and enhance the generated query
    const queryValidation = {
      hasJoins: sqlQuery.toLowerCase().includes('join'),
      hasWhere: sqlQuery.toLowerCase().includes('where'),
      hasIlike: sqlQuery.toLowerCase().includes('ilike'),
      mentionedTables: Object.keys(schemaAnalysis).filter(table => 
        sqlQuery.toLowerCase().includes(`"${table.toLowerCase()}"`)
      )
    };

    // If the query is missing necessary joins based on the schema relationships
    if (!queryValidation.hasJoins && queryValidation.mentionedTables.length > 1) {
      const tables = queryValidation.mentionedTables;
      const relationships = [];
      
      // Find relationships between mentioned tables
      for (let i = 0; i < tables.length; i++) {
        for (let j = i + 1; j < tables.length; j++) {
          const table1 = schemaAnalysis[tables[i]];
          const table2 = schemaAnalysis[tables[j]];
          
          // Check direct relationships
          const directRelationship = table1.foreignKeys.find(fk => 
            fk.referencesTable === tables[j]
          ) || table2.foreignKeys.find(fk => 
            fk.referencesTable === tables[i]
          );
          
          if (directRelationship) {
            relationships.push({
              table1: tables[i],
              table2: tables[j],
              foreignKey: directRelationship.name
            });
          }
        }
      }
      
      // Add necessary joins
      if (relationships.length > 0) {
        const baseTable = relationships[0].table1;
        let joinClause = `FROM "${baseTable}"`;
        
        relationships.forEach(rel => {
          const joinTable = rel.table1 === baseTable ? rel.table2 : rel.table1;
          const fkColumn = rel.foreignKey;
          joinClause += ` JOIN "${joinTable}" ON "${baseTable}"."${fkColumn}" = "${joinTable}"."id"`;
        });
        
        sqlQuery = sqlQuery.replace(/FROM\s+"[^"]+"/i, joinClause);
      }
    }

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

    console.log('Generating embeddings for query:', enhancedQuery);
    
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: enhancedQuery,
      encoding_format: "float"
    });

    console.log('Successfully generated query embeddings');
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating query embeddings:', error);
    throw new Error('Failed to generate query embeddings');
  }
}

/**
 * Process a query for pipeline 2
 * @param query The user's query
 * @param connectionId The database connection ID
 */
export async function processPipeline2Query(query: string, connectionId: string) {
  try {
    console.log('Processing Pipeline 2 query:', query);
    console.log('Connection ID:', connectionId);
    
    const user = await currentUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }

    const queryEmbedding = await generateQueryEmbeddings(query);
    console.log('Generated query embeddings, length:', queryEmbedding.length);

    // Get all relevant tables for the query
    const queryResponse = await pinecone.query({
      vector: queryEmbedding,
      topK: 10, // Increased from 5 to get more context
      filter: {
        connectionId: connectionId,
        pipeline: 'pipeline2',
        type: 'schema'
      },
      includeMetadata: true
    });

    console.log('Raw Pinecone query response:', JSON.stringify(queryResponse, null, 2));
    console.log('Number of matches found:', queryResponse.matches?.length || 0);

    if (!queryResponse.matches || queryResponse.matches.length === 0) {
      console.log('No matches found in Pinecone. Checking if embeddings exist...');
      return {
        success: true,
        reconstructedSchema: [],
        matches: [],
        debug: {
          message: 'No matches found in Pinecone',
          connectionId,
          query
        }
      };
    }

    // Enhanced table matching logic
    const tableMatches = new Map();
    queryResponse.matches.forEach(match => {
      console.log('Processing match:', match);
      const tableName = match.metadata?.tableName;
      if (!tableName) {
        console.log('Match has no tableName in metadata:', match);
        return;
      }

      let relevanceScore = match.score;
      
      // Boost score for tables mentioned in the query
      if (query.toLowerCase().includes(tableName.toLowerCase())) {
        relevanceScore += 0.2;
        console.log(`Boosted score for table ${tableName} due to name match`);
      }

      // Boost score for tables with relationships to other matched tables
      const columns = match.metadata?.columns || '';
      const columnMatches = columns.toLowerCase().split(',').filter(col => {
        const colName = col.split('(')[0].trim().toLowerCase();
        return query.toLowerCase().includes(colName) || 
               colName.includes('id') || // Foreign key columns
               colName.includes('user') || // User-related columns
               colName.includes('post'); // Post-related columns
      });

      if (columnMatches.length > 0) {
        relevanceScore += 0.1 * columnMatches.length;
        console.log(`Boosted score for table ${tableName} due to column matches:`, columnMatches);
      }

      // Store the best match for each table
      if (!tableMatches.has(tableName) || relevanceScore > tableMatches.get(tableName).score) {
        tableMatches.set(tableName, {
          tableName,
          text: match.metadata?.text,
          columns: match.metadata?.columns,
          score: relevanceScore
        });
      }
    });

    const reconstructedSchema = Array.from(tableMatches.values())
      .sort((a, b) => b.score - a.score);

    console.log('Final reconstructed schema:', reconstructedSchema);

    // Determine whether to route to researcher or visualizer
    const taskResult = await taskManager(query, reconstructedSchema);
    console.log('Task manager result:', taskResult);

    let analysisResult;
    if (taskResult.next === 'researcher') {
      analysisResult = await researcher(query, reconstructedSchema, connectionId);
      
      // Enhance the analysis result with more context
      if (analysisResult && analysisResult.queryResult && analysisResult.queryResult.rows) {
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
    } else if (taskResult.next === 'visualizer') {
      const messages = [
        { role: 'user', content: query }
      ];
      analysisResult = await visualizer(messages, reconstructedSchema, connectionId);
    } else {
      throw new Error('Invalid task manager result');
    }

    const tablesUsed = reconstructedSchema.map(table => table.tableName);
    const chatEntry = {
      message: query,
      response: {
        taskResult,
        analysisResult,
        tablesUsed,
        timestamp: new Date().toISOString()
      }
    };

    const existingChats = await db
      .select()
      .from(chats)
      .where(eq(chats.connectionId, parseInt(connectionId)));

    if (existingChats.length > 0) {
      const existingChat = existingChats[0];
      const conversation = existingChat.conversation || [];
      conversation.push(chatEntry);
      
      await db
        .update(chats)
        .set({
          conversation,
          updatedAt: new Date()
        })
        .where(eq(chats.id, existingChat.id));
    } else {
      await db.insert(chats).values({
        userId: user.id,
        connectionId: parseInt(connectionId),
        conversation: [chatEntry],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    return {
      success: true,
      reconstructedSchema,
      matches: queryResponse.matches,
      taskResult,
      analysisResult,
      debug: {
        message: 'Query processed successfully',
        connectionId,
        query,
        matchCount: reconstructedSchema.length
      }
    };
  } catch (error) {
    console.error('Error processing Pipeline 2 query:', error);
    return {
      success: false,
      error: error.message,
      debug: {
        message: 'Error occurred during query processing',
        connectionId,
        query
      }
    };
  }
} 
'use server'

import OpenAI from 'openai';
import { index as pinecone } from '@/app/lib/pinecone';
import { db } from '@/configs/db';
import { dbConnections } from '@/configs/schema';
import { eq } from 'drizzle-orm';
import { getExistingPool, getPool } from '@/app/lib/db/pool';


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
async function generateSQLQuery(schema: any[], userQuery: string) {
  try {
    const prompt = `Given the following database schema and user query, generate a SQL query to answer the question. IMPORTANT: Always use double quotes around table and column names in PostgreSQL.

Database Schema:
${schema.map(table => `
Table: "${table.tableName}"
Columns: ${table.columns}
`).join('\n')}

User Query: ${userQuery}

Please generate a SQL query that will answer this question. Only return the SQL query without any explanation. Remember to use double quotes around table and column names.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a SQL expert. Generate only the SQL query without any explanation or additional text. Always use double quotes around table and column names in PostgreSQL."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 150
    });

    return response.choices[0].message.content.trim();
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
    

    const queryEmbedding = await generateQueryEmbeddings(query);
    console.log('Generated query embeddings, length:', queryEmbedding.length);


    const namespaceStats = await pinecone.describeIndexStats({
      filter: {
        connectionId: connectionId,
        pipeline: 'pipeline2',
        type: 'schema'
      }
    });
    console.log('Pinecone namespace stats:', namespaceStats);


    const queryResponse = await pinecone.query({
      vector: queryEmbedding,
      topK: 5,
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


    const tableMatches = new Map();
    queryResponse.matches.forEach(match => {
      console.log('Processing match:', match);
      const tableName = match.metadata?.tableName;
      if (!tableName) {
        console.log('Match has no tableName in metadata:', match);
        return;
      }


      let relevanceScore = match.score;
      

      if (query.toLowerCase().includes(tableName.toLowerCase())) {
        relevanceScore += 0.2;
        console.log(`Boosted score for table ${tableName} due to name match`);
      }


      const columns = match.metadata?.columns || '';
      const columnMatches = columns.toLowerCase().split(',').filter(col => 
        query.toLowerCase().includes(col.split('(')[0].trim().toLowerCase())
      );
      if (columnMatches.length > 0) {
        relevanceScore += 0.1 * columnMatches.length;
        console.log(`Boosted score for table ${tableName} due to column matches:`, columnMatches);
      }

      if (!tableMatches.has(tableName)) {
        tableMatches.set(tableName, {
          tableName,
          text: match.metadata?.text,
          columns: match.metadata?.columns,
          score: relevanceScore
        });
      } else {

        const existing = tableMatches.get(tableName);
        if (relevanceScore > existing.score) {
          tableMatches.set(tableName, {
            tableName,
            text: match.metadata?.text,
            columns: match.metadata?.columns,
            score: relevanceScore
          });
        }
      }
    });


    const reconstructedSchema = Array.from(tableMatches.values())
      .sort((a, b) => b.score - a.score);

    console.log('Final reconstructed schema:', reconstructedSchema);


    const sqlQuery = await generateSQLQuery(reconstructedSchema, query);
    console.log('Generated SQL query:', sqlQuery);


    const queryResult = await executeSQLQuery(connectionId, sqlQuery);
    console.log('SQL query execution result:', queryResult);

    return {
      success: true,
      reconstructedSchema,
      matches: queryResponse.matches,
      sqlQuery,
      queryResult,
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
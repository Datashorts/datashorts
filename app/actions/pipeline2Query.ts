'use server'

import OpenAI from 'openai';
import { index as pinecone } from '@/app/lib/pinecone';
import { db } from '@/configs/db';
import { dbConnections, chats } from '@/configs/schema';
import { eq } from 'drizzle-orm';
import { 
  getExistingPool, 
  getPool, 
  getMySQLPool, 
  getExistingMySQLPool 
} from '@/app/lib/db/pool';
import { currentUser } from '@clerk/nextjs/server';
import { taskManager } from '@/lib/agents2/taskManager';
import { researcher } from '@/lib/agents2/researcher';
import { visualizer } from '@/lib/agents2/visualizer';
import predictive from '@/lib/agents2/predictive';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Type definitions for better type safety
type QueryResult = {
  success: boolean;
  rows?: any[];
  rowCount?: number;
  error?: string;
  suggestion?: string;
  errorCode?: string;
};

type SchemaMatch = {
  tableName: string;
  text: string;
  columns: string;
  score: number;
};

// Main pipeline processing function
export async function processPipeline2Query(
  query: string, 
  connectionId: string, 
  predictiveMode: boolean = false
) {
  try {
    const user = await currentUser();
    if (!user) throw new Error('Authentication required');
    
    // 1. Verify database connection
    const connection = await verifyDatabaseConnection(connectionId);
    
    // 2. Generate query embeddings
    const queryEmbedding = await generateQueryEmbeddings(query);
    
    // 3. Query Pinecone for schema matches
    const schemaMatches = await queryPineconeSchema(connectionId, queryEmbedding);
    
    // 4. Reconstruct schema with scoring
    const reconstructedSchema = reconstructSchema(schemaMatches, query);
    
    // 5. Determine analysis type
    const taskResult = await determineAnalysisType(query, reconstructedSchema, predictiveMode);
    
    // 6. Execute analysis
    const analysisResult = await executeAnalysis(taskResult, query, reconstructedSchema, connectionId);
    
    // 7. Save conversation history
    await saveConversationHistory(connectionId, user.id, query, {
      taskResult,
      analysisResult,
      tablesUsed: reconstructedSchema.map(t => t.tableName)
    });

    return formatSuccessResponse(reconstructedSchema, schemaMatches, taskResult, analysisResult);

  } catch (error) {
    console.error('Pipeline processing error:', error);
    return formatErrorResponse(error, connectionId, query);
  }
}

// Helper functions -----------------------------------------------------------

async function verifyDatabaseConnection(connectionId: string) {
  const [connection] = await db
    .select()
    .from(dbConnections)
    .where(eq(dbConnections.id, Number(connectionId)));

  if (!connection) throw new Error('Database connection not found');
  if (!connection.postgresUrl && !connection.mongoUrl) {
    throw new Error('Missing database connection URL');
  }
  return connection;
}

async function generateQueryEmbeddings(query: string) {
  const enhancedQuery = `Find database tables containing: ${query}`;
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: enhancedQuery,
    encoding_format: "float"
  });
  return response.data[0].embedding;
}

async function queryPineconeSchema(connectionId: string, embedding: number[]) {
  const result = await pinecone.query({
    vector: embedding,
    topK: 15,
    filter: {
      connectionId: connectionId,
      pipeline: 'pipeline2',
      type: 'schema'
    },
    includeMetadata: true
  });

  if (!result.matches?.length) throw new Error('No relevant schema data found');
  return result.matches;
}

function reconstructSchema(matches: any[], query: string): SchemaMatch[] {
  const tableMap = new Map<string, SchemaMatch>();

  matches.forEach(match => {
    const metadata = match.metadata || {};
    if (!metadata.tableName) return;

    let score = match.score || 0;
    const queryLower = query.toLowerCase();
    
    // Boost score for direct matches
    if (queryLower.includes(metadata.tableName.toLowerCase())) score += 0.2;
    
    // Boost for column matches
    const columnMatches = (metadata.columns || '')
      .toLowerCase()
      .split(',')
      .filter((col: string) => queryLower.includes(col.split('(')[0].trim()));
    score += columnMatches.length * 0.1;

    const existing = tableMap.get(metadata.tableName);
    if (!existing || score > existing.score) {
      tableMap.set(metadata.tableName, {
        tableName: metadata.tableName,
        text: metadata.text,
        columns: metadata.columns,
        score: score
      });
    }
  });

  return Array.from(tableMap.values()).sort((a, b) => b.score - a.score);
}

async function determineAnalysisType(
  query: string,
  schema: SchemaMatch[],
  predictiveMode: boolean
) {
  return predictiveMode 
    ? { next: 'predictive', reason: 'Forced predictive mode' }
    : await taskManager(query, schema);
}

async function executeAnalysis(
  taskResult: any,
  query: string,
  schema: SchemaMatch[],
  connectionId: string
) {
  switch (taskResult.next) {
    case 'researcher':
      return await researcher(query, schema, connectionId);
    case 'visualizer':
      return await visualizer([{ role: 'user', content: query }], schema, connectionId);
    case 'predictive':
      return await predictive(query, schema, connectionId);
    default:
      throw new Error('Invalid analysis type');
  }
}

async function saveConversationHistory(
  connectionId: string,
  userId: string,
  query: string,
  results: any
) {
  const newEntry = {
    message: query,
    response: JSON.stringify(results),
    timestamp: new Date().toISOString()
  };

  await db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(chats)
      .where(eq(chats.connectionId, Number(connectionId)));

    if (existing.length > 0) {
      const conversation = [...existing[0].conversation, newEntry];
      await tx.update(chats)
        .set({ conversation, updatedAt: new Date() })
        .where(eq(chats.id, existing[0].id));
    } else {
      await tx.insert(chats).values({
        userId,
        connectionId: Number(connectionId),
        conversation: [newEntry],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  });
}

function formatSuccessResponse(
  schema: SchemaMatch[],
  matches: any[],
  taskResult: any,
  analysisResult: any
) {
  return {
    success: true,
    data: {
      schema,
      matches: matches.slice(0, 10),
      analysisType: taskResult.next,
      results: analysisResult,
      timestamp: new Date().toISOString()
    },
    metrics: {
      schemaTables: schema.length,
      matchConfidence: Math.round(matches[0]?.score * 100) || 0,
      processingTime: Date.now() - startTime
    }
  };
}

function formatErrorResponse(error: unknown, connectionId: string, query: string) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  
  return {
    success: false,
    error: errorMessage,
    details: {
      connectionId,
      query,
      timestamp: new Date().toISOString()
    },
    suggestion: getErrorSuggestion(errorMessage)
  };
}

function getErrorSuggestion(error: string) {
  const suggestions = {
    'ETIMEDOUT': 'Check database server availability and network connection',
    'SSL': 'Verify SSL certificate configuration',
    'syntax': 'Review generated SQL query for database-specific syntax',
    'authentication': 'Validate database credentials',
    'default': 'Try rephrasing your query or contact support'
  };

  return Object.entries(suggestions).find(([key]) => 
    error.toLowerCase().includes(key.toLowerCase())
  )?.[1] || suggestions.default;
}

// SQL Generation functions ----------------------------------------------------

export async function generateSQLQuery(
  schema: SchemaMatch[],
  userQuery: string,
  connectionId: string
) {
  const [connection] = await db
    .select()
    .from(dbConnections)
    .where(eq(dbConnections.id, Number(connectionId)));

  if (!connection) throw new Error('Connection not found');
  
  const dbType = connection.dbType as 'postgres' | 'mysql';
  const quoteChar = dbType === 'mysql' ? '`' : '"';
  const likeOperator = dbType === 'mysql' ? 'LIKE' : 'ILIKE';

  const schemaAnalysis = buildSchemaAnalysis(schema, quoteChar);
  const prompt = buildGenerationPrompt(dbType, schemaAnalysis, userQuery, quoteChar, likeOperator);
  
  const rawQuery = await getAIResponse(prompt);
  return sanitizeGeneratedQuery(rawQuery, dbType, quoteChar, likeOperator);
}

function buildSchemaAnalysis(schema: SchemaMatch[], quoteChar: string) {
  return schema.reduce((acc, table) => {
    acc[table.tableName] = {
      columns: table.columns.split(',').map(col => {
        const [name, type] = col.trim().split('(');
        return { name: name.trim(), type: type?.replace(')', '').trim() || 'text' };
      })
    };
    return acc;
  }, {} as Record<string, { columns: Array<{ name: string; type: string }> }>);
}

function buildGenerationPrompt(
  dbType: string,
  schema: any,
  query: string,
  quote: string,
  likeOp: string
) {
  return `
Generate ${dbType.toUpperCase()} SQL query following these rules:
1. Use ${quote} for identifiers
2. Use ${likeOp} for text matching
3. Include EXPLICIT joins
4. Use table aliases
5. Only necessary columns

Schema:
${Object.entries(schema).map(([table, details]) => `
- ${quote}${table}${quote}: 
  ${(details as any).columns.map((c: any) => `${quote}${c.name}${quote} (${c.type})`).join(', ')}`).join('\n')}

Query: "${query}"

Output ONLY SQL:`;
}

async function getAIResponse(prompt: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: "You are a SQL expert. Generate valid SQL only." },
      { role: "user", content: prompt }
    ],
    temperature: 0.1,
    max_tokens: 500
  });
  
  return response.choices[0]?.message?.content?.trim() || '';
}

function sanitizeGeneratedQuery(
  query: string,
  dbType: string,
  quoteChar: string,
  likeOp: string
) {
  return query
    .replace(/```sql/gi, '')
    .replace(/```/g, '')
    .replace(dbType === 'mysql' ? /"/g : /`/g, quoteChar)
    .replace(/ilike/gi, likeOp)
    .trim();
}
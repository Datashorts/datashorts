'use server'

import { currentUser } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { index } from "@/app/lib/pinecone";
import { db } from "@/configs/db";
import { eq, and } from "drizzle-orm";
import { chats, dbConnections } from "@/configs/schema";
import { chunkTableData } from "@/lib/utils/tokenManagement";
import { taskManager } from "@/lib/agents/taskManager";
import { inquire } from "@/lib/agents/inquire";


export async function embeddings(data) {
    console.log('Starting embeddings process for connection ID:', data.id);
    const user = await currentUser();
    if (!user) return null;
  
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
    try {
      console.log(`Processing ${(data.tables || data.collections)?.length || 0} tables/collections`);
      const schemaText = (data.tables || data.collections).map(t => ({
        tableName: t.tableName || t.collectionName,
        columns: t.columns.map(c => `${c.column_name} (${c.data_type})`).join(', ')
      }));
  
      console.log('Schema text sample:', JSON.stringify(schemaText.slice(0, 2)));
  

      const schemaEmbedding = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: JSON.stringify(schemaText)
      });
      console.log('Schema embedding created successfully');
  

      async function* generateTableChunks() {
        for (const table of data.tables || data.collections) {
          const tableName = table.tableName || table.collectionName;
          console.log(`Processing table: ${tableName} with ${table.data?.length || 0} rows`);
          
          const chunks = chunkTableData(table.data);
          console.log(`Table ${tableName}: Created ${chunks.length} chunks`);
  
          for (let i = 0; i < chunks.length; i++) {
            console.log(`Processing chunk ${i+1}/${chunks.length} for table ${tableName}`);
            const chunkData = {
              tableName,
              entries: chunks[i]
            };
  
            const embedding = await openai.embeddings.create({
              model: "text-embedding-ada-002",
              input: JSON.stringify(chunkData)
            });
            console.log(`Created embedding for ${tableName} chunk ${i+1}`);
  
            yield {
              id: `data-${String(data.id)}-${tableName}-${i}`,
              values: embedding.data[0].embedding,
              metadata: {
                type: 'data',
                connectionId: String(data.id),
                connectionName: data.connectionName,
                dbType: data.dbType,
                tableName,
                chunkIndex: i,
                timestamp: new Date().toISOString(),
                data: JSON.stringify(chunkData)
              }
            };
          }
        }
      }
  
      const BATCH_SIZE = 10;
      let batch = [];
      let batchCount = 0;
      
      for await (const embeddingData of generateTableChunks()) {
        batch.push(embeddingData);
        if (batch.length >= BATCH_SIZE) {
          await index.upsert(batch);
          batchCount++;
          console.log(`Upserted batch ${batchCount} with ${batch.length} embeddings to Pinecone`);
          batch = [];
        }
      }
      
      if (batch.length > 0) {
        await index.upsert(batch);
        batchCount++;
        console.log(`Upserted final batch ${batchCount} with ${batch.length} embeddings to Pinecone`);
      }
  
  
      await index.upsert([{
        id: `schema-${data.id}`,
        values: schemaEmbedding.data[0].embedding,
        metadata: {
          type: 'schema',
          connectionId: String(data.id),
          schema: JSON.stringify(schemaText)
        }
      }]);
      console.log('Schema embedding upserted to Pinecone');
  
      console.log('Embeddings process completed successfully');
      return true;
    } catch (error) {
      console.error("Embedding generation failed:", error);
      throw error;
    }
  }
  
export async function getQueryEmbeddings(message, connectionId) {
  console.log(`Getting query embeddings for message: "${message.substring(0, 50)}..." and connection ID: ${connectionId}`);
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const questionEmbedding = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: message
    });
    console.log('Question embedding created successfully');

    const queryResult = await index.query({
      vector: questionEmbedding.data[0].embedding,
      filter: { connectionId: String(connectionId) },
      topK: 15,
      includeMetadata: true
    });
    console.log(`Retrieved ${queryResult.matches?.length || 0} matches from Pinecone`);


    const matches = queryResult.matches || [];
    console.log('Match scores:', matches.map(m => ({
      id: m.id,
      score: m.score,
      type: m.metadata?.type
    })));


    const schemaInfo = matches.find(m => m.metadata?.type === 'schema')?.metadata?.schema;
    const dataChunks = matches
      .filter(m => m.metadata?.type === 'data')
      .map(m => {
        try {
          return JSON.parse(m.metadata?.data);
        } catch (e) {
          console.error('Error parsing metadata:', e);
          return null;
        }
      })
      .filter(Boolean);
    
    console.log(`Found ${dataChunks.length} valid data chunks`);


    const reconstructedData = [];
    const rowsByTable = {};
    // Example dataChunk:
    // {
    //   "tableName": "users",
    //   "entries": [
    //     {
    //       "pk": { "id": 1 },
    //       "attribute": { "name": "Alice" }
    //     },
    //     {
    //       "pk": { "id": 1 },
    //       "attribute": { "email": "alice@example.com" }
    //     }
    //   ]
    // }
    // For each chunk, look at each entry.

// Group entries by primary key (converted to string).

// Combine their attributes.

// Example:

// {
//   pk: { id: 1 },
//   attribute: { name: "Alice" }
// }
// {
//   pk: { id: 1 },
//   attribute: { email: "alice@example.com" }
// }
// Becomes:
// {
//   id: 1,
//   name: "Alice",
//   email: "alice@example.com"
// }

    
    dataChunks.forEach(chunk => {
      const tableName = chunk.tableName;
      rowsByTable[tableName] = rowsByTable[tableName] || {};
      

      if (chunk.entries && chunk.entries[0]?.pk) {
        console.log(`Processing PK-attribute format for table ${tableName} with ${chunk.entries.length} entries`);
        chunk.entries.forEach(entry => {
          const pkKey = JSON.stringify(entry.pk);
          rowsByTable[tableName][pkKey] = rowsByTable[tableName][pkKey] || { ...entry.pk };
          Object.assign(rowsByTable[tableName][pkKey], entry.attribute);
        });
      } else if (Array.isArray(chunk.entries)) {

        console.log(`Processing legacy format for table ${tableName} with ${chunk.entries.length} entries`);
        chunk.entries.forEach(row => {
          const rowKey = JSON.stringify(row);
          rowsByTable[tableName][rowKey] = row;
        });
      }
    });

    // Convert Grouped Rows to Final Format
    // [
    //   {
    //     tableName: "users",
    //     sampleData: [
    //       { id: 1, name: "Alice", email: "alice@example.com" },
    //       { id: 2, name: "Bob", email: "bob@example.com" }
    //     ]
    //   }
    // ]
    
    Object.entries(rowsByTable).forEach(([tableName, rows]) => {
      const rowsArray = Object.values(rows);
      console.log(`Reconstructed ${rowsArray.length} rows for table ${tableName}`);
      reconstructedData.push({
        tableName,
        sampleData: rowsArray
      });
    });


    const result = {
      schema: schemaInfo ? JSON.parse(schemaInfo) : [],
      sampleData: reconstructedData
    };
    

    function formatDatabaseContext(embeddingsData) {
      return `Current database context:
Schema Information:
${embeddingsData.schema.map(table => 
  `Table: ${table.tableName}
   Columns: ${table.columns}`
).join('\n')}

Sample Data:
${embeddingsData.sampleData.map(table => 
  `Table: ${table.tableName}
   Data: ${JSON.stringify(table.sampleData, null, 2)}`
).join('\n\n')}`;
    }
    
    const formattedContext = formatDatabaseContext(result);
    console.log('Database Context:');
    console.log(formattedContext);


    return {
      embeddings: questionEmbedding.data[0].embedding,
      matches: matches.map(m => ({
        id: m.id,
        score: m.score,
        type: m.metadata?.type
      })),
      context: result
    };
  } catch (error) {
    console.error("Error getting embeddings:", error);
    throw error;
  }
}

export async function getChatHistory(connectionId) {
  const chatHistory = await db
    .select()
    .from(chats)
    .where(eq(chats.connectionId, connectionId))
    .orderBy(chats.createdAt);

  if (!chatHistory.length) return [];

  return chatHistory[0].conversation.map(chat => {
    const parsedResponse = JSON.parse(chat.response);
    return {
      id: Date.now(),
      message: chat.message,
      response: parsedResponse.type === "analysis" ? parsedResponse.data : parsedResponse,
      timestamp: chat.timestamp,
      connectionId
    };
  });
}

export async function submitChat(userQuery, url) {
  console.log('Submitting chat with query:', userQuery);
  console.log('URL:', url);
  
  // Extract connection ID and name from URL
  // Expected format: http://localhost:3000/chats/11/postgresqltest
  const urlParts = url.split('/');
  const connectionId = urlParts[urlParts.length - 2];
  const connectionName = urlParts[urlParts.length - 1]; 
  
  console.log(`Extracted connection ID: ${connectionId}, connection name: ${connectionName}`);
  
  try {
    // Get query embeddings and analyze intent in parallel
    const [embeddingsResult, taskResult] = await Promise.all([
      getQueryEmbeddings(userQuery, connectionId),
      taskManager([
        { 
          role: 'system', 
          content: 'Initial context. Direct questions about counts, totals, or current state should be analyzed directly.' 
        },
        { role: 'user', content: userQuery }
      ])
    ]);
    
    console.log('Task analysis:', taskResult);
    

    const databaseContext = formatDatabaseContext(embeddingsResult.context);
    

    let inquireResult = null;
    if (taskResult.next === 'inquire') {
      console.log('Calling inquire agent with database context and user query');
      inquireResult = await inquire([
        { role: 'system', content: databaseContext },
        { role: 'user', content: userQuery }
      ]);
      console.log('Inquire agent response:', inquireResult);
    }
    
    // Prepare the response object
    const response = {
      success: true,
      embeddings: embeddingsResult.embeddings,
      matches: embeddingsResult.matches,
      connectionId,
      connectionName,
      context: embeddingsResult.context,
      intent: {
        intent: taskResult.next,
        tables: [], 
        operation: taskResult.reason
      },
      inquire: inquireResult
    };
    
    // Store the chat in the database
    await storeChatInDatabase(userQuery, response, connectionId);
    
    return response;
  } catch (error) {
    console.error('Error in submitChat:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Function to store chat in the database
async function storeChatInDatabase(userQuery, response, connectionId) {
  try {
    const user = await currentUser();
    if (!user) {
      console.error('No authenticated user found');
      return;
    }
    
    // Check if a chat record already exists for this connection
    const existingChats = await db
      .select()
      .from(chats)
      .where(eq(chats.connectionId, connectionId));
    
    const timestamp = new Date().toISOString();
    
    // Prepare the chat entry
    const chatEntry = {
      message: userQuery,
      response: JSON.stringify(response),
      timestamp
    };
    
    if (existingChats.length > 0) {
      // Update existing chat record
      const existingChat = existingChats[0];
      const conversation = existingChat.conversation || [];
      
      // Add the new chat entry to the conversation
      conversation.push(chatEntry);
      
      // Update the chat record
      await db
        .update(chats)
        .set({
          conversation,
          updatedAt: new Date()
        })
        .where(eq(chats.id, existingChat.id));
      
      console.log(`Updated chat record for connection ID: ${connectionId}`);
    } else {
      // Create a new chat record
      await db.insert(chats).values({
        userId: user.id,
        connectionId: parseInt(connectionId),
        conversation: [chatEntry],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log(`Created new chat record for connection ID: ${connectionId}`);
    }
  } catch (error) {
    console.error('Error storing chat in database:', error);
  }
}

// Helper function to format database context for the inquire agent
function formatDatabaseContext(context) {
  if (!context) return "No database context available.";
  
  let formattedContext = "Database Context:\n\n";
  

  if (context.schema && context.schema.length > 0) {
    formattedContext += "Schema Information:\n";
    context.schema.forEach(table => {
      formattedContext += `Table: ${table.tableName}\n`;
      formattedContext += `Columns: ${table.columns}\n\n`;
    });
  }
  

  if (context.sampleData && context.sampleData.length > 0) {
    formattedContext += "Sample Data:\n";
    context.sampleData.forEach(table => {
      formattedContext += `Table: ${table.tableName}\n`;
      formattedContext += `Data: ${JSON.stringify(table.sampleData, null, 2)}\n\n`;
    });
  }
  
  return formattedContext;
}
  
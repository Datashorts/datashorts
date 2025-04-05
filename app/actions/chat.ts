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
import { researcher } from "@/lib/agents/researcher";
import { visualiser } from "@/lib/agents/visualiser";


export async function embeddings(data) {
    console.log('Starting embeddings process for connection ID:', data.id);
    const user = await currentUser();
    if (!user) return null;
  
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
    try {
      console.log(`Processing ${(data.tables || data.collections)?.length || 0} tables/collections`);
      

      const schemaText = (data.tables || data.collections).map(t => {
        const tableName = t.tableName || t.collectionName;
        

        if (t.schema && Array.isArray(t.schema) && t.schema.length > 0 && 'column_name' in t.schema[0]) {
          return {
            tableName,
            columns: t.schema.map(c => `${c.column_name} (${c.data_type})`).join(', ')
          };
        } 

        else if (t.columns && Array.isArray(t.columns) && t.columns.length > 0 && 'column_name' in t.columns[0]) {
          return {
            tableName,
            columns: t.columns.map(c => `${c.column_name} (${c.data_type})`).join(', ')
          };
        }

        else {
          console.log(`Warning: Unrecognized schema structure for table ${tableName}`);
          return {
            tableName,
            columns: 'Schema structure not recognized'
          };
        }
      });
  
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
          

          if (!table.data || table.data.length === 0) {
            console.log(`No data found for table ${tableName}, skipping`);
            continue;
          }
          
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
      } else if (chunk.entries && typeof chunk.entries === 'object') {

        console.log(`Processing MongoDB format for table ${tableName}`);
        const rowKey = JSON.stringify(chunk.entries);
        rowsByTable[tableName][rowKey] = chunk.entries;
      }
    });


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
      if (!embeddingsData.schema || !embeddingsData.sampleData) {
        console.log('Missing schema or sample data in embeddings result');
        return 'Database context not available';
      }
      
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
  try {
    console.log(`Fetching chat history for connection ID: ${connectionId}`);
    
    const chatHistory = await db
      .select()
      .from(chats)
      .where(eq(chats.connectionId, connectionId))
      .orderBy(chats.createdAt);
    
    console.log(`Found ${chatHistory.length} chat records for connection ID: ${connectionId}`);
    
    if (!chatHistory.length) {
      console.log('No chat history found, returning empty array');
      return [];
    }
    

    if (!chatHistory[0].conversation || !Array.isArray(chatHistory[0].conversation)) {
      console.log('Conversation is not an array or is missing:', chatHistory[0].conversation);
      return [];
    }
    
    console.log(`Processing ${chatHistory[0].conversation.length} conversation items`);
    
    return chatHistory[0].conversation.map((chat, index) => {
      try {
        const parsedResponse = JSON.parse(chat.response);
        return {
          id: `${connectionId}-${index}`,
          message: chat.message,
          response: {
            agentType: parsedResponse.agentType,
            agentOutput: parsedResponse.agentOutput
          },
          timestamp: chat.timestamp,
          connectionId
        };
      } catch (error) {
        console.error(`Error parsing response for chat item ${index}:`, error);
        return {
          id: `${connectionId}-${index}`,
          message: chat.message || '',
          response: {
            agentType: 'unknown',
            agentOutput: 'Error parsing response'
          },
          timestamp: chat.timestamp || new Date().toISOString(),
          connectionId
        };
      }
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return [];
  }
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

    const [embeddingsResult, conversationHistory] = await Promise.all([
      getQueryEmbeddings(userQuery, connectionId),
      getChatHistory(connectionId)
    ]);
    
    console.log('Conversation history:', conversationHistory);
    

    const formattedHistory = conversationHistory.map(chat => [
      { role: 'user', content: chat.message },
      { role: 'assistant', content: typeof chat.response.agentOutput === 'string' 
        ? chat.response.agentOutput 
        : JSON.stringify(chat.response.agentOutput) }
    ]).flat();
    

    const taskAnalysis = await taskManager([
      { 
        role: 'system', 
        content: 'Initial context. Direct questions about counts, totals, or current state should be analyzed directly.' 
      },
      ...formattedHistory,
      { role: 'user', content: userQuery }
    ]);
    
    console.log('Task analysis:', taskAnalysis);
    

    const taskResult = taskAnalysis;

    // Get database context for all agent types
    const databaseContext = formatDatabaseContext(embeddingsResult.context);
    console.log('Database Context:', databaseContext);

    // Handle different agent types based on task result
    if (taskResult.next === 'analyze') {
      // ... existing analyze code ...
      const formattedHistory = conversationHistory.map(chat => [
        { role: 'user', content: chat.message },
        { role: 'assistant', content: typeof chat.response.agentOutput === 'string' 
          ? chat.response.agentOutput 
          : JSON.stringify(chat.response.agentOutput) }
      ]).flat();
      
      const researcherResponse = await researcher([
        { 
          role: 'system', 
          content: `You are a researcher agent that analyzes data and provides insights.
          
Based on the following database context and user query, provide a detailed analysis in JSON format:
${databaseContext}

User Query: ${userQuery}

Your response should be in the following JSON format:
{
  "summary": "A concise summary of the analysis",
  "details": ["Detail point 1", "Detail point 2", ...],
  "metrics": {
    "metric1": "value1",
    "metric2": "value2"
  }
}`
        },
        ...formattedHistory,
        { role: 'user', content: userQuery }
      ]);

      console.log('Researcher response:', researcherResponse);

      // Parse the researcher response
      let researcherResult;
      try {
        researcherResult = typeof researcherResponse === 'string' 
          ? JSON.parse(researcherResponse) 
          : researcherResponse;
      } catch (error) {
        console.error('Error parsing researcher response:', error);
        researcherResult = {
          summary: "Error parsing analysis results",
          details: ["There was an error processing your request. Please try again."],
          metrics: {}
        };
      }

      // Store the chat in the database
      await storeChatInDatabase(userQuery, {
        success: true,
        connectionId,
        connectionName,
        agentType: 'researcher',
        agentOutput: researcherResult
      }, connectionId);

      return {
        success: true,
        connectionId,
        connectionName,
        agentType: 'researcher',
        agentOutput: researcherResult
      };
    } else if (taskResult.next === 'visualize') {
      console.log('Calling visualiser agent with database context and user query');
      
      const formattedHistory = conversationHistory.map(chat => [
        { role: 'user', content: chat.message },
        { role: 'assistant', content: typeof chat.response.agentOutput === 'string' 
          ? chat.response.agentOutput 
          : JSON.stringify(chat.response.agentOutput) }
      ]).flat();
      
      const visualiserResult = await visualiser([
        { 
          role: 'system', 
          content: `You are a visualisation agent that creates meaningful visualizations based on data.
          
Based on the following database context and user query, create an appropriate visualization in JSON format:
${databaseContext}

User Query: ${userQuery}

Your response should be in the following JSON format:
{
  "type": "visualization",
  "content": {
    "title": "Visualization title",
    "summary": "Brief summary of what the visualization shows",
    "details": ["Detail point 1", "Detail point 2", ...],
    "metrics": {
      "metric1": "value1",
      "metric2": "value2"
    }
  },
  "visualization": {
    "chartType": "bar" | "pie",
    "data": [
      {
        "label": "Label 1",
        "value": 100,
        "color": "#color" (optional)
      },
      ...
    ],
    "config": {
      "title": "Chart title",
      "description": "Chart description",
      "xAxis": {
        "label": "X-axis label",
        "type": "category" | "time" | "linear"
      },
      "yAxis": {
        "label": "Y-axis label",
        "type": "number" | "category"
      },
      "legend": {
        "display": true
      },
      "stacked": false,
      "pieConfig": {
        "donut": false,
        "showPercentages": true
      }
    }
  }
}`
        },
        ...formattedHistory,
        { role: 'user', content: userQuery }
      ]);
      
      console.log('Visualiser agent response:', visualiserResult);
      
      // Parse the visualiser response if it's a string
      let parsedVisualiserResult;
      try {
        parsedVisualiserResult = typeof visualiserResult === 'string' 
          ? JSON.parse(visualiserResult) 
          : visualiserResult;
      } catch (error) {
        console.error('Error parsing visualiser response:', error);
        parsedVisualiserResult = {
          type: "visualization",
          content: {
            title: "Error",
            summary: "Error processing your request",
            details: ["There was an error processing your request. Please try again."],
            metrics: {}
          },
          visualization: {
            chartType: "bar",
            data: [
              { label: "Error", value: 0 }
            ],
            config: {
              title: "Error Visualization",
              description: "An error occurred while generating the visualization",
              xAxis: {
                label: "",
                type: "category"
              },
              yAxis: {
                label: "",
                type: "number"
              },
              legend: {
                display: false
              },
              stacked: false
            }
          }
        };
      }
      
      // Store the chat in the database
      await storeChatInDatabase(userQuery, {
        success: true,
        connectionId,
        connectionName,
        agentType: 'visualize',
        agentOutput: parsedVisualiserResult
      }, connectionId);
      
      return {
        success: true,
        connectionId,
        connectionName,
        agentType: 'visualize',
        agentOutput: parsedVisualiserResult
      };
    } else if (taskResult.next === 'inquire') {
      // ... existing inquire code ...
      console.log('Calling inquire agent with database context and user query');
      
      const formattedHistory = conversationHistory.map(chat => [
        { role: 'user', content: chat.message },
        { role: 'assistant', content: typeof chat.response.agentOutput === 'string' 
          ? chat.response.agentOutput 
          : JSON.stringify(chat.response.agentOutput) }
      ]).flat();
      
      const inquireResult = await inquire([
        { role: 'system', content: databaseContext },
        ...formattedHistory,
        { role: 'user', content: userQuery }
      ]);
      console.log('Inquire agent response:', inquireResult);
      
      // Parse the inquire response if it's a string
      let parsedInquireResult;
      try {
        parsedInquireResult = typeof inquireResult === 'string' 
          ? JSON.parse(inquireResult) 
          : inquireResult;
      } catch (error) {
        console.error('Error parsing inquire response:', error);
        parsedInquireResult = {
          question: "Error processing your request",
          context: "There was an error processing your request. Please try again.",
          options: []
        };
      }
      
      const response = {
        success: true,
        connectionId,
        connectionName,
        agentType: taskResult.next,
        agentOutput: parsedInquireResult
      };
      
      await storeChatInDatabase(userQuery, response, connectionId);
      
      return response;
    }
    
    // Default response if no specific agent was called
    const response = {
      success: true,
      connectionId,
      connectionName,
      agentType: taskResult.next,
      agentOutput: null
    };
    
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


async function storeChatInDatabase(userQuery, response, connectionId) {
  try {
    console.log(`Storing chat for connection ID: ${connectionId}`);
    console.log('User query:', userQuery);
    console.log('Response:', JSON.stringify(response, null, 2));
    
    const user = await currentUser();
    if (!user) {
      console.error('No authenticated user found');
      return;
    }
    

    const existingChats = await db
      .select()
      .from(chats)
      .where(eq(chats.connectionId, connectionId));
    
    console.log(`Found ${existingChats.length} existing chat records for connection ID: ${connectionId}`);
    
    const timestamp = new Date().toISOString();
    

    const chatEntry = {
      message: userQuery,
      response: JSON.stringify(response),
      timestamp
    };
    
    console.log('Prepared chat entry:', JSON.stringify(chatEntry, null, 2));
    
    if (existingChats.length > 0) {

      const existingChat = existingChats[0];
      const conversation = existingChat.conversation || [];
      
      console.log(`Existing conversation has ${conversation.length} entries`);
      

      conversation.push(chatEntry);
      
      await db
        .update(chats)
        .set({
          conversation,
          updatedAt: new Date()
        })
        .where(eq(chats.id, existingChat.id));
      
      console.log(`Updated chat record for connection ID: ${connectionId}`);
    } else {
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
  
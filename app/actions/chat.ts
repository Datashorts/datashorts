'use server'

import { currentUser } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { index } from "@/app/lib/pinecone";
import { db } from "@/configs/db";
import { eq, and } from "drizzle-orm";
import { chats, dbConnections } from "@/configs/schema";
import { chunkTableData } from "@/lib/utils/tokenManagement";


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
  
      // Schema embedding remains unchanged
      const schemaEmbedding = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: JSON.stringify(schemaText)
      });
      console.log('Schema embedding created successfully');
  
      // Generate embeddings for each table's chunks
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
  
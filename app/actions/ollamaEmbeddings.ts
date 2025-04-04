'use server'

import { generateOllamaEmbedding } from '@/app/lib/ollamaEmbeddings';
import { index as pinecone } from '@/app/lib/pinecone';
import { chunkTableData } from '@/lib/utils/tokenManagement';
import { embeddings } from '@/app/actions/chat';

/**
 * Process database connection data and store embeddings in Pinecone using Ollama
 * @param data Database connection data
 */
export async function processOllamaEmbeddings(data: any) {
  console.log('Starting Ollama embeddings process with data:', JSON.stringify({
    id: data.id,
    connectionName: data.connectionName,
    dbType: data.dbType,
    tablesCount: data.tables?.length || 0,
    collectionsCount: data.collections?.length || 0
  }));
  
  try {
    // Check if Ollama is running
    let ollamaAvailable = false;
    try {
      console.log('Checking if Ollama is running...');
      const healthCheck = await fetch('http://localhost:11434/api/health', {
        method: 'GET',
        cache: 'no-store'
      });
      
      if (healthCheck.ok) {
        const healthData = await healthCheck.json();
        console.log('Ollama health check successful:', healthData);
        ollamaAvailable = true;
      } else {
        console.warn(`Ollama health check failed: ${healthCheck.status} ${healthCheck.statusText}`);
      }
    } catch (error) {
      console.warn('Ollama health check failed:', error);
      // Continue with fallback
    }
    
    // If Ollama is not available, fall back to OpenAI embeddings
    if (!ollamaAvailable) {
      console.log('Ollama is not available. Falling back to OpenAI embeddings...');
      try {
        await embeddings(data);
        console.log('OpenAI embeddings process completed successfully');
        return { success: true, message: 'Used OpenAI embeddings as fallback' };
      } catch (error) {
        console.error('Error in OpenAI embeddings fallback:', error);
        return { success: false, error: 'Both Ollama and OpenAI embeddings failed' };
      }
    }
    
    // Generate schema embedding
    console.log('Preparing schema text...');
    const schemaText = (data.tables || data.collections).map(t => ({
      tableName: t.tableName || t.collectionName,
      columns: t.columns.map(c => `${c.column_name} (${c.data_type})`).join(', ')
    }));
    
    console.log('Schema text sample:', JSON.stringify(schemaText.slice(0, 2)));
    
    console.log('Generating schema embedding with Ollama...');
    const schemaEmbedding = await generateOllamaEmbedding(JSON.stringify(schemaText));
    console.log('Schema embedding generated successfully, length:', schemaEmbedding.length);
    
    // Store schema embedding in Pinecone
    console.log('Storing schema embedding in Pinecone...');
    await pinecone.upsert({
      vectors: [{
        id: `schema-${data.id}`,
        values: schemaEmbedding,
        metadata: {
          type: 'schema',
          connectionId: data.id,
          connectionName: data.connectionName,
          dbType: data.dbType
        }
      }]
    });
    
    console.log('Schema embedding stored in Pinecone');
    
    // Process table data embeddings using the same chunking strategy
    console.log('Starting table data processing...');
    async function* generateTableChunks() {
      for (const table of data.tables || data.collections) {
        const tableName = table.tableName || table.collectionName;
        console.log(`Processing table: ${tableName} with ${table.data?.length || 0} rows`);
        
        if (!table.data || table.data.length === 0) {
          console.log(`Skipping table ${tableName} - no data`);
          continue;
        }
        
        console.log(`Chunking data for table ${tableName}...`);
        const chunks = chunkTableData(table.data);
        console.log(`Table ${tableName}: Created ${chunks.length} chunks`);
        
        for (let i = 0; i < chunks.length; i++) {
          console.log(`Processing chunk ${i+1}/${chunks.length} for table ${tableName}`);
          const chunkData = {
            tableName,
            entries: chunks[i]
          };
          
          console.log(`Generating embedding for chunk ${i+1}/${chunks.length} of table ${tableName}...`);
          const chunkEmbedding = await generateOllamaEmbedding(JSON.stringify(chunkData));
          console.log(`Created embedding for ${tableName} chunk ${i+1}, length: ${chunkEmbedding.length}`);
          
          yield {
            id: `data-${String(data.id)}-${tableName}-${i}`,
            values: chunkEmbedding,
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
    
    // Process chunks in batches for better performance
    console.log('Starting batch processing of embeddings...');
    const BATCH_SIZE = 10;
    let batch = [];
    let batchCount = 0;
    
    for await (const embeddingData of generateTableChunks()) {
      batch.push(embeddingData);
      if (batch.length >= BATCH_SIZE) {
        console.log(`Upserting batch ${batchCount + 1} with ${batch.length} embeddings to Pinecone...`);
        await pinecone.upsert(batch);
        batchCount++;
        console.log(`Upserted batch ${batchCount} with ${batch.length} embeddings to Pinecone`);
        batch = [];
      }
    }
    
    if (batch.length > 0) {
      console.log(`Upserting final batch with ${batch.length} embeddings to Pinecone...`);
      await pinecone.upsert(batch);
      batchCount++;
      console.log(`Upserted final batch ${batchCount} with ${batch.length} embeddings to Pinecone`);
    }
    
    console.log('Ollama embeddings process completed successfully');
    return { success: true };
  } catch (error) {
    console.error('Error in Ollama embeddings process:', error);
    
    // Try OpenAI embeddings as a fallback
    console.log('Attempting OpenAI embeddings as fallback...');
    try {
      await embeddings(data);
      console.log('OpenAI embeddings fallback completed successfully');
      return { success: true, message: 'Used OpenAI embeddings as fallback after Ollama error' };
    } catch (fallbackError) {
      console.error('Error in OpenAI embeddings fallback:', fallbackError);
      return { success: false, error: error.message || 'Unknown error in embeddings process' };
    }
  }
} 
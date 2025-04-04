import { Pinecone } from '@pinecone-database/pinecone';

// Initialize the Pinecone client
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

// Get the index name from environment variables or use a default
const indexName = process.env.PINECONE_INDEX_NAME;

// Create or get the index with the correct dimensions for text-embedding-3-large (3072)
let index;
try {
  // Try to get the existing index
  index = pc.index(indexName);
  console.log(`Using existing Pinecone index: ${indexName}`);
} catch (error) {
  console.log(`Creating new Pinecone index: ${indexName} with 3072 dimensions`);
  // Create a new index with 3072 dimensions
  pc.createIndex({
    name: indexName,
    dimension: 3072, // Dimension for text-embedding-3-large
    metric: 'cosine'
  });
  index = pc.index(indexName);
}

// Export the index for use in other parts of the application
export { index }; 
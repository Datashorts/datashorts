import { MongoClient } from 'mongodb';

interface MongoDocument {
  [key: string]: any;
}

interface SchemaField {
  column_name: string;
  data_type: string;
}

export async function connectToMongoDB(mongoUrl: string) {
  const client = new MongoClient(mongoUrl, {
    connectTimeoutMS: 30000,
    socketTimeoutMS: 30000
  });

  await client.connect();
  
  const dbName = mongoUrl.split('/').pop()?.split('?')[0] || 'default';
  const db = client.db(dbName);
  
  // Get all collections
  const collections = await db.listCollections().toArray();
  console.log("collections", collections);
  const allCollectionData = [];
  
  for (const collection of collections) {
    const collectionName = collection.name;
    
    // Get sample data and schema from each collection
    const sampleData = await db.collection(collectionName)
      .find({})
      .limit(100)
      .toArray();
      
    // Infer schema from sample data
    const schema = inferMongoSchema(sampleData);
    console.log("schema", schema);
    allCollectionData.push({
      collectionName,
      schema,
      data: sampleData
    });
  }
  
  await client.close();
  return allCollectionData;
}

function inferMongoSchema(documents: MongoDocument[]): SchemaField[] {
  const schema: SchemaField[] = [];
  if (documents.length === 0) return schema;
  
  const sampleDoc = documents[0];
  for (const [key, value] of Object.entries(sampleDoc)) {
    schema.push({
      column_name: key,
      data_type: typeof value === 'object' ? 
        (Array.isArray(value) ? 'array' : 'object') : 
        typeof value
    });
  }
  
  return schema;
} 
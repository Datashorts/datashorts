"use server";

import { index as pinecone } from "@/app/lib/pinecone";
import { chunkTableData } from "@/lib/utils/tokenManagement";
import OpenAI from "openai";
import { getPool } from "@/app/lib/db/pool";
import { db } from "@/configs/db";
import { dbConnections } from "@/configs/schema";
import { eq } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate embeddings for schema text using OpenAI
 * @param text The schema text to embed
 * @returns The embedding vector
 */
async function generatePipeline2Embeddings(text: string) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
      encoding_format: "float",
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embeddings:", error);
    throw new Error("Failed to generate embeddings");
  }
}

/**
 * Process database schema and store embeddings in Pinecone
 * @param data The database connection data containing schema information
 */
export async function processPipeline2Embeddings(data: {
  id: string;
  connectionName: string;
  dbType: string;
  schema: Record<string, any[]>;
  postgresUrl: string;
}) {
  try {
    console.log("Processing schema for pipeline 2 embeddings:", data);

    const pool = getPool(data.id, data.postgresUrl);
    console.log("Created pool for connection:", data.id);

    await db
      .update(dbConnections)
      .set({
        tableSchema: JSON.stringify(
          Object.entries(data.schema).map(([tableName, columns]) => ({
            tableName,
            columns,
          }))
        ),
      })
      .where(eq(dbConnections.id, Number(data.id)));

    const schemaEntries = Object.entries(data.schema).map(
      ([tableName, columns]) => {
        const columnDescriptions = columns
          .map((col) => {
            const columnName = col.column_name || col.name;
            const dataType = col.data_type || col.type;
            return `${columnName} (${dataType})`;
          })
          .join(", ");

        const textVariations = [
          `Table ${tableName} contains the following columns: ${columnDescriptions}`,
          `The ${tableName} table has columns: ${columnDescriptions}`,
          `${tableName} table with columns: ${columnDescriptions}`,
          `Database table ${tableName} containing: ${columnDescriptions}`,
        ];

        return {
          tableName,
          textVariations,
          columns: columnDescriptions,
        };
      }
    );

    console.log("Processed schema entries:", schemaEntries);

    const embeddingPromises = schemaEntries.flatMap(async (entry) => {
      const embeddings = await Promise.all(
        entry.textVariations.map(async (text, index) => {
          const embedding = await generatePipeline2Embeddings(text);
          return {
            id: `schema-${data.id}-${entry.tableName}-${index}`,
            values: embedding,
            metadata: {
              connectionId: String(data.id),
              connectionName: data.connectionName,
              dbType: data.dbType,
              tableName: entry.tableName,
              text: text,
              columns: entry.columns,
              pipeline: "pipeline2",
              type: "schema",
            },
          };
        })
      );
      return embeddings;
    });

    const allEmbeddings = await Promise.all(embeddingPromises);
    const flattenedEmbeddings = allEmbeddings.flat();

    console.log(
      `Generated ${flattenedEmbeddings.length} embeddings for ${schemaEntries.length} tables`
    );

    await pinecone.upsert(flattenedEmbeddings);
    console.log("Successfully stored embeddings in Pinecone");

    return true;
  } catch (error) {
    console.error("Error processing pipeline 2 embeddings:", error);
    throw error;
  }
}

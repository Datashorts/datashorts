import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { getPool } from '@/app/lib/db/pool';
import { db } from '@/configs/db';
import { dbConnections } from '@/configs/schema';
import { eq } from 'drizzle-orm';
import { index as pinecone } from '@/app/lib/pinecone';
import OpenAI from 'openai';
import { currentUser, auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

/**
 * Generate embeddings for schema text using OpenAI
 */
async function generateSchemaEmbeddings(text: string) {
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


const server = new McpServer({
  name: "DataShorts",
  version: "1.0.0",
  metadata: {
    description: "PostgreSQL database connection and query management tool",
    capabilities: {
      tools: {
        add_database: {
          description: "Add a new PostgreSQL database connection",
          examples: [
            "Add my PostgreSQL database",
            "Connect to my Postgres database",
            "Set up a new database connection",
          ],
        },
        list_databases: {
          description: "List all connected PostgreSQL databases",
          examples: [
            "Show my database connections",
            "List all connected databases",
            "What databases are available?",
          ],
        },
        remove_database: {
          description: "Remove a PostgreSQL database connection",
          examples: [
            "Remove my database connection",
            "Delete a database connection",
            "Disconnect from a database",
          ],
        },
        execute_sql_query: {
          description: "Execute SQL queries on a PostgreSQL database",
          examples: [
            "Run a SQL query on my database",
            "Execute SELECT * FROM users",
            "Query my database",
          ],
        },
        get_database_schema: {
          description: "Get the schema of a PostgreSQL database",
          examples: [
            "Show database schema",
            "Get table structure",
            "List database tables and columns",
          ],
        },
      },
    },
    integration: {
      supportedClients: ["cursor", "claude"],
      authentication: {
        type: "bearer",
        description: "Requires a valid Clerk authentication token",
      },
      cors: {
        allowedOrigins: process.env.NODE_ENV === 'production' ? ['https://your-production-domain.com'] : ['*'],
        allowedMethods: ["GET", "POST", "OPTIONS", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization", "Mcp-Session-Id", "Accept"],
      },
    },
  },
});


server.tool(
  "execute_sql_query",
  "Execute a SQL query on a PostgreSQL database",
  {
    connectionId: z.string().describe('The database connection ID'),
    sqlQuery: z.string().describe('The SQL query to execute'),
  },
  async ({ connectionId, sqlQuery }) => {
    try {
      const [connection] = await db
        .select()
        .from(dbConnections)
        .where(eq(dbConnections.id, Number(connectionId)));

      if (!connection) {
        return {
          content: [{ type: 'text', text: 'Error: Connection not found' }],
        };
      }

      if (!connection.postgresUrl) {
        return {
          content: [{ type: 'text', text: 'Error: PostgreSQL connection URL is missing' }],
        };
      }

      const pool = getPool(connectionId, connection.postgresUrl);
      const result = await pool.query(sqlQuery);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            rows: result.rows,
            rowCount: result.rowCount,
          }, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error executing query: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }],
      };
    }
  }
);


server.tool(
  "get_database_schema",
  "Get the schema of a PostgreSQL database",
  {
    connectionId: z.string().describe('The database connection ID'),
  },
  async ({ connectionId }) => {
    try {
      const [connection] = await db
        .select()
        .from(dbConnections)
        .where(eq(dbConnections.id, Number(connectionId)));

      if (!connection) {
        return {
          content: [{ type: 'text', text: 'Error: Connection not found' }],
        };
      }

      if (!connection.postgresUrl) {
        return {
          content: [{ type: 'text', text: 'Error: PostgreSQL connection URL is missing' }],
        };
      }

      const pool = getPool(connectionId, connection.postgresUrl);
      const schemaResult = await pool.query(`
        SELECT 
          t.table_name,
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default
        FROM information_schema.tables t
        LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
        WHERE t.table_schema = 'public'
        ORDER BY t.table_name, c.column_name
      `);

      const schemaByTable: { [key: string]: any[] } = {};
      schemaResult.rows.forEach((row) => {
        if (!schemaByTable[row.table_name]) {
          schemaByTable[row.table_name] = [];
        }
        schemaByTable[row.table_name].push({
          column_name: row.column_name,
          data_type: row.data_type,
          is_nullable: row.is_nullable,
          column_default: row.column_default,
        });
      });

      await db
        .update(dbConnections)
        .set({
          tableSchema: JSON.stringify(
            Object.entries(schemaByTable).map(([tableName, columns]) => ({
              tableName,
              columns,
            }))
          ),
        })
        .where(eq(dbConnections.id, Number(connectionId)));

      const schemaEntries = Object.entries(schemaByTable).map(([tableName, columns]) => {
        const columnDescriptions = columns
          .map((col) => `${col.column_name} (${col.data_type})`)
          .join(", ");
        const textVariations = [
          `Table ${tableName} contains the following columns: ${columnDescriptions}`,
          `The ${tableName} table has columns: ${columnDescriptions}`,
          `${tableName} table with columns: ${columnDescriptions}`,
          `Database table ${tableName} containing: ${columnDescriptions}`,
        ];
        return { tableName, textVariations, columns: columnDescriptions };
      });

      const embeddingPromises = schemaEntries.flatMap(async (entry) => {
        const embeddings = await Promise.all(
          entry.textVariations.map(async (text, index) => {
            const embedding = await generateSchemaEmbeddings(text);
            return {
              id: `schema-${connectionId}-${entry.tableName}-${index}`,
              values: embedding,
              metadata: {
                connectionId: String(connectionId),
                connectionName: connection.connectionName,
                dbType: connection.dbType,
                tableName: entry.tableName,
                text,
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
      await pinecone.upsert(allEmbeddings.flat());

      return {
        content: [{ type: 'text', text: JSON.stringify(schemaByTable, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error getting schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }],
      };
    }
  }
);


server.tool(
  "add_database",
  "Add a new PostgreSQL database connection",
  {
    name: z.string().describe('A friendly name for your database connection'),
    connectionString: z.string().describe('The PostgreSQL connection string/URL'),
    folderId: z.string().optional().describe('Optional folder ID for organization'),
  },
  async ({ name, connectionString, folderId }) => {
    try {
      const user = await currentUser();
      if (!user) {
        return {
          content: [{ type: 'text', text: 'Error: You must be logged in to add a database connection' }],
        };
      }

      if (!connectionString.startsWith('postgres://') && !connectionString.startsWith('postgresql://')) {
        return {
          content: [{ type: 'text', text: 'Error: Invalid PostgreSQL connection string' }],
        };
      }

      const pool = getPool('test', connectionString);
      await pool.query('SELECT NOW()');

      const [newConnection] = await db.insert(dbConnections).values({
        userId: user.id,
        connectionName: name,
        dbType: 'postgres',
        postgresUrl: connectionString,
        folderId: folderId,
        pipeline: 'pipeline2',
      }).returning();

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: `Successfully connected to ${name}`,
            connection: {
              id: newConnection.id,
              name: newConnection.connectionName,
              type: newConnection.dbType,
            },
          }, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error adding database connection: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }],
      };
    }
  }
);


server.tool(
  "list_databases",
  "List all your PostgreSQL database connections",
  {},
  async () => {
    try {
      const user = await currentUser();
      if (!user) {
        return {
          content: [{ type: 'text', text: 'Error: You must be logged in to list database connections' }],
        };
      }

      const connections = await db
        .select()
        .from(dbConnections)
        .where(eq(dbConnections.userId, user.id));

      if (connections.length === 0) {
        return {
          content: [{ type: 'text', text: 'You have no database connections. Use the add_database tool to add one.' }],
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(
            connections.map(conn => ({
              id: conn.id,
              name: conn.connectionName,
              type: conn.dbType,
              created: conn.createdAt,
            })),
            null,
            2
          ),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error listing database connections: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }],
      };
    }
  }
);


server.tool(
  "remove_database",
  "Remove a PostgreSQL database connection",
  {
    connectionId: z.string().describe('The ID of the connection to remove'),
  },
  async ({ connectionId }) => {
    try {
      const user = await currentUser();
      if (!user) {
        return {
          content: [{ type: 'text', text: 'Error: You must be logged in to remove a database connection' }],
        };
      }

      const [connection] = await db
        .select()
        .from(dbConnections)
        .where(eq(dbConnections.id, Number(connectionId)))
        .where(eq(dbConnections.userId, user.id));

      if (!connection) {
        return {
          content: [{ type: 'text', text: 'Error: Database connection not found or you do not have permission to remove it' }],
        };
      }

      await db
        .delete(dbConnections)
        .where(eq(dbConnections.id, Number(connectionId)));

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: `Successfully removed database connection: ${connection.connectionName}`,
          }, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error removing database connection: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }],
      };
    }
  }
);


const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID(),
  onsessioninitialized: (sessionId) => {
    transports[sessionId] = transport;
  },
  onclose: () => {
    if (transport.sessionId) {
      delete transports[transport.sessionId];
    }
  },
  middleware: async (req) => {

    if (req.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' ? 'https://your-production-domain.com' : '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id, Accept',
          'Access-Control-Max-Age': '86400',
        },
      });
    }


    const origin = req.headers.get('origin');
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? ['https://your-production-domain.com']
      : ['*'];
    if (origin && allowedOrigins !== ['*'] && !allowedOrigins.includes(origin)) {
      throw new Error('Invalid Origin header');
    }


    const { userId } = await auth();
    if (!userId) {
      throw new Error('Unauthorized');
    }


    const sessionId = req.headers.get('mcp-session-id');
    if (!isInitializeRequest(req.body) && (!sessionId || !transports[sessionId])) {
      throw new Error('Invalid or missing session ID');
    }


    const response = new NextResponse();
    response.headers.set('Access-Control-Allow-Origin', allowedOrigins[0]);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id, Accept');


    const lastEventId = req.headers.get('last-event-id');
    if (lastEventId && sessionId && transports[sessionId]) {

      transports[sessionId].resumeStream(lastEventId);
    }

    return { userId, response };
  },
});


transport.handleDelete = async (req) => {
  const sessionId = req.headers.get('mcp-session-id');
  if (!sessionId || !transports[sessionId]) {
    return new NextResponse('Invalid or missing session ID', { status: 400 });
  }

  delete transports[sessionId];
  return new NextResponse(null, { status: 204 });
};


await server.connect(transport);


export const GET = async (req: Request) => {
  if (!req.headers.get('accept')?.includes('text/event-stream')) {
    return new NextResponse('Accept header must include text/event-stream', { status: 400 });
  }
  return transport.handleRequest(req);
};

export const POST = async (req: Request) => {
  const contentType = req.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return new NextResponse('Content-Type must be application/json', { status: 400 });
  }
  const accept = req.headers.get('accept');
  if (!accept?.includes('application/json') && !accept?.includes('text/event-stream')) {
    return new NextResponse('Accept header must include application/json or text/event-stream', { status: 400 });
  }
  const body = await req.json();
  return transport.handleRequest(req, body);
};

export const DELETE = async (req: Request) => {
  return transport.handleDelete(req);
};

export const OPTIONS = async () => {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' ? 'datashorts-production.up.railway.app' : '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id, Accept',
      'Access-Control-Max-Age': '86400',
    },
  });
};
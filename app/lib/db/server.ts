import { Pool } from 'pg';
import { db } from '@/configs/db';
import { dbConnections } from '@/configs/schema';
import { eq } from 'drizzle-orm';

// Map to store pools for different connections
const connectionPools = new Map<string, Pool>();

export async function getServerPool(connectionId: string): Promise<Pool> {
  if (connectionPools.has(connectionId)) {
    return connectionPools.get(connectionId)!;
  }

  const [connection] = await db
    .select()
    .from(dbConnections)
    .where(eq(dbConnections.id, Number(connectionId)));

  if (!connection) {
    throw new Error('Connection not found');
  }

  if (!connection.postgresUrl) {
    throw new Error('PostgreSQL connection URL is missing');
  }

  const connectionUrl = connection.postgresUrl.includes('sslmode=') 
    ? connection.postgresUrl 
    : `${connection.postgresUrl}${connection.postgresUrl.includes('?') ? '&' : '?'}sslmode=no-verify`;

  const pool = new Pool({
    connectionString: connectionUrl,
    ssl: {
      rejectUnauthorized: false
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  connectionPools.set(connectionId, pool);
  return pool;
}

export async function executeServerQuery(connectionId: string, sqlQuery: string) {
  const pool = await getServerPool(connectionId);
  const result = await pool.query(sqlQuery);
  return {
    success: true,
    rows: result.rows,
    rowCount: result.rowCount
  };
} 
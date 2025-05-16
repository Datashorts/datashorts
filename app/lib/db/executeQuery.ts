import { db } from '@/configs/db';
import { dbConnections } from '@/configs/schema';
import { eq } from 'drizzle-orm';
import { getExistingPool, getPool } from '@/app/lib/db/pool';

/**
 * Execute SQL query on the database connection
 * @param connectionId The database connection ID
 * @param sqlQuery The SQL query to execute
 * @returns The query results
 */
export async function executeSQLQuery(connectionId: string, sqlQuery: string) {
  try {
    // Set SSL verification to false for self-signed certificates
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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

    let pool = getExistingPool(connectionId);
    if (!pool) {
      console.log('No existing pool found, creating new pool for connection:', connectionId);
      const connectionUrl = connection.postgresUrl.includes('sslmode=') 
        ? connection.postgresUrl 
        : `${connection.postgresUrl}${connection.postgresUrl.includes('?') ? '&' : '?'}sslmode=no-verify`;
      pool = getPool(connectionId, connectionUrl);
    }

    const result = await pool.query(sqlQuery);
    console.log('Query executed successfully');

    return {
      success: true,
      rows: result.rows,
      rowCount: result.rowCount
    };
  } catch (error) {
    console.error('Error executing SQL query:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  } finally {
    // Reset SSL verification
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
  }
} 
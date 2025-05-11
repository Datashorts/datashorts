import { Pool } from 'pg';

// Map to store pools for different connections
const connectionPools = new Map<string, Pool>();

/**
 * Get or create a pool for a specific connection
 * @param connectionId The database connection ID
 * @param connectionString The PostgreSQL connection string
 * @returns The pool instance
 */
export function getPool(connectionId: string, connectionString: string): Pool {
  // Check if pool already exists for this connection
  if (connectionPools.has(connectionId)) {
    return connectionPools.get(connectionId)!;
  }

  // Create new pool
  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    },
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
    connectionTimeoutMillis: 2000, // How long to wait for a connection
  });

  // Store pool in map
  connectionPools.set(connectionId, pool);

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    // Remove pool from map on error
    connectionPools.delete(connectionId);
  });

  return pool;
}

/**
 * Close a specific connection pool
 * @param connectionId The database connection ID
 */
export async function closePool(connectionId: string) {
  const pool = connectionPools.get(connectionId);
  if (pool) {
    await pool.end();
    connectionPools.delete(connectionId);
  }
}

/**
 * Close all connection pools
 */
export async function closeAllPools() {
  const closePromises = Array.from(connectionPools.values()).map(pool => pool.end());
  await Promise.all(closePromises);
  connectionPools.clear();
}

/**
 * Get an existing pool for a connection
 * @param connectionId The database connection ID
 * @returns The pool instance or undefined if not found
 */
export function getExistingPool(connectionId: string): Pool | undefined {
  return connectionPools.get(connectionId);
} 
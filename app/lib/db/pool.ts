import { Pool } from 'pg';

// Map to store pools for different connections
const connectionPools = new Map<string, Pool>();

// Map to store last used timestamp for each pool
const poolLastUsed = new Map<string, number>();

// Maximum number of pools to keep active
const MAX_ACTIVE_POOLS = 10;

// Pool cleanup interval (5 minutes)
const POOL_CLEANUP_INTERVAL = 5 * 60 * 1000;

// Pool idle timeout (10 minutes)
const POOL_IDLE_TIMEOUT = 10 * 60 * 1000;

/**
 * Get or create a pool for a specific connection
 * @param connectionId The database connection ID
 * @param connectionString The PostgreSQL connection string
 * @returns The pool instance
 */
export function getPool(connectionId: string, connectionString: string): Pool {
  // Update last used timestamp
  poolLastUsed.set(connectionId, Date.now());

  if (connectionPools.has(connectionId)) {
    return connectionPools.get(connectionId)!;
  }

  // If we have too many active pools, clean up the oldest ones
  if (connectionPools.size >= MAX_ACTIVE_POOLS) {
    cleanupOldPools();
  }

  const isLocalConnection = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  
  let modifiedConnectionString = connectionString;
  if (modifiedConnectionString.startsWith('postgres://')) {
    modifiedConnectionString = modifiedConnectionString.replace('postgres://', 'postgresql://');
  }

  const poolConfig: any = {
    connectionString: modifiedConnectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };

  if (isLocalConnection) {
    poolConfig.ssl = false;
    modifiedConnectionString = modifiedConnectionString.replace(/[?&]sslmode=[^&]+/, '');
    modifiedConnectionString = modifiedConnectionString.includes('?')
      ? `${modifiedConnectionString}&sslmode=disable`
      : `${modifiedConnectionString}?sslmode=disable`;
    console.log('Local connection detected, explicitly disabling SSL');
  } else {
    poolConfig.ssl = {
      rejectUnauthorized: false
    };
    if (!modifiedConnectionString.includes('sslmode=')) {
      modifiedConnectionString = modifiedConnectionString.includes('?')
        ? `${modifiedConnectionString}&sslmode=require`
        : `${modifiedConnectionString}?sslmode=require`;
    }
  }

  poolConfig.connectionString = modifiedConnectionString;
  console.log(`Creating pool with connection string (password hidden): ${modifiedConnectionString.replace(/\/\/[^:]+:[^@]+@/, '//****:****@')}`);

  const pool = new Pool(poolConfig);

  // Store pool in map
  connectionPools.set(connectionId, pool);

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    // Remove pool from map on error
    connectionPools.delete(connectionId);
    poolLastUsed.delete(connectionId);
  });

  return pool;
}

/**
 * Clean up old pools that haven't been used recently
 */
function cleanupOldPools() {
  const now = Date.now();
  for (const [connectionId, lastUsed] of poolLastUsed.entries()) {
    if (now - lastUsed > POOL_IDLE_TIMEOUT) {
      const pool = connectionPools.get(connectionId);
      if (pool) {
        pool.end().catch(err => {
          console.error('Error closing pool:', err);
        });
      }
      connectionPools.delete(connectionId);
      poolLastUsed.delete(connectionId);
    }
  }
}

// Start periodic cleanup
setInterval(cleanupOldPools, POOL_CLEANUP_INTERVAL);

/**
 * Close a specific connection pool
 * @param connectionId The database connection ID
 */
export async function closePool(connectionId: string) {
  const pool = connectionPools.get(connectionId);
  if (pool) {
    await pool.end();
    connectionPools.delete(connectionId);
    poolLastUsed.delete(connectionId);
  }
}

/**
 * Close all connection pools
 */
export async function closeAllPools() {
  const closePromises = Array.from(connectionPools.values()).map(pool => pool.end());
  await Promise.all(closePromises);
  connectionPools.clear();
  poolLastUsed.clear();
}

/**
 * Get an existing pool for a connection
 * @param connectionId The database connection ID
 * @returns The pool instance or undefined if not found
 */
export function getExistingPool(connectionId: string): Pool | undefined {
  const pool = connectionPools.get(connectionId);
  if (pool) {
    // Update last used timestamp
    poolLastUsed.set(connectionId, Date.now());
  }
  return pool;
} 
import { Pool } from 'pg';
import * as mysql from 'mysql2/promise';
import { db } from '@/configs/db';
import { dbConnections } from '@/configs/schema';
import { eq } from 'drizzle-orm';

// Store active pools by connection ID
const pgPools = new Map<string, Pool>();
const mysqlPools = new Map<string, mysql.Pool>();

// Get PostgreSQL pool for a connection
export function getPool(connectionId: string, connectionString: string): Pool {
  // Check if pool already exists
  const existingPool = pgPools.get(connectionId);
  if (existingPool) {
    return existingPool;
  }

  // Parse connection string for SSL configuration
  const isLocalConnection = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  let modifiedConnectionString = connectionString;

  if (modifiedConnectionString.startsWith('postgres://')) {
    modifiedConnectionString = modifiedConnectionString.replace('postgres://', 'postgresql://');
  }

  let poolConfig: any = {
    connectionString: modifiedConnectionString,
    statement_timeout: 30000,
    query_timeout: 30000,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };

  if (isLocalConnection) {
    poolConfig.ssl = false;
    modifiedConnectionString = modifiedConnectionString.replace(/[?&]sslmode=[^&]+/, '');
    modifiedConnectionString = modifiedConnectionString.includes('?')
      ? `${modifiedConnectionString}&sslmode=disable`
      : `${modifiedConnectionString}?sslmode=disable`;
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
  
  const pool = new Pool(poolConfig);
  
  pool.on('error', (err) => {
    console.error(`PostgreSQL pool error for connection ${connectionId}:`, err);
  });

  pgPools.set(connectionId, pool);
  return pool;
}

// Get MySQL pool for a connection
export function getMySQLPool(connectionId: string, connectionString: string): mysql.Pool {
  // Check if pool already exists
  const existingPool = mysqlPools.get(connectionId);
  if (existingPool) {
    return existingPool;
  }

  // Parse MySQL connection string
  const urlPattern = /mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
  const match = connectionString.match(urlPattern);

  if (!match) {
    throw new Error('Invalid MySQL connection string format');
  }

  const [, user, password, host, port, database] = match;
  const isLocalConnection = host === 'localhost' || host === '127.0.0.1';

  let poolConfig: mysql.PoolOptions = {
    host,
    port: parseInt(port),
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    connectTimeout: 30000,
  };

  // Configure SSL
  if (!isLocalConnection) {
    poolConfig.ssl = {
      rejectUnauthorized: false
    };
  }

  const pool = mysql.createPool(poolConfig);
  mysqlPools.set(connectionId, pool);
  return pool;
}

// Get existing PostgreSQL pool
export function getExistingPool(connectionId: string): Pool | undefined {
  return pgPools.get(connectionId);
}

// Get existing MySQL pool
export function getExistingMySQLPool(connectionId: string): mysql.Pool | undefined {
  return mysqlPools.get(connectionId);
}

// Get any pool (PostgreSQL or MySQL) based on connection type
export async function getAnyPool(connectionId: string): Promise<{ pool: Pool | mysql.Pool; type: 'postgres' | 'mysql' } | null> {
  // First check existing pools
  const pgPool = pgPools.get(connectionId);
  if (pgPool) {
    return { pool: pgPool, type: 'postgres' };
  }

  const mysqlPool = mysqlPools.get(connectionId);
  if (mysqlPool) {
    return { pool: mysqlPool, type: 'mysql' };
  }

  // If no existing pool, fetch connection details from database
  try {
    const [connection] = await db
      .select()
      .from(dbConnections)
      .where(eq(dbConnections.id, Number(connectionId)));

    if (!connection) {
      console.error('Connection not found for ID:', connectionId);
      return null;
    }

    const connectionUrl = connection.postgresUrl || connection.mongoUrl;
    if (!connectionUrl) {
      console.error('No connection URL found for connection:', connectionId);
      return null;
    }

    if (connection.dbType === 'postgres') {
      const pool = getPool(connectionId, connectionUrl);
      return { pool, type: 'postgres' };
    } else if (connection.dbType === 'mysql') {
      const pool = getMySQLPool(connectionId, connectionUrl);
      return { pool, type: 'mysql' };
    }

    return null;
  } catch (error) {
    console.error('Error fetching connection details:', error);
    return null;
  }
}

// Close a specific PostgreSQL pool
export async function closePgPool(connectionId: string) {
  const pool = pgPools.get(connectionId);
  if (pool) {
    await pool.end();
    pgPools.delete(connectionId);
    console.log(`PostgreSQL pool closed for connection ${connectionId}`);
  }
}

// Close a specific MySQL pool
export async function closeMySQLPool(connectionId: string) {
  const pool = mysqlPools.get(connectionId);
  if (pool) {
    await pool.end();
    mysqlPools.delete(connectionId);
    console.log(`MySQL pool closed for connection ${connectionId}`);
  }
}

// Close all pools
export async function closeAllPools() {
  // Close all PostgreSQL pools
  for (const [connectionId, pool] of pgPools) {
    await pool.end();
    console.log(`PostgreSQL pool closed for connection ${connectionId}`);
  }
  pgPools.clear();

  // Close all MySQL pools
  for (const [connectionId, pool] of mysqlPools) {
    await pool.end();
    console.log(`MySQL pool closed for connection ${connectionId}`);
  }
  mysqlPools.clear();
}

// Cleanup on process termination
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing all database pools...');
  await closeAllPools();
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing all database pools...');
  await closeAllPools();
});
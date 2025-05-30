import { Pool, PoolClient } from 'pg';
import * as mysql from 'mysql2/promise';
import { NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { dbConnections } from '@/configs/schema';
import { currentUser } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

// PostgreSQL pool management
let pgPool: Pool | null = null;

// MySQL pool management
let mysqlPool: mysql.Pool | null = null;

// Get PostgreSQL database pool
function getPostgresPool(connectionString: string): Pool {
  if (pgPool) {
    pgPool.end().catch(err => console.error('Error closing previous PostgreSQL pool:', err));
    pgPool = null;
  }

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
    console.log('Local PostgreSQL connection detected, explicitly disabling SSL');
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
  console.log(`Creating PostgreSQL pool with connection string (password hidden): ${modifiedConnectionString.replace(/\/\/[^:]+:[^@]+@/, '//****:****@')}`);

  pgPool = new Pool(poolConfig);
  pgPool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
  });

  return pgPool;
}

// Get MySQL database pool
function getMySQLPool(connectionString: string): mysql.Pool {
  if (mysqlPool) {
    mysqlPool.end().catch(err => console.error('Error closing previous MySQL pool:', err));
    mysqlPool = null;
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

  // Configure SSL based on connection type
  if (!isLocalConnection) {
    // For remote connections, disable SSL certificate verification
    poolConfig.ssl = {
      rejectUnauthorized: false
    };
    console.log('Remote MySQL connection detected, configuring SSL with rejectUnauthorized: false');
  } else {
    console.log('Local MySQL connection detected, SSL disabled');
  }

  console.log(`Creating MySQL pool for host: ${host}:${port}, database: ${database}`);

  mysqlPool = mysql.createPool(poolConfig);
  return mysqlPool;
}

// Close database pools
async function closePools() {
  if (pgPool) {
    await pgPool.end();
    console.log('PostgreSQL pool closed');
    pgPool = null;
  }
  if (mysqlPool) {
    await mysqlPool.end();
    console.log('MySQL pool closed');
    mysqlPool = null;
  }
}

// Process cleanup handlers
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM. Closing database pools...');
  await closePools();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT. Closing database pools...');
  await closePools();
  process.exit(0);
});

export async function POST(request: NextRequest) {
  let pgClient: PoolClient | undefined;
  let mysqlConnection: mysql.PoolConnection | undefined;
  let pgClientReleased = false;
  let mysqlConnectionReleased = false;

  try {
    let user;
    try {
      user = await currentUser();
    } catch (authError) {
      console.error('Authentication error:', authError);
      return NextResponse.json(
        { 
          error: 'Authentication failed',
          details: 'Please sign in to continue'
        },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in to continue' },
        { status: 401 }
      );
    }

    const { name, type, url, folderId } = await request.json();

    if (!url || !name) {
      return NextResponse.json(
        { error: 'Database URL and connection name are required' },
        { status: 400 }
      );
    }

    if (type !== 'postgres' && type !== 'mysql') {
      return NextResponse.json(
        { error: 'Only PostgreSQL and MySQL connections are supported at this time' },
        { status: 400 }
      );
    }

    try {
      let schemaByTable: { [key: string]: any[] } = {};

      if (type === 'postgres') {
        // PostgreSQL connection logic
        console.log('Creating PostgreSQL database pool for connection...');
        const pool = getPostgresPool(url);
        
        console.log('Attempting to connect to PostgreSQL database...');
        pgClient = await pool.connect();
        
        console.log('Successfully acquired connection from PostgreSQL pool');
        await pgClient.query('SELECT NOW()');
        console.log('PostgreSQL test query executed successfully');

        const schemaResult = await pgClient.query(`
          SELECT 
            t.table_name,
            c.column_name,
            c.data_type,
            c.is_nullable,
            c.column_default
          FROM information_schema.tables t
          LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
          WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
          ORDER BY t.table_name, c.column_name
        `);

        const schemaData = schemaResult.rows;
        console.log('Retrieved PostgreSQL schema for', schemaData.length, 'columns');

        schemaData.forEach((row) => {
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

        pgClient.release();
        pgClientReleased = true;
        console.log('Released PostgreSQL client back to pool');

      } else if (type === 'mysql') {
        // MySQL connection logic
        console.log('Creating MySQL database pool for connection...');
        const pool = getMySQLPool(url);
        
        console.log('Attempting to connect to MySQL database...');
        mysqlConnection = await pool.getConnection();
        
        console.log('Successfully acquired connection from MySQL pool');
        await mysqlConnection.query('SELECT NOW()');
        console.log('MySQL test query executed successfully');

        // Get database name from connection
        const dbNameResult = await mysqlConnection.query('SELECT DATABASE() as db_name');
        const dbName = (dbNameResult[0] as any)[0].db_name;

        // Get schema information for MySQL
        const [schemaData] = await mysqlConnection.query(`
          SELECT 
            t.TABLE_NAME as table_name,
            c.COLUMN_NAME as column_name,
            c.DATA_TYPE as data_type,
            c.IS_NULLABLE as is_nullable,
            c.COLUMN_DEFAULT as column_default,
            c.COLUMN_TYPE as column_type,
            c.COLUMN_KEY as column_key
          FROM information_schema.TABLES t
          LEFT JOIN information_schema.COLUMNS c 
            ON t.TABLE_NAME = c.TABLE_NAME 
            AND t.TABLE_SCHEMA = c.TABLE_SCHEMA
          WHERE t.TABLE_SCHEMA = ? 
            AND t.TABLE_TYPE = 'BASE TABLE'
          ORDER BY t.TABLE_NAME, c.ORDINAL_POSITION
        `, [dbName]);

        console.log('Retrieved MySQL schema for', (schemaData as any[]).length, 'columns');

        (schemaData as any[]).forEach((row) => {
          if (!schemaByTable[row.table_name]) {
            schemaByTable[row.table_name] = [];
          }
          schemaByTable[row.table_name].push({
            column_name: row.column_name,
            data_type: row.column_type || row.data_type, // Use column_type for more detail
            is_nullable: row.is_nullable === 'YES' ? 'YES' : 'NO',
            column_default: row.column_default,
            column_key: row.column_key, // PRI, UNI, MUL, etc.
          });
        });

        mysqlConnection.release();
        mysqlConnectionReleased = true;
        console.log('Released MySQL connection back to pool');
      }

      console.log('Saving connection information and schema to application database...');
      const [newConnection] = await db.insert(dbConnections).values({
        userId: user.id,
        folderId: folderId,
        connectionName: name,
        postgresUrl: type === 'postgres' ? url : null,
        mysqlUrl: type === 'mysql' ? url : null,
        dbType: type,
        pipeline: 'pipeline2',
        tableSchema: JSON.stringify(
          Object.entries(schemaByTable).map(([tableName, columns]) => ({
            tableName,
            columns,
          }))
        ),
      }).returning();

      console.log('Connection and schema saved successfully with ID:', newConnection.id);

      return NextResponse.json({
        success: true,
        message: 'Connection established and schema stored successfully',
        connection: {
          id: newConnection.id,
          name: name,
          type: type,
          folderId: folderId,
          url: url.replace(/\/\/[^:]+:[^@]+@/, '//****:****@'),
        },
        schema: schemaByTable,
      });

    } finally {
      // Cleanup connections
      if (pgClient && !pgClientReleased) {
        pgClient.release();
      }
      if (mysqlConnection && !mysqlConnectionReleased) {
        mysqlConnection.release();
      }
      
      // Close pools
      if (pgPool) {
        await pgPool.end().catch(err => console.error('Error closing PostgreSQL pool:', err));
        pgPool = null;
      }
      if (mysqlPool) {
        await mysqlPool.end().catch(err => console.error('Error closing MySQL pool:', err));
        mysqlPool = null;
      }
    }
  } catch (error) {
    console.error('Error connecting to database:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        code: error instanceof Error && 'code' in error ? (error as any).code : undefined,
        details: 'Check that your database URL is correct and the server is accessible',
      },
      { status: 500 }
    );
  }
}
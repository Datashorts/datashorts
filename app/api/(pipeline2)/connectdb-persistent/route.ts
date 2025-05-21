import { Pool, PoolClient } from 'pg';
import { NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { dbConnections } from '@/configs/schema';
import { currentUser } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';


let pool: Pool | null = null;


function getDbPool(connectionString: string): Pool {

  if (pool) {
    pool.end().catch(err => console.error('Error closing previous pool:', err));
    pool = null;
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
  
  pool = new Pool(poolConfig);

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  return pool;
}


async function closeDbPool() {
  if (pool) {
    await pool.end();
    console.log('Database pool closed');
    pool = null;
  }
}


process.on('SIGTERM', async () => {
  console.log('Received SIGTERM. Closing database pool...');
  await closeDbPool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT. Closing database pool...');
  await closeDbPool();
  process.exit(0);
});

export async function POST(request: NextRequest) {
  let pool: Pool | null = null;
  let client: PoolClient | undefined;
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

    if (type !== 'postgres') {
      return NextResponse.json(
        { error: 'Only PostgreSQL connections are supported at this time' },
        { status: 400 }
      );
    }

    try {
      console.log('Creating database pool for connection...');
      pool = getDbPool(url);
      
      console.log('Attempting to connect to database with modified connection string...');
      client = await pool.connect();
      
      console.log('Successfully acquired connection from pool');
      await client.query('SELECT NOW()');
      console.log('Test query executed successfully');
      client.release();
      console.log('Released client back to pool');

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

      const schemaData = schemaResult.rows;
      console.log('Retrieved schema for', schemaData.length, 'columns');

      const schemaByTable: { [key: string]: any[] } = {};
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

      console.log('Saving connection information and schema to application database...');
      const [newConnection] = await db.insert(dbConnections).values({
        userId: user.id,
        folderId: folderId,
        connectionName: name,
        postgresUrl: url,
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

      if (pool) {
        await pool.end().catch(err => console.error('Error closing pool:', err));
      }
    }
  } catch (error) {
    console.error('Error connecting to database:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        code: error instanceof Error && 'code' in error ? (error as any).code : undefined,
        details: 'Check that your PostgreSQL URL is correct and the server is accessible',
      },
      { status: 500 }
    );
  }
}
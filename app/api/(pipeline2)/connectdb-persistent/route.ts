import { Pool, PoolClient } from 'pg';
import { NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { dbConnections } from '@/configs/schema';
import { currentUser } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';


let pool: Pool | null = null;


function getDbPool(connectionString: string): Pool {
  if (!pool) {
    const hasSSLParam = connectionString.includes('sslmode=');
    let connectionOptions: any = {
      connectionString,
      statement_timeout: 30000,
      query_timeout: 30000,
    };

    if (!hasSSLParam) {
      connectionOptions.connectionString = connectionString.includes('?')
        ? `${connectionString}&sslmode=no-verify`
        : `${connectionString}?sslmode=no-verify`;
      connectionOptions.ssl = {
        rejectUnauthorized: false,
      };
    }

    pool = new Pool({
      ...connectionOptions,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

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


    pool = getDbPool(url);
    console.log('Using database pool for connection...');


    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';


    client = await pool.connect();
    try {
      console.log('Successfully acquired connection from pool');
      await client.query('SELECT NOW()');
    } finally {
      client.release();
      console.log('Released client back to pool');
    }


    const schemaResult = await pool.query(`
      SELECT 
        t.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
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


    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';

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
  } catch (error) {
    console.error('Error:', error);


    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        code: error instanceof Error && 'code' in error ? error.code : undefined,
        details: 'Check that your PostgreSQL URL is correct and the server is accessible',
      },
      { status: 500 }
    );
  }
} 
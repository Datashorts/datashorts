import { NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { dbConnections } from '@/configs/schema';
import { eq } from 'drizzle-orm';
import { currentUser } from '@clerk/nextjs/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const connectionId = typeof params.id === 'string' ? parseInt(params.id) : params.id;
    
    if (isNaN(connectionId)) {
      return NextResponse.json(
        { error: 'Invalid connection ID' },
        { status: 400 }
      );
    }
    
    // Fetch the connection details from the database
    const connections = await db
      .select()
      .from(dbConnections)
      .where(eq(dbConnections.id, connectionId));
    
    if (connections.length === 0) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }
    
    const connection = connections[0];
    
    // Determine which URL to return based on the database type
    let connectionUrl = '';
    if (connection.dbType === 'postgres') {
      connectionUrl = connection.postgresUrl || '';
    } else if (connection.dbType === 'mongodb') {
      connectionUrl = connection.mongoUrl || '';
    }
    
    return NextResponse.json({ 
      connectionUrl,
      dbType: connection.dbType
    });
  } catch (error) {
    console.error('Error fetching connection URL:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connection URL' },
      { status: 500 }
    );
  }
} 
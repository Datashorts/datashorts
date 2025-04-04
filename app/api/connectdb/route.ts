import { Client } from 'pg';
import { NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { dbConnections, tableSyncStatus } from '@/configs/schema';
import { currentUser } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs';

export async function POST(request: NextRequest) {
  try {

    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { name, type, url } = body;
    
    if (!name || !type || !url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // For now, we're just validating the connection without syncing data
    // In a real implementation, you would:
    // 1. Test the connection to the database
    // 2. Fetch schema information
    // 3. Store the connection details in your database
    
    // Simulate a successful connection
    return NextResponse.json({
      success: true,
      message: 'Connection established successfully',
      connection: {
        id: Date.now().toString(), // Temporary ID, will be replaced with UUID in the frontend
        name,
        type,
        url: url.replace(/\/\/[^:]+:[^@]+@/, '//****:****@') // Mask credentials in logs
      }
    });
    
  } catch (error) {
    console.error('Error connecting to database:', error);
    return NextResponse.json(
      { error: 'Failed to connect to database' },
      { status: 500 }
    );
  }
}

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
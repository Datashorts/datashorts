import { NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { folders, dbConnections } from '@/configs/schema';
import { currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

export async function GET(request) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    

    const userFolders = await db.select().from(folders).where(eq(folders.userId, userId));
    

    const userConnections = await db.select().from(dbConnections).where(eq(dbConnections.userId, userId));
    

    const foldersWithConnections = userFolders.map(folder => {
      const folderConnections = userConnections
        .filter(conn => conn.folderId === folder.id)
        .map(conn => ({
          id: conn.id.toString(),
          name: conn.connectionName,
          type: conn.dbType,
          url: conn.postgresUrl || conn.mongoUrl || ''
        }));
      
      return { 
        ...folder, 
        connections: folderConnections 
      };
    });
    
    return NextResponse.json(foldersWithConnections);
  } catch (error) {
    console.error('Error fetching folders with connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch folders with connections' },
      { status: 500 }
    );
  }
} 
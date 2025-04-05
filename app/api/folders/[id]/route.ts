import { NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { folders, dbConnections, tableSyncStatus, chats } from '@/configs/schema';
import { eq, and } from 'drizzle-orm';
import { currentUser } from '@clerk/nextjs/server';

export async function DELETE(
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
    
    const folderId = parseInt(params.id);
    
    if (isNaN(folderId)) {
      return NextResponse.json(
        { error: 'Invalid folder ID' },
        { status: 400 }
      );
    }
    
    // First, get all connections in this folder
    const connections = await db.select()
      .from(dbConnections)
      .where(eq(dbConnections.folderId, folderId));
    
    // Delete all chats associated with these connections
    for (const connection of connections) {
      await db.delete(chats)
        .where(eq(chats.connectionId, connection.id));
    }
    
    // Delete all table sync status records for these connections
    for (const connection of connections) {
      await db.delete(tableSyncStatus)
        .where(eq(tableSyncStatus.connectionId, connection.id));
    }
    
    // Delete all connections in this folder
    await db.delete(dbConnections)
      .where(eq(dbConnections.folderId, folderId));
    
    // Finally, delete the folder itself
    await db.delete(folders)
      .where(eq(folders.id, folderId));
    
    return NextResponse.json({ 
      success: true,
      message: 'Folder and associated connections deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json(
      { error: 'Failed to delete folder' },
      { status: 500 }
    );
  }
} 
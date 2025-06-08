// File: app/api/(common)/folders/[id]/route.ts (FIXED)
import { NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { folders, dbConnections, tableSyncStatus, chats, queryHistory } from '@/configs/schema';
import { eq, and } from 'drizzle-orm';
import { currentUser } from '@clerk/nextjs/server';

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    const params = await props.params;
    
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
    
    console.log('🗑️ Starting folder deletion for folderId:', folderId);
    
    // First, get all connections in this folder
    const connections = await db.select()
      .from(dbConnections)
      .where(eq(dbConnections.folderId, folderId));
    
    console.log('📋 Found connections to delete:', connections.map(c => c.id));
    
    // For each connection, delete all related data in the correct order
    for (const connection of connections) {
      console.log(`🔄 Processing connection ${connection.id}...`);
      
      // 1. Delete query history records for this connection
      console.log(`🗑️ Deleting query history for connection ${connection.id}...`);
      await db.delete(queryHistory)
        .where(eq(queryHistory.connectionId, connection.id));
      
      // 2. Delete chats associated with this connection
      console.log(`🗑️ Deleting chats for connection ${connection.id}...`);
      await db.delete(chats)
        .where(eq(chats.connectionId, connection.id));
      
      // 3. Delete table sync status records for this connection
      console.log(`🗑️ Deleting table sync status for connection ${connection.id}...`);
      await db.delete(tableSyncStatus)
        .where(eq(tableSyncStatus.connectionId, connection.id));
      
      console.log(`✅ Finished processing connection ${connection.id}`);
    }
    
    // 4. Now delete all connections in this folder (should work since references are gone)
    console.log(`🗑️ Deleting connections in folder ${folderId}...`);
    await db.delete(dbConnections)
      .where(eq(dbConnections.folderId, folderId));
    
    // 5. Finally, delete the folder itself
    console.log(`🗑️ Deleting folder ${folderId}...`);
    await db.delete(folders)
      .where(eq(folders.id, folderId));
    
    console.log('✅ Folder deletion completed successfully');
    
    return NextResponse.json({ 
      success: true,
      message: 'Folder and all associated data deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting folder:', error);
    return NextResponse.json(
      { error: 'Failed to delete folder' },
      { status: 500 }
    );
  }
}
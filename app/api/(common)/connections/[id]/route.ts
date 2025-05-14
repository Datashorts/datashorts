import { NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { dbConnections, tableSyncStatus, chats } from '@/configs/schema';
import { eq } from 'drizzle-orm';
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
    
    console.log('Deleting connection with ID:', params.id);
    
    const connectionId = typeof params.id === 'string' ? parseInt(params.id) : params.id;
    
    if (isNaN(connectionId)) {
      console.error('Invalid connection ID:', params.id);
      return NextResponse.json(
        { error: 'Invalid connection ID' },
        { status: 400 }
      );
    }
    
    console.log('Parsed connection ID:', connectionId);
    
    // First, delete all chats associated with this connection
    console.log('Deleting chats for connection ID:', connectionId);
    await db.delete(chats)
      .where(eq(chats.connectionId, connectionId));
    
    // Then delete all table sync status records for this connection
    console.log('Deleting table sync status records for connection ID:', connectionId);
    await db.delete(tableSyncStatus)
      .where(eq(tableSyncStatus.connectionId, connectionId));
    
    // Finally, delete the connection itself
    console.log('Deleting connection with ID:', connectionId);
    await db.delete(dbConnections)
      .where(eq(dbConnections.id, connectionId));
    
    console.log('Connection and associated records deleted successfully');
    
    return NextResponse.json({ 
      success: true,
      message: 'Connection and associated records deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting connection:', error);
    return NextResponse.json(
      { error: 'Failed to delete connection' },
      { status: 500 }
    );
  }
}
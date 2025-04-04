import { NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { dbConnections, tableSyncStatus } from '@/configs/schema';
import { eq } from 'drizzle-orm';
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
    
    const connectionId = parseInt(params.id);
    
    if (isNaN(connectionId)) {
      return NextResponse.json(
        { error: 'Invalid connection ID' },
        { status: 400 }
      );
    }
    
    // First, delete all table sync status records for this connection
    await db.delete(tableSyncStatus)
      .where(eq(tableSyncStatus.connectionId, connectionId));
    
    // Then delete the connection itself
    await db.delete(dbConnections)
      .where(eq(dbConnections.id, connectionId));
    
    return NextResponse.json({ 
      success: true,
      message: 'Connection and associated sync status records deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting connection:', error);
    return NextResponse.json(
      { error: 'Failed to delete connection' },
      { status: 500 }
    );
  }
} 
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
    

    console.log('Deleting table sync status records for connection ID:', connectionId);
    await db.delete(tableSyncStatus)
      .where(eq(tableSyncStatus.connectionId, connectionId));
    

    console.log('Deleting connection with ID:', connectionId);
    await db.delete(dbConnections)
      .where(eq(dbConnections.id, connectionId));
    
    console.log('Connection and associated sync status records deleted successfully');
    
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
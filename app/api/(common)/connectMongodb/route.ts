import { NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { dbConnections } from '@/configs/schema';
import { currentUser } from '@clerk/nextjs/server';
import { connectToMongoDB } from '@/configs/mongoDB';

export const POST = async (request: Request) => {
  try {
    const user = await currentUser();
    const { mongoUrl, connectionName, folderId } = await request.json();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!mongoUrl || !connectionName) {
      return NextResponse.json(
        { error: 'MongoDB URL and connection name are required' },
        { status: 400 }
      );
    }

    const allCollectionData = await connectToMongoDB(mongoUrl);
    console.log("allCollectionData",allCollectionData);

    const [newConnection] = await db.insert(dbConnections).values({
      userId: user.id,
      folderId: folderId,
      connectionName: connectionName,
      mongoUrl: mongoUrl,
      dbType: 'mongodb',
      pipeline: 'pipeline1',
      tableSchema: JSON.stringify(allCollectionData.map(t => ({
        tableName: t.collectionName,
        columns: t.schema
      }))),
      tableData: JSON.stringify(allCollectionData.map(t => ({
        tableName: t.collectionName,
        data: t.data
      })))
    }).returning();

    return NextResponse.json({ 
      id: newConnection.id,
      tables: allCollectionData 
    });

  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
} 
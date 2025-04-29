import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const dbUrl = searchParams.get('dbUrl');
    
    if (!dbUrl) {
      return NextResponse.json(
        { error: 'Database URL is required' },
        { status: 400 }
      );
    }
    
    console.log('Pipeline 2 - Database URL:', dbUrl);
    
    return NextResponse.json({ 
      success: true,
      message: 'Database URL logged successfully'
    });
  } catch (error) {
    console.error('Error in pipeline 2:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 
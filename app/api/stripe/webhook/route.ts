import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Payment processing temporarily disabled
  return NextResponse.json({
    success: false,
    error: 'Payment processing is temporarily unavailable'
  }, { status: 503 });
}

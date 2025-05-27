import { NextResponse } from 'next/server'
import { db } from '@/configs/db'
import { betaTesters } from '@/configs/schema'
import { auth } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const betaTester = await db.select()
      .from(betaTesters)
      .where(eq(betaTesters.userId, userId))
      .limit(1)

    return NextResponse.json({
      hasApplied: betaTester.length > 0,
      status: betaTester.length > 0 ? (betaTester[0].accepted ? 'approved' : 'pending') : null
    })
  } catch (error) {
    console.error('Error checking beta test status:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 
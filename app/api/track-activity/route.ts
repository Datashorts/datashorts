import { NextResponse } from 'next/server'
import { db } from '@/configs/db'
import { userActivity } from '@/configs/schema'
import { auth } from '@clerk/nextjs/server'
import { eq, and, isNull } from 'drizzle-orm'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body = await req.json()
    const { path, duration } = body
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'


    const activeSession = await db.select()
      .from(userActivity)
      .where(
        and(
          eq(userActivity.userId, userId),
          isNull(userActivity.sessionEnd)
        )
      )
      .limit(1)

    if (activeSession.length > 0) {

      const session = activeSession[0]
      const pageVisits = [...(session.pageVisits || []), {
        path,
        timestamp: new Date().toISOString(),
        duration
      }]

      await db
        .update(userActivity)
        .set({
          lastActive: new Date(),
          pageVisits,
          updatedAt: new Date()
        })
        .where(eq(userActivity.id, session.id))
    } else {

      await db.insert(userActivity).values({
        userId,
        ipAddress,
        userAgent,
        pageVisits: [{
          path,
          timestamp: new Date().toISOString(),
          duration
        }]
      })
    }

    return new NextResponse('Activity tracked successfully', { status: 200 })
  } catch (error) {
    console.error('Error tracking user activity:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}


export async function PATCH(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }


    await db
      .update(userActivity)
      .set({
        sessionEnd: new Date(),
        updatedAt: new Date()
      })
      .where(
        and(
          eq(userActivity.userId, userId),
          isNull(userActivity.sessionEnd)
        )
      )

    return new NextResponse('Session ended successfully', { status: 200 })
  } catch (error) {
    console.error('Error ending user session:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 
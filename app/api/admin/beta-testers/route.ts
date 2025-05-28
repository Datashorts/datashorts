import { NextResponse } from 'next/server'
import { db } from '@/configs/db'
import { betaTesters } from '@/configs/schema'
import { auth } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'

const adminUsers = [
  'user_2vGWjztVmYNM9zTMg9qHghGuSbI',
  'user_2vp5iU5LkPu3SIhsxNYLjkXaN86'
]

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Check if user is admin
    if (!adminUsers.includes(userId)) {
      return new NextResponse('Forbidden - Admin access required', { status: 403 })
    }

    const testers = await db.select().from(betaTesters).orderBy(betaTesters.createdAt)
    return NextResponse.json(testers)
  } catch (error) {
    console.error('Error fetching beta testers:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}


export async function PATCH(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Check if user is admin
    if (!adminUsers.includes(userId)) {
      return new NextResponse('Forbidden - Admin access required', { status: 403 })
    }

    const body = await req.json()
    const { id, accepted } = body

    if (typeof id !== 'number' || typeof accepted !== 'boolean') {
      return new NextResponse('Invalid request body', { status: 400 })
    }

    await db
      .update(betaTesters)
      .set({ accepted, updatedAt: new Date() })
      .where(eq(betaTesters.id, id))

    return new NextResponse('Beta tester status updated successfully', { status: 200 })
  } catch (error) {
    console.error('Error updating beta tester status:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 
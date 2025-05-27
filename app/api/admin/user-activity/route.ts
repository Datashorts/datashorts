import { NextResponse } from 'next/server'
import { db } from '@/configs/db'
import { userActivity } from '@/configs/schema'
import { auth } from '@clerk/nextjs/server'


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


    if (!adminUsers.includes(userId)) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const activity = await db.select().from(userActivity).orderBy(userActivity.sessionStart)
    return NextResponse.json(activity)
  } catch (error) {
    console.error('Error fetching user activity:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 
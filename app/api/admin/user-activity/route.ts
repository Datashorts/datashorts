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
      console.log('No user ID found')
      return new NextResponse('Unauthorized', { status: 401 })
    }

    console.log('Current user ID:', userId)
    console.log('Is admin?', adminUsers.includes(userId))
    console.log('Admin users:', adminUsers)

    // Check if user is admin
    if (!adminUsers.includes(userId)) {
      return new NextResponse('Forbidden - Admin access required', { status: 403 })
    }

    // Fetch all user activity
    const activity = await db.select().from(userActivity).orderBy(userActivity.sessionStart)
    return NextResponse.json(activity)
  } catch (error) {
    console.error('Error fetching user activity:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 
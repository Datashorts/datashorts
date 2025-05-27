import { NextResponse } from 'next/server'
import { db } from '@/configs/db'
import { betaTesters } from '@/configs/schema'
import { auth } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body = await req.json()
    const { name, email, company, role } = body


    const existingApplication = await db
      .select()
      .from(betaTesters)
      .where(eq(betaTesters.userId, userId))
      .limit(1)

    if (existingApplication.length > 0) {
      return new NextResponse('You have already applied for beta testing', { status: 400 })
    }


    await db.insert(betaTesters).values({
      userId,
      name,
      email,
      company,
      role,
      accepted: false
    })

    return new NextResponse('Application submitted successfully', { status: 200 })
  } catch (error) {
    console.error('Error submitting beta test application:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 
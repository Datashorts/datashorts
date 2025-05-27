import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { db } from '@/configs/db' 
import { betaTesters } from '@/configs/schema' 
import { eq } from 'drizzle-orm'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/',
  '/api/beta-test(.*)', 
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    const { userId } = await auth.protect()
    

    const adminUsers = [
      'user_2vGWjztVmYNM9zTMg9qHghGuSbI',
      'user_2vp5iU5LkPu3SIhsxNYLjkXaN86'
    ]
    

    if (adminUsers.includes(userId)) {
      return
    }
    

    const betaTester = await db.select()
      .from(betaTesters)
      .where(eq(betaTesters.userId, userId))
      .limit(1)
    

    if (!betaTester.length || !betaTester[0].accepted) {

      return new Response('Access denied. Beta testing approval required.', { 
        status: 403 
      })
    }
  }
})

export const config = {
  matcher: [

    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',

    '/(api|trpc)(.*)',
  ],
}
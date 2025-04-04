'use client'

import { Button } from "@/components/ui/button"
import { SignInButton, SignedIn, SignedOut, useUser } from '@clerk/nextjs'
import { useEffect } from 'react'
import { StoreUser } from '@/app/actions/user'
import { useRouter } from 'next/navigation'

export default function Hero() {
  const { user, isLoaded } = useUser()
  const router = useRouter()

  useEffect(() => {
    const syncUser = async () => {
      if (user) {
        await StoreUser(
          user.id,
          user.firstName || user.username || 'User',
          user.emailAddresses[0]?.emailAddress || ''
        )
      }
    }
    
    if (isLoaded && user) {
      syncUser()
    }
  }, [user, isLoaded])

  return (
    <section className="py-20 md:py-28 bg-[#121212]">
      <div className="container mx-auto px-6 md:px-8 lg:px-12 max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
          <div className="flex flex-col justify-center space-y-4">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter">
                <span className="text-blue-500">Chat</span> With Your Data,
                <br />
                <span className="text-blue-500">Naturally</span>
              </h1>
              <p className="max-w-[600px] text-gray-400 md:text-xl">
                Talk to your PostgreSQL and MongoDB databases through an intuitive AI-powered interface that understands
                your intent.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <SignedOut>
                <SignInButton mode="modal">
                  <Button className="bg-blue-600 hover:bg-blue-700">Get Started</Button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Button 
                  onClick={() => router.push('/chats')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Go to Dashboard
                </Button>
              </SignedIn>
              <Button variant="outline" className="border-gray-700 hover:bg-gray-800">
                Explore Features
              </Button>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <div className="flex items-center justify-center rounded-full bg-gray-800 px-2.5 py-1 text-xs">PG</div>
              <div className="flex items-center justify-center rounded-full bg-gray-800 px-2.5 py-1 text-xs">MDB</div>
              <span className="text-xs text-gray-400">Compatible with PostgreSQL & MongoDB</span>
            </div>
          </div>
          <div className="relative h-[400px] lg:h-[500px] rounded-lg border border-gray-800 bg-[#1a1a1a] p-4">
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-sm">DataChat Assistant</span>
            </div>
            <div className="absolute right-4 top-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-400"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18" />
                <path d="M14 15l2 2 4-4" />
              </svg>
            </div>
            <div className="mt-12 p-4">
              <div className="mb-6 ml-auto max-w-[80%] rounded-lg bg-blue-600 p-3">
                <p className="text-sm">All categories, but highlight top performers</p>
              </div>
              <div className="mb-4">
                <p className="text-sm mb-2">Here&apos;s your sales data by region for Q2 2023:</p>
                <div className="h-32 bg-[#222] rounded-md p-4 flex items-end gap-4">
                  <div className="h-16 w-6 bg-blue-500 rounded"></div>
                  <div className="h-20 w-6 bg-blue-500 rounded"></div>
                  <div className="h-12 w-6 bg-blue-500 rounded"></div>
                  <div className="h-24 w-6 bg-blue-500 rounded"></div>
                </div>
              </div>
              <div className="relative mt-8">
                <input
                  type="text"
                  placeholder="Ask about your data..."
                  className="w-full rounded-md border border-gray-700 bg-[#222] px-4 py-2 text-sm"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-blue-600 p-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m22 2-7 20-4-9-9-4Z" />
                    <path d="M22 2 11 13" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}


'use client'

import { SignInButton, SignedIn, SignedOut, useUser } from '@clerk/nextjs'
import { useEffect } from 'react'
import { StoreUser } from '@/app/actions/user'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'

export default function Hero() {
  const { user, isLoaded } = useUser()
  const router = useRouter()

  useEffect(() => {
    const syncUser = async () => {
      if (user) {
        await StoreUser({
          id: user.id,
          email: user.emailAddresses[0].emailAddress,
          name: user.fullName,
        })
      }
    }
    syncUser()
  }, [user])

  const handleGetStarted = () => {
    if (user) {
      router.push('/stats')
    }
  }

  return (
    <div className="relative isolate overflow-hidden bg-[#121212]">
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:pb-32 lg:flex lg:px-4 lg:py-40">
        <div className="mx-auto max-w-2xl flex-shrink-0 lg:mx-0 lg:max-w-2xl lg:pt-8 lg:pl-0">
          <div className="mt-24 sm:mt-32 lg:mt-16">
            <a href="#" className="inline-flex space-x-6">
              <span className="rounded-full bg-blue-500/10 px-3 py-1 text-sm font-semibold leading-6 text-blue-400 ring-1 ring-inset ring-blue-500/20">
                What's new
              </span>
              <span className="inline-flex items-center space-x-2 text-sm font-medium leading-6 text-gray-300">
                <span>Just shipped v1.0</span>
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </span>
            </a>
          </div>
          <h1 className="mt-10 text-6xl font-bold tracking-tight text-white sm:text-8xl">
            Chat with your database using natural language
          </h1>
          <p className="mt-6 text-2xl leading-8 text-gray-300">
            Ask questions about your data in plain English and get instant answers. No SQL required.
          </p>
          <div className="mt-10 flex items-center gap-x-6">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                  Get Started
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <button
                onClick={handleGetStarted}
                className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Go to Dashboard
              </button>
            </SignedIn>
            <a href="#features" className="text-sm font-semibold leading-6 text-white">
              Learn more <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
        <div className="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:ml-0 lg:mr-0 lg:mt-0 lg:max-w-none lg:flex-none xl:ml-16">
          <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
            <img
              src="https://cdn.pixabay.com/photo/2017/09/28/22/43/database-search-2797375_1280.png"
              alt="App screenshot"
              width={2432}
              height={1442}
              className="w-[50rem] md:w-[60rem] lg:w-[65rem] rounded-md bg-white/5 shadow-2xl ring-1 ring-white/10"
            />
          </div>
        </div>
      </div>
    </div>
  )
}


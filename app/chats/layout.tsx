'use client'

import { useUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isLoaded, user } = useUser()

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#121212]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    )
  }

  if (!user) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-[#121212]">
      {children}
    </div>
  )
} 
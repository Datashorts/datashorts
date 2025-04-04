'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import Sidebar from '@/app/_components/chat/Sidebar'
import { useFoldersStore } from '@/app/store/useFoldersStore'
import { useUser } from '@clerk/nextjs'

export default function ChatPage() {
  const params = useParams()
  const { user } = useUser()
  const { setActiveConnection, loadFolders } = useFoldersStore()
  const chatId = params.id as string

  useEffect(() => {
    // Set the active connection based on the chat ID
    setActiveConnection(chatId)
    
    // Load folders if user is authenticated
    if (user) {
      loadFolders(user.id)
    }
  }, [chatId, setActiveConnection, loadFolders, user])

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#121212]">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-gray-400">Please sign in to access the chat.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#121212]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-xl font-semibold">Chat with Database</h1>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="max-w-3xl mx-auto">
            <div className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-800 mb-4">
              <p className="text-gray-300">Welcome to your database chat! Ask questions about your data in natural language.</p>
            </div>
            
            {/* Chat messages will go here */}
            <div className="space-y-4">
              {/* Example message */}
              <div className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-800">
                <p className="text-gray-300">Hello! How can I help you with your database today?</p>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-800">
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Ask a question about your data..."
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 p-1 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
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
  )
} 
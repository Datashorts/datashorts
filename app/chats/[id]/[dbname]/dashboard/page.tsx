'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { getChatHistory, toggleBookmark } from '@/app/actions/chat'
import ChatMessage from '@/app/_components/chat/ChatMessage'
import { Bookmark, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BookmarkedChat {
  id: string
  message: string
  response: any
  timestamp: string
  bookmarked: boolean
  index: number // Add index to track position in original chat history
}

export default function DashboardPage() {
  const params = useParams()
  const { user } = useUser()
  const [bookmarkedChats, setBookmarkedChats] = useState<BookmarkedChat[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const connectionId = params.id as string
  const dbName = params.dbname as string

  const fetchBookmarkedChats = async () => {
    try {
      const chatHistory = await getChatHistory(connectionId)
      const bookmarked = chatHistory
        .map((chat, index) => ({ ...chat, index }))
        .filter(chat => chat.bookmarked)
      setBookmarkedChats(bookmarked)
    } catch (error) {
      console.error('Error fetching bookmarked chats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (connectionId) {
      fetchBookmarkedChats()
    }
  }, [connectionId])

  const handleRemoveBookmark = async (index: number) => {
    try {
      await toggleBookmark(connectionId, index)
      // Remove the item from the local state
      setBookmarkedChats(prev => prev.filter(chat => chat.index !== index))
    } catch (error) {
      console.error('Error removing bookmark:', error)
    }
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a] text-gray-200">
        <p className="text-xl font-semibold">Please sign in to continue.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a] text-gray-200">
        <p className="text-xl font-semibold">Loading bookmarked items...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-8">
          <Bookmark className="h-6 w-6 text-blue-400" />
          <h1 className="text-2xl font-semibold">Bookmarked Items</h1>
          <span className="text-sm text-gray-400">({dbName})</span>
        </div>

        {bookmarkedChats.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No bookmarked items yet. Bookmark some questions to see them here!
          </div>
        ) : (
          <div className="space-y-6">
            {bookmarkedChats.map((chat) => (
              <div key={chat.id} className="bg-[#111214]/80 border border-blue-500/20 rounded-lg p-6 relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 z-50 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                  onClick={() => handleRemoveBookmark(chat.index)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="space-y-4">
                  {/* Question */}
                  <div className="bg-gradient-to-br from-blue-600/30 to-blue-600/10 border border-blue-500/30 px-4 py-3 rounded-2xl rounded-tr-none">
                    <ChatMessage
                      message={chat.message}
                      response={{}}
                      isUser
                      isLoading={false}
                    />
                  </div>

                  {/* Answer */}
                  <div className="bg-[#111214]/80 border border-blue-500/20 px-4 py-3 rounded-2xl rounded-tl-none">
                    <ChatMessage
                      message=""
                      response={chat.response}
                      isUser={false}
                      onOptionClick={() => {}}
                      onSubmitResponse={() => {}}
                    />
                  </div>

                  {/* Timestamp */}
                  <div className="text-sm text-gray-400">
                    {new Date(chat.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { getChatHistory, toggleBookmark } from '@/app/actions/chat'
import ChatMessage from '@/app/_components/chat/ChatMessage'
import { Bookmark, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ResizableBox } from 'react-resizable'
import 'react-resizable/css/styles.css'


const styles = `
  .react-resizable {
    position: relative;
  }
  .react-resizable-handle {
    position: absolute;
    width: 20px;
    height: 20px;
    background-color: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 4px;
    z-index: 10;
  }
  .react-resizable-handle-se {
    bottom: -10px;
    right: -10px;
    cursor: se-resize;
  }
  .react-resizable-handle-sw {
    bottom: -10px;
    left: -10px;
    cursor: sw-resize;
  }
  .react-resizable-handle-ne {
    top: -10px;
    right: -10px;
    cursor: ne-resize;
  }
  .react-resizable-handle-nw {
    top: -10px;
    left: -10px;
    cursor: nw-resize;
  }
  .react-resizable-handle-s {
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    cursor: s-resize;
  }
  .react-resizable-handle-n {
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    cursor: n-resize;
  }
  .react-resizable-handle-e {
    right: -10px;
    top: 50%;
    transform: translateY(-50%);
    cursor: e-resize;
  }
  .react-resizable-handle-w {
    left: -10px;
    top: 50%;
    transform: translateY(-50%);
    cursor: w-resize;
  }
`

interface BookmarkedChat {
  id: string
  message: string
  response: any
  timestamp: string
  bookmarked: boolean
  index: number 
  originalIndex: number 
}

export default function DashboardPage() {
  const params = useParams()
  const { user } = useUser()
  const [bookmarkedChats, setBookmarkedChats] = useState<BookmarkedChat[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [boxSizes, setBoxSizes] = useState<{ [key: string]: { width: number; height: number } }>({})

  const connectionId = params.id as string
  const dbName = params.dbname as string


  const loadSavedSizes = () => {
    try {
      const savedSizes = localStorage.getItem(`bookmark-sizes-${connectionId}`)
      if (savedSizes) {
        return JSON.parse(savedSizes)
      }
    } catch (error) {
      console.error('Error loading saved sizes:', error)
    }
    return {}
  }


  const saveSizes = (sizes: { [key: string]: { width: number; height: number } }) => {
    try {
      localStorage.setItem(`bookmark-sizes-${connectionId}`, JSON.stringify(sizes))
    } catch (error) {
      console.error('Error saving sizes:', error)
    }
  }

  const fetchBookmarkedChats = async () => {
    try {
      const chatHistory = await getChatHistory(connectionId)
      const bookmarked = chatHistory
        .map((chat, index) => ({ ...chat, index }))
        .filter(chat => chat.bookmarked)
      setBookmarkedChats(bookmarked)


      const savedSizes = loadSavedSizes()
      const initialSizes = bookmarked.reduce((acc, chat) => ({
        ...acc,
        [chat.id]: savedSizes[chat.id] || { width: 400, height: 300 }
      }), {})
      setBoxSizes(initialSizes)
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
      const chatToRemove = bookmarkedChats.find(chat => chat.index === index);
      if (!chatToRemove) return;

      await toggleBookmark(connectionId, chatToRemove.originalIndex);
      
      setBookmarkedChats(prev => prev.filter(chat => chat.index !== index));
      

      const newSizes = { ...boxSizes }
      delete newSizes[chatToRemove.id]
      saveSizes(newSizes)
      
      await fetchBookmarkedChats();
    } catch (error) {
      console.error('Error removing bookmark:', error);
    }
  };

  const handleResize = (id: string, size: { width: number; height: number }) => {
    const newSizes = {
      ...boxSizes,
      [id]: size
    }
    setBoxSizes(newSizes)
    saveSizes(newSizes)
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
      <style>{styles}</style>
      <div className="max-w-[95%] mx-auto px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <Bookmark className="h-5 w-5 text-blue-400" />
          <h1 className="text-xl font-semibold">Bookmarked Items</h1>
          <span className="text-xs text-gray-400">({dbName})</span>
        </div>

        {bookmarkedChats.length === 0 ? (
          <div className="text-center text-gray-400 py-4 text-sm">
            No bookmarked items yet. Bookmark some questions to see them here!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bookmarkedChats.map((chat) => (
              <ResizableBox
                key={chat.id}
                width={boxSizes[chat.id]?.width || 400}
                height={boxSizes[chat.id]?.height || 300}
                minConstraints={[200, 200]}
                maxConstraints={[800, 600]}
                onResizeStop={(e, { size }) => handleResize(chat.id, size)}
                resizeHandles={['se', 'sw', 'ne', 'nw', 's', 'n', 'e', 'w']}
                className="bg-[#111214]/80 border border-blue-500/20 rounded-lg p-4 relative hover:border-blue-500/40 transition-colors"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 z-50 text-gray-400 hover:text-red-400 hover:bg-red-500/10 p-1"
                  onClick={() => handleRemoveBookmark(chat.index)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="space-y-2 h-full overflow-y-auto">
                  {/* Question */}
                  <div className="bg-gradient-to-br from-blue-600/30 to-blue-600/10 border border-blue-500/30 px-3 py-2 rounded-lg rounded-tr-none text-sm">
                    <ChatMessage
                      message={chat.message}
                      response={{}}
                      isUser
                      isLoading={false}
                    />
                  </div>

                  {/* Answer */}
                  <div className="bg-[#111214]/80 border border-blue-500/20 px-3 py-2 rounded-lg rounded-tl-none text-sm">
                    <ChatMessage
                      message=""
                      response={chat.response}
                      isUser={false}
                      onOptionClick={() => {}}
                      onSubmitResponse={() => {}}
                    />
                  </div>

                  {/* Timestamp */}
                  <div className="text-xs text-gray-400">
                    {new Date(chat.timestamp).toLocaleString()}
                  </div>
                </div>
              </ResizableBox>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 
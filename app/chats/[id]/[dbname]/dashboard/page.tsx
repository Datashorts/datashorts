'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { getChatHistory, toggleBookmark } from '@/app/actions/chat'
import ChatMessage from '@/app/_components/chat/ChatMessage'
import { Bookmark, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import GridLayout from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

interface BookmarkedChat {
  id: string
  message: string
  response: any
  timestamp: string
  bookmarked: boolean
  originalIndex: number
}

interface LayoutItem {
  i: string
  x: number
  y: number
  w: number
  h: number
  static?: boolean
}

export default function DashboardPage() {
  const params = useParams()
  const { user } = useUser()
  const [bookmarkedChats, setBookmarkedChats] = useState<BookmarkedChat[]>([])
  const [layout, setLayout] = useState<LayoutItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [gridWidth, setGridWidth] = useState(1200)

  const connectionId = params.id as string
  const dbName = params.dbname as string

  const loadLayout = () => {
    try {
      const savedLayout = localStorage.getItem(`bookmark-layout-${connectionId}`)
      return savedLayout ? JSON.parse(savedLayout) : []
    } catch (error) {
      console.error('Error loading layout:', error)
      return []
    }
  }

  const saveLayout = (newLayout: LayoutItem[]) => {
    try {
      localStorage.setItem(`bookmark-layout-${connectionId}`, JSON.stringify(newLayout))
    } catch (error) {
      console.error('Error saving layout:', error)
    }
  }

  const fetchBookmarkedChats = async () => {
    try {
      setIsLoading(true)
      const chatHistory = await getChatHistory(connectionId)
      const bookmarked = chatHistory
        .filter(chat => chat.bookmarked)
        .map((chat, index) => ({
          ...chat,
          originalIndex: chatHistory.findIndex(c => c.id === chat.id)
        }))

      setBookmarkedChats(bookmarked)
      const savedLayout = loadLayout()

      const newLayout = bookmarked.map((chat, idx) => {
        const existingLayout = savedLayout.find((item: LayoutItem) => item.i === chat.id)
        if (existingLayout) return existingLayout
        return {
          i: chat.id,
          x: (idx % 3) * 4,
          y: Math.floor(idx / 3) * 4,
          w: 4,
          h: 4,
          static: false
        }
      })

      setLayout(newLayout)
      saveLayout(newLayout)
    } catch (error) {
      console.error('Error fetching bookmarked chats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateGridWidth = () => {
    setGridWidth(window.innerWidth - 80)
  }

  useEffect(() => {
    if (connectionId) fetchBookmarkedChats()
    updateGridWidth()
    window.addEventListener('resize', updateGridWidth)
    return () => window.removeEventListener('resize', updateGridWidth)
  }, [connectionId])

  const handleRemoveBookmark = async (id: string) => {
    try {
      const chatToRemove = bookmarkedChats.find(chat => chat.id === id)
      if (!chatToRemove) return
      await toggleBookmark(connectionId, chatToRemove.originalIndex)

      const updatedChats = bookmarkedChats.filter(chat => chat.id !== id)
      setBookmarkedChats(updatedChats)

      const newLayout = layout.filter(item => item.i !== id)
      setLayout(newLayout)
      saveLayout(newLayout)
    } catch (error) {
      console.error('Error removing bookmark:', error)
    }
  }

  const handleLayoutChange = (newLayout: LayoutItem[]) => {
    const updatedLayout = newLayout.map(item => {
      const existingItem = layout.find(existing => existing.i === item.i)
      if (existingItem &&
          (existingItem.x !== item.x ||
           existingItem.y !== item.y ||
           existingItem.w !== item.w ||
           existingItem.h !== item.h)) {
        return item
      }
      return existingItem || item
    })

    const validLayout = updatedLayout.filter(item =>
      item && item.i &&
      typeof item.x === 'number' &&
      typeof item.y === 'number' &&
      typeof item.w === 'number' &&
      typeof item.h === 'number'
    )

    setLayout(validLayout)
    saveLayout(validLayout)
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a] text-gray-200">
        <p className="text-xl font-semibold flex items-center gap-2">
          <Bookmark className="h-5 w-5 text-blue-400 animate-bounce" />
          Please sign in to continue
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 overflow-x-auto">
      <div className="min-w-full max-w-[98%] mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Bookmark className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Bookmarked Chats</h1>
            <p className="text-sm text-gray-400 mt-1">{dbName}</p>
          </div>
        </div>

        {bookmarkedChats.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-blue-500/20 rounded-xl">
            <p className="text-gray-400 mb-2">No bookmarked items found</p>
            <p className="text-sm text-blue-400/60">Bookmark important chats to access them here</p>
          </div>
        ) : (
          <GridLayout
            className="layout"
            layout={layout}
            onLayoutChange={handleLayoutChange}
            cols={12}
            rowHeight={30}
            width={gridWidth}
            margin={[20, 20]}
            compactType={null}            // 💡 Disable auto compaction
            preventCollision={true}       // 💡 Prevent pushing other cards
            autoSize={true}
            isDraggable={true}
            isResizable={true}
            useCSSTransforms={true}
            verticalCompact={false}
            draggableHandle=".drag-handle"
            style={{
              position: 'relative'
            }}
          >
            {bookmarkedChats.map(chat => (
              <div 
                key={chat.id}
                className="bg-[#111214]/90 border border-blue-500/20 rounded-xl p-4 relative group transition-all hover:border-blue-500/40"
              >
                <div className="drag-handle absolute top-0 left-0 right-0 h-8 cursor-move opacity-0 hover:opacity-100 transition-opacity">
                  <div className="absolute left-1/2 top-2 -translate-x-1/2 w-16 h-1 rounded-full bg-blue-500/30"></div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-3 right-3 z-50 text-gray-400 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg"
                  onClick={() => handleRemoveBookmark(chat.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
                
                <div className="flex flex-col h-full overflow-hidden space-y-4 pt-4">
                  <div className="flex-1 overflow-y-auto pr-2">
                    <div className="bg-blue-500/10 border border-blue-500/20 px-4 py-3 rounded-lg">
                      <ChatMessage
                        message={chat.message}
                        response={{}}
                        isUser
                        isLoading={false}
                      />
                    </div>
                    
                    <div className="mt-4 bg-[#0a0a0a] border border-blue-500/10 px-4 py-3 rounded-lg">
                      <ChatMessage
                        message=""
                        response={chat.response}
                        isUser={false}
                        onOptionClick={() => {}}
                        onSubmitResponse={() => {}}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-blue-500/10">
                    <p className="text-xs text-blue-400/60 text-right">
                      {new Date(chat.timestamp).toLocaleString('en-US', {
                        dateStyle: 'short',
                        timeStyle: 'short'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </GridLayout>
        )}
      </div>
    </div>
  )
}

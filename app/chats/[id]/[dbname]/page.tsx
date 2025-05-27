'use client'

import { useEffect, useState, useRef, KeyboardEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useFoldersStore } from '@/app/store/useFoldersStore'
import Sidebar from '@/app/_components/chat/Sidebar'
import { useUser } from '@clerk/nextjs'
import { submitChat, getChatHistory, toggleBookmark } from '@/app/actions/chat'
import ChatMessage from '@/app/_components/chat/ChatMessage'
import { Button } from '@/components/ui/button'
import { Copy, RefreshCw, Bookmark } from 'lucide-react'
import Link from 'next/link'

interface ChatMessageProps {
  message: string | {
    role?: string
    content?: string | {
      summary?: string
      details?: string[]
      metrics?: Record<string, number | string>
      visualization?: {
        chartType: string
        data: { label: string; value: number }[]
        config: {
          xAxis: { label: string; type: string }
          yAxis: { label: string; type: string }
          legend: boolean
          stacked: boolean
        }
      }
    }
    timestamp?: string
  }
  response?: any
  isUser?: boolean
  isLoading?: boolean
  onOptionClick?: (option: string) => void
  userQuery?: string
  onUserQueryChange?: (value: string) => void
  onSubmitResponse?: (response: string) => void
}

export default function ChatWithDbPage() {
 
  const params = useParams()
  const { user }         = useUser()
  const { setActiveConnection, loadFolders, folders } = useFoldersStore()
  const router = useRouter()

  const connectionId = params.id     as string
  const dbName       = params.dbname as string

  const [userQuery,   setUserQuery]   = useState('')
  const [isLoading,   setIsLoading]   = useState(false)
  const [chatHistory, setChatHistory] = useState<any[]>([])
  const [inputs,      setInputs]      = useState<Record<string, string>>({})
  const [copyOK,      setCopyOK]      = useState(false)
  const [dbUrl,       setDbUrl]       = useState('')
  const [isSyncing,   setIsSyncing]   = useState(false)
  const [isPredictiveMode, setIsPredictiveMode] = useState(false)

  const chatRef = useRef<HTMLDivElement>(null)

  
  useEffect(() => {
    if (user) loadFolders(user.id)
  }, [user, loadFolders])


  useEffect(() => {
    const connectionExists = folders.some(folder => 
      folder.connections.some(conn => conn.id === connectionId)
    )
    
    if (!connectionExists) {
      router.push('/stats')
    }
  }, [folders, connectionId, router])

  useEffect(() => {
    if (connectionId) setActiveConnection(connectionId)
  }, [connectionId, setActiveConnection])


  useEffect(() => {
    (async () => {
      if (!connectionId) return
      try {
        const hist = await getChatHistory(connectionId)

        const uniqueMessages = new Map()
        if (Array.isArray(hist)) {
          hist.forEach(msg => {
            if (msg.message) {
              // Only update if this message doesn't exist or if it has a response
              if (!uniqueMessages.has(msg.message) || 
                  (msg.response && Object.keys(msg.response).length > 0)) {
                uniqueMessages.set(msg.message, msg)
              }
            }
          })
        }
        setChatHistory(Array.from(uniqueMessages.values()))
      } catch {
        setChatHistory([])
      }
    })()
  }, [connectionId])


  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {

        const refreshChatHistory = async () => {
          try {
            const hist = await getChatHistory(connectionId)
            const uniqueMessages = new Map()
            if (Array.isArray(hist)) {
              hist.forEach(msg => {
                if (msg.message) {
                  if (!uniqueMessages.has(msg.message) || 
                      (msg.response && Object.keys(msg.response).length > 0)) {
                    uniqueMessages.set(msg.message, msg)
                  }
                }
              })
            }
            setChatHistory(Array.from(uniqueMessages.values()))
          } catch {
            setChatHistory([])
          }
        }
        refreshChatHistory()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [connectionId])

  // db url
  useEffect(() => {
    (async () => {
      if (!connectionId) return
      try {
        const r = await fetch(`/api/connections/${connectionId}/url`)
        const j = await r.json()
        if (j?.connectionUrl) setDbUrl(j.connectionUrl)
      } catch { /* ignore */ }
    })()
  }, [connectionId])

  // auto-scroll
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [chatHistory])

  /* ──────────────────────────────────────────────────────────
     HANDLERS
  ────────────────────────────────────────────────────────── */
  const handleSend = async (forced?: string) => {
    const q = (forced ?? userQuery).trim()
    if (!q) return

    // Check if this exact message already exists in chat history
    const messageExists = chatHistory.some(msg => msg.message === q)
    if (messageExists) return

    // optimistic user bubble
    const tempId = `tmp-${Date.now()}`
    setChatHistory(h => [...h, { id: tempId, message: q, response: {}, timestamp: new Date().toISOString() }])
    setUserQuery('')
    setIsLoading(true)

    try {
      // If predictive mode is enabled, force the task manager to use predictive agent
      const result = await submitChat(q, window.location.href, isPredictiveMode)
      setChatHistory(h =>
        h
          .filter(m => m.id !== tempId)
          .concat({ id: `${connectionId}-${Date.now()}`, message: q, response: result, timestamp: new Date().toISOString() })
      )
    } catch {
      setChatHistory(h =>
        h
          .filter(m => m.id !== tempId)
          .concat({ id: `${connectionId}-${Date.now()}`, message: q, response: { agentType: 'error', agentOutput: 'Something went wrong.' }, timestamp: new Date().toISOString() })
      )
    } finally {
      setIsLoading(false)
    }
  }

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const copyUrl = () => {
    if (!dbUrl) return
    navigator.clipboard.writeText(dbUrl).then(() => {
      setCopyOK(true); setTimeout(() => setCopyOK(false), 2000)
    })
  }

  const syncDB = async () => {
    setIsSyncing(true)
    try {
      const r = await fetch(`/api/connections/${connectionId}/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      await r.json()
    } catch { /* ignore */ } finally {
      setIsSyncing(false)
    }
  }

  const handleBookmarkToggle = async (index: number) => {
    try {
      // Get the actual chat entry at this index
      const chatEntry = chatHistory[index];
      if (!chatEntry || chatEntry.originalIndex === undefined) return;

      const newBookmarkStatus = await toggleBookmark(connectionId, chatEntry.originalIndex);
      
      // Update the local state with the new bookmark status
      setChatHistory(prev => prev.map((chat, idx) => 
        idx === index ? { ...chat, bookmarked: newBookmarkStatus } : chat
      ));
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  /* ──────────────────────────────────────────────────────────
     RENDER
  ────────────────────────────────────────────────────────── */
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a] text-gray-200">
        <p className="text-xl font-semibold">Please sign in to continue.</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-gray-200">
      <Sidebar />

      {/* main column */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* ─── HEADER ─────────────────────────────── */}
        <header className="sticky top-0 z-20 backdrop-blur border-b border-blue-500/20 px-4 py-3">
          <div className="max-w-3xl mx-auto flex flex-wrap gap-3 items-center justify-between">
            <h1 className="text-lg sm:text-xl font-semibold">Chat with <span className="text-blue-400">{dbName}</span></h1>

            <div className="flex gap-2">
              <Link 
                href={`/chats/${connectionId}/${dbName}/dashboard`}
                className="px-3 py-1.5 rounded-lg border border-blue-400/30 hover:bg-blue-500/10 text-sm flex items-center gap-1"
              >
                <Bookmark className="h-4 w-4" />
                Bookmarks
              </Link>

              <Button variant="outline" size="sm" onClick={copyUrl}
                className="border-blue-400/30 hover:bg-blue-500/10">
                <Copy className="h-4 w-4 mr-1" />
                {copyOK ? 'Copied' : 'Copy URL'}
              </Button>

              <Button variant="outline" size="sm" onClick={syncDB} disabled={isSyncing}
                className="relative border-blue-400/30 hover:bg-blue-500/10">
                <RefreshCw className={`h-4 w-4 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing…' : 'Sync DB'}
              </Button>
            </div>
          </div>
        </header>


        {/* ─── CHAT BODY ─────────────────────────── */}
        <section
          ref={chatRef}
          className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin scrollbar-thumb-blue-500/30 scrollbar-track-transparent">
          <div className="max-w-3xl mx-auto space-y-6">
            {chatHistory.length === 0 && (
              <div className="text-center py-10 px-6 rounded-xl bg-gradient-to-b from-blue-900/10 to-blue-900/5 border border-blue-500/20">
                <h3 className="text-lg font-medium text-blue-400 mb-2">Welcome to DataShorts</h3>
                <p className="text-gray-400 mb-3">No conversations yet. Ask anything about your database!</p>
                <div className="flex flex-wrap gap-2 justify-center text-sm">
                  <button 
                    className="px-3 py-1.5 rounded-lg bg-blue-900/20 hover:bg-blue-900/30 border border-blue-500/30 text-blue-300"
                    onClick={() => setUserQuery("What tables are in this database?")}
                  >
                    Show tables
                  </button>
                  <button 
                    className="px-3 py-1.5 rounded-lg bg-blue-900/20 hover:bg-blue-900/30 border border-blue-500/30 text-blue-300"
                    onClick={() => setUserQuery("How many users are in the database?")}
                  >
                    Count users
                  </button>
                  <button 
                    className="px-3 py-1.5 rounded-lg bg-blue-900/20 hover:bg-blue-900/30 border border-blue-500/30 text-blue-300"
                    onClick={() => setUserQuery("Show me a visualization of top data")}
                  >
                    Visualize data
                  </button>
                </div>
              </div>
            )}

            {chatHistory.map((chat, idx) => (
              <div key={idx} className="space-y-4">
                {/* user bubble */}
                <div className="self-end">
                  <ChatMessage
                    message={chat.message}
                    response={{}}
                    isUser
                    isLoading={false}
                  />
                </div>

                {/* bot bubble */}
                {chat.response && (
                  <div className="relative">
                    <div 
                      className="absolute top-3 right-3 z-10 text-blue-400 hover:text-blue-300 cursor-pointer transition-colors"
                      onClick={() => handleBookmarkToggle(idx)}
                    >
                      <Bookmark size={18} className={chat.bookmarked ? "fill-current" : ""} />
                    </div>
                    <ChatMessage
                      message=""
                      response={chat.response}
                      isUser={false}
                      onOptionClick={() => {}}
                      onSubmitResponse={handleSend}
                    />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-blue-400 px-4 py-3 bg-blue-900/10 w-fit rounded-xl border border-blue-500/20">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                <span className="text-sm font-medium ml-1">Thinking</span>
              </div>
            )}
          </div>
        </section>

        {/* ─── INPUT BAR ─────────────────────────── */}
        <footer className="sticky bottom-0 backdrop-blur border-t border-blue-500/20 px-4 py-3">
          <div className="max-w-3xl mx-auto flex gap-3">
            <div className="flex-1 flex gap-2">
              <textarea
                rows={2}
                className="flex-1 resize-none bg-[#0f1013] border border-blue-500/20 rounded-lg p-3 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 focus:outline-none placeholder-gray-500 text-gray-200 scrollbar-thin scrollbar-thumb-blue-500/30"
                placeholder="Ask something about your database…"
                value={userQuery}
                onChange={e => setUserQuery(e.target.value)}
                onKeyDown={onKey}
                disabled={isLoading}
              />
              <div className="flex flex-col justify-center">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={isPredictiveMode}
                    onChange={(e) => setIsPredictiveMode(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ml-2 text-sm font-medium text-gray-300">Predict</span>
                </label>
              </div>
            </div>

            <button
              onClick={() => handleSend()}
              disabled={isLoading || !userQuery.trim()}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-blue-600/90 to-blue-500/90 hover:from-blue-600 hover:to-blue-500 text-white transition shadow-md shadow-blue-500/10 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed">
              {isLoading ? '…' : 'Send'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
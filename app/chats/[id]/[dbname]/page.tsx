'use client'

import { useEffect, useState, useRef, KeyboardEvent } from 'react'
import { useParams } from 'next/navigation'
import { useFoldersStore } from '@/app/store/useFoldersStore'
import Sidebar from '@/app/_components/chat/Sidebar'
import { useUser } from '@clerk/nextjs'
import { submitChat, getChatHistory } from '@/app/actions/chat'
import ChatMessage from '@/app/_components/chat/ChatMessage'
import { Button } from '@/components/ui/button'
import { Copy, RefreshCw } from 'lucide-react'

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
  /* ──────────────────────────────────────────────────────────
     STATE
  ────────────────────────────────────────────────────────── */
  const params = useParams()
  const { user }         = useUser()
  const { setActiveConnection, loadFolders } = useFoldersStore()

  const connectionId = params.id     as string
  const dbName       = params.dbname as string

  const [userQuery,   setUserQuery]   = useState('')
  const [isLoading,   setIsLoading]   = useState(false)
  const [chatHistory, setChatHistory] = useState<any[]>([])
  const [inputs,      setInputs]      = useState<Record<string, string>>({})
  const [copyOK,      setCopyOK]      = useState(false)
  const [dbUrl,       setDbUrl]       = useState('')
  const [isSyncing,   setIsSyncing]   = useState(false)

  const chatRef = useRef<HTMLDivElement>(null)

  /* ──────────────────────────────────────────────────────────
     LIFECYCLE
  ────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (user) loadFolders(user.id)
  }, [user, loadFolders])

  useEffect(() => {
    if (connectionId) setActiveConnection(connectionId)
  }, [connectionId, setActiveConnection])

  // chat history
  useEffect(() => {
    (async () => {
      if (!connectionId) return
      try {
        const hist = await getChatHistory(connectionId)
        setChatHistory(Array.isArray(hist) ? hist : [])
      } catch {
        setChatHistory([])
      }
    })()
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

    // optimistic user bubble
    const tempId = `tmp-${Date.now()}`
    setChatHistory(h => [...h, { id: tempId, message: q, response: {}, timestamp: new Date().toISOString() }])
    setUserQuery('')
    setIsLoading(true)

    try {
      const result = await submitChat(q, window.location.href)
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
              <div className="text-center text-gray-400">No conversations yet. Ask anything!</div>
            )}

            {chatHistory.map((chat, idx) => (
              <div key={idx} className="space-y-4">
                {/* user bubble */}
                <div className="self-end bg-gradient-to-br from-blue-600/30 to-blue-600/10 border border-blue-500/30 px-4 py-3 rounded-2xl rounded-tr-none shadow-md">
                  <ChatMessage
                    message={chat.message}
                    response={{}}
                    isUser
                    isLoading={false}
                  />
                </div>

                {/* bot bubble */}
                {chat.response && (
                  <div className="bg-[#111214]/80 border border-blue-500/20 px-4 py-3 rounded-2xl rounded-tl-none shadow-lg">
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
              <div className="animate-pulse text-sm text-blue-400">Thinking…</div>
            )}
          </div>
        </section>

        {/* ─── INPUT BAR ─────────────────────────── */}
        <footer className="sticky bottom-0 backdrop-blur border-t border-blue-500/20 px-4 py-3">
          <div className="max-w-3xl mx-auto flex gap-3">
            <textarea
              rows={2}
              className="flex-1 resize-none bg-[#0a0a0a]/80 border border-blue-500/20 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400 scrollbar-thin scrollbar-thumb-blue-500/30"
              placeholder="Ask something about your database…"
              value={userQuery}
              onChange={e => setUserQuery(e.target.value)}
              onKeyDown={onKey}
              disabled={isLoading}
            />

            <button
              onClick={() => handleSend()}
              disabled={isLoading || !userQuery.trim()}
              className="px-5 py-2 rounded-lg border border-blue-500/40 bg-blue-600/20 hover:bg-blue-600/30 transition disabled:opacity-50">
              {isLoading ? '…' : 'Send'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}



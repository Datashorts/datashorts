'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useFoldersStore } from '@/app/store/useFoldersStore'
import Sidebar from '@/app/_components/chat/Sidebar'
import { useUser } from '@clerk/nextjs'
import { submitChat } from '@/app/actions/chat'

export default function ChatWithDbPage() {
  const params = useParams()
  const { user } = useUser()
  const { setActiveConnection, loadFolders } = useFoldersStore()
  
  const connectionId = params.id as string
  const dbName = params.dbname as string
  const [userQuery, setUserQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [chatResults, setChatResults] = useState<any>(null)
  const [showContext, setShowContext] = useState(false)
  
  useEffect(() => {
    if (user) {
      loadFolders(user.id)
    }
  }, [loadFolders, user])
  
  useEffect(() => {
    setActiveConnection(connectionId)
  }, [connectionId, setActiveConnection])
  
  const handleSubmit = async () => {
    if (!userQuery.trim()) return
    
    setIsLoading(true)
    try {
      const url = window.location.href
      const result = await submitChat(userQuery, url)
      setChatResults(result)
      setUserQuery('')
    } catch (error) {
      console.error('Error submitting chat:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }
  
  const formatDatabaseContext = (context: any) => {
    if (!context) return 'No database context available';
    
    return `Current database context:
Schema Information:
${context.schema.map((table: any) => 
  `Table: ${table.tableName}
   Columns: ${table.columns}`
).join('\n')}

Sample Data:
${context.sampleData.map((table: any) => 
  `Table: ${table.tableName}
   Data: ${JSON.stringify(table.sampleData, null, 2)}`
).join('\n\n')}`;
  }
  
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-gray-400">Please sign in to access your chats.</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <div className="h-16 border-b border-gray-800 flex items-center px-6">
          <h1 className="text-xl font-semibold">Chat with {dbName}</h1>
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-3xl mx-auto">
            <div className="bg-[#1a1a1a] p-6 rounded-lg border border-gray-800 mb-6">
              <h2 className="text-lg font-medium mb-2">Welcome to your chat with {dbName}</h2>
              <p className="text-gray-400">
                You can ask questions about your database and get instant answers.
              </p>
            </div>
            
            <div className="space-y-4">
              {/* Chat messages will go here */}
              {chatResults && (
                <div className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-800">
                  <h3 className="text-md font-medium mb-2">Query Results</h3>
                  <div className="text-sm text-gray-300 mb-2">
                    <p>Connection ID: {chatResults.connectionId}</p>
                    <p>Connection Name: {chatResults.connectionName}</p>
                  </div>
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-1">Matches:</h4>
                    <div className="max-h-60 overflow-y-auto">
                      {chatResults.matches.map((match: any, index: number) => (
                        <div key={index} className="text-xs bg-[#222] p-2 rounded mb-1">
                          <p>ID: {match.id}</p>
                          <p>Score: {match.score}</p>
                          <p>Type: {match.type}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {chatResults.context && (
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-medium">Database Context</h4>
                        <button 
                          onClick={() => setShowContext(!showContext)}
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          {showContext ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      {showContext && (
                        <div className="text-xs bg-[#222] p-3 rounded overflow-x-auto">
                          <pre className="whitespace-pre-wrap">
                            {formatDatabaseContext(chatResults.context)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-800 p-4">
          <div className="max-w-3xl mx-auto flex gap-2">
            <input
              type="text"
              placeholder="Ask a question about your data..."
              className="flex-1 bg-[#1a1a1a] border border-gray-700 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <button 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
              onClick={handleSubmit}
              disabled={isLoading || !userQuery.trim()}
            >
              {isLoading ? 'Processing...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 
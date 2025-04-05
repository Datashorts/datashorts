'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useFoldersStore } from '@/app/store/useFoldersStore'
import Sidebar from '@/app/_components/chat/Sidebar'
import { useUser } from '@clerk/nextjs'
import { submitChat, getChatHistory } from '@/app/actions/chat'

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
  const [chatHistory, setChatHistory] = useState<any[]>([])
  
  useEffect(() => {
    if (user) {
      loadFolders(user.id)
    }
  }, [loadFolders, user])
  
  useEffect(() => {
    setActiveConnection(connectionId)
  }, [connectionId, setActiveConnection])
  
  // Load chat history when component mounts
  useEffect(() => {
    const loadChatHistory = async () => {
      if (connectionId) {
        try {
          const history = await getChatHistory(connectionId)
          setChatHistory(history)
          console.log('Loaded chat history:', history)
        } catch (error) {
          console.error('Error loading chat history:', error)
        }
      }
    }
    
    loadChatHistory()
  }, [connectionId])
  
  const handleSubmit = async () => {
    if (!userQuery.trim()) return
    
    setIsLoading(true)
    try {
      const url = window.location.href
      const result = await submitChat(userQuery, url)
      setChatResults(result)
      
      // Add the new chat to the history
      const newChat = {
        id: Date.now(),
        message: userQuery,
        response: JSON.stringify(result),
        timestamp: new Date().toISOString(),
        connectionId
      }
      
      setChatHistory(prevHistory => [...prevHistory, newChat])
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
              {/* Chat History */}
              {chatHistory.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-md font-medium mb-3">Chat History</h3>
                  <div className="space-y-4">
                    {chatHistory.map((chat, index) => {
                      // Parse the response JSON if it's a string
                      const responseData = typeof chat.response === 'string' 
                        ? JSON.parse(chat.response) 
                        : chat.response;
                      
                      return (
                        <div key={chat.id || index} className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-800">
                          <div className="flex justify-between items-start mb-2">
                            <div className="text-sm text-gray-400">
                              {new Date(chat.timestamp).toLocaleString()}
                            </div>
                          </div>
                          
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-300">You:</p>
                            <p className="text-sm text-white">{chat.message}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium text-gray-300">Response:</p>
                            <div className="text-sm text-white">
                              {/* Agent Response Section */}
                              {responseData.agentOutput && (
                                <div className="mt-2 mb-2 p-2 bg-[#222] rounded">
                                  <p className="text-xs text-gray-400 mb-1">Agent: {responseData.agentType}</p>
                                  
                                  {responseData.agentType === 'inquire' && (
                                    <>
                                      <p className="font-medium">{responseData.agentOutput.question}</p>
                                      <p className="text-xs text-gray-400">{responseData.agentOutput.context}</p>
                                      
                                      {responseData.agentOutput.options && responseData.agentOutput.options.length > 0 && (
                                        <div className="mt-2">
                                          <p className="text-xs text-gray-400 mb-1">Suggested options:</p>
                                          <div className="flex flex-wrap gap-2">
                                            {responseData.agentOutput.options.map((option, idx) => (
                                              <span key={idx} className="text-xs bg-[#333] px-2 py-1 rounded">
                                                {option}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Current Query Results */}
              {chatResults && (
                <div className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-800">
                  <h3 className="text-md font-medium mb-2">Query Results</h3>
                  <div className="text-sm text-gray-300 mb-2">
                    <p>Connection ID: {chatResults.connectionId}</p>
                    <p>Connection Name: {chatResults.connectionName}</p>
                  </div>
                  
                  {/* Agent Response Section */}
                  {chatResults.agentOutput && (
                    <div className="mt-4 mb-4 p-3 bg-[#222] rounded-lg">
                      <h4 className="text-sm font-medium mb-2">Agent Response</h4>
                      <div className="bg-[#2a2a2a] p-3 rounded">
                        <p className="text-xs text-gray-400 mb-2">Agent: {chatResults.agentType}</p>
                        
                        {chatResults.agentType === 'inquire' && (
                          <>
                            <p className="text-sm font-medium mb-2">{chatResults.agentOutput.question}</p>
                            <p className="text-xs text-gray-400 mb-3">{chatResults.agentOutput.context}</p>
                            
                            {chatResults.agentOutput.options && chatResults.agentOutput.options.length > 0 && (
                              <div className="mb-3">
                                <p className="text-xs text-gray-400 mb-1">Suggested options:</p>
                                <div className="flex flex-wrap gap-2">
                                  {chatResults.agentOutput.options.map((option, index) => (
                                    <button 
                                      key={index}
                                      className="text-xs bg-[#333] hover:bg-[#444] px-3 py-1 rounded"
                                      onClick={() => setUserQuery(option)}
                                    >
                                      {option}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {chatResults.agentOutput.allowCustomInput && (
                              <div className="mt-2">
                                <p className="text-xs text-gray-400 mb-1">Or provide your own answer:</p>
                                <input
                                  type={chatResults.agentOutput.inputType || "text"}
                                  className="w-full bg-[#333] text-white text-sm p-2 rounded"
                                  placeholder="Type your answer here..."
                                  value={userQuery}
                                  onChange={(e) => setUserQuery(e.target.value)}
                                />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Log database context to console instead of displaying it */}
                  {chatResults.context && (
                    <div className="hidden">
                      {console.log('Current Query Database Context:', formatDatabaseContext(chatResults.context))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-800 p-4">
          <div className="max-w-3xl mx-auto flex gap-2">
            <textarea
              className="flex-1 bg-[#1a1a1a] text-white p-3 rounded-lg border border-gray-800 resize-none"
              placeholder="Ask a question about your database..."
              rows={2}
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
              onClick={handleSubmit}
              disabled={isLoading || !userQuery.trim()}
            >
              {isLoading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 
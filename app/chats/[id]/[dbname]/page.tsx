'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useFoldersStore } from '@/app/store/useFoldersStore'
import Sidebar from '@/app/_components/chat/Sidebar'
import { useUser } from '@clerk/nextjs'
import { submitChat, getChatHistory } from '@/app/actions/chat'
import AgentResponse from '@/app/_components/chat/AgentResponse'
import ChatMessage from '@/app/_components/chat/ChatMessage'

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
  const [messageInputs, setMessageInputs] = useState<Record<string, string>>({})
  const chatContainerRef = useRef<HTMLDivElement>(null)
  
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
          console.log('Raw chat history:', history)
          
          // Check if history is an array and has the expected structure
          if (Array.isArray(history) && history.length > 0) {
            console.log('First chat item:', history[0])
            setChatHistory(history)
          } else {
            console.log('Chat history is empty or not in the expected format')
            setChatHistory([])
          }
        } catch (error) {
          console.error('Error loading chat history:', error)
          setChatHistory([])
        }
      }
    }
    
    loadChatHistory()
  }, [connectionId])
  
  // Scroll to bottom when chat history or current results change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, chatResults]);
  
  const handleSubmit = async () => {
    if (!userQuery.trim()) return
    
    setIsLoading(true)
    
    // Create a temporary user message to display immediately
    const tempUserMessage = {
      id: `temp-${Date.now()}`,
      message: userQuery,
      response: {},
      timestamp: new Date().toISOString(),
      connectionId
    };
    
    // Add the temporary message to the chat history
    setChatHistory(prev => [...prev, tempUserMessage]);
    
    // Clear the input field immediately
    setUserQuery('');
    
    try {
      const url = window.location.href
      const result = await submitChat(userQuery, url)
      
      // Update the chat history with the real response
      setChatHistory(prev => {
        // Remove the temporary message
        const filteredHistory = prev.filter(msg => msg.id !== tempUserMessage.id);
        
        // Add the real message and response
        return [...filteredHistory, {
          id: `${connectionId}-${Date.now()}`,
          message: tempUserMessage.message,
          response: result,
          timestamp: new Date().toISOString(),
          connectionId
        }];
      });
    } catch (error) {
      console.error('Error submitting chat:', error)
      
      // Update the chat history to show the error
      setChatHistory(prev => {
        // Remove the temporary message
        const filteredHistory = prev.filter(msg => msg.id !== tempUserMessage.id);
        
        // Add the error message
        return [...filteredHistory, {
          id: `${connectionId}-${Date.now()}`,
          message: tempUserMessage.message,
          response: {
            agentType: 'error',
            agentOutput: 'An error occurred while processing your request.'
          },
          timestamp: new Date().toISOString(),
          connectionId
        }];
      });
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
  
  const handleOptionClick = (option: string) => {
    setUserQuery(option)
  }
  
  const handleMessageInputChange = (messageId: string, value: string) => {
    setMessageInputs(prev => ({
      ...prev,
      [messageId]: value
    }))
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
        
        <div className="flex-1 p-6 overflow-y-auto" ref={chatContainerRef}>
          <div className="max-w-3xl mx-auto">
            <div className="bg-[#1a1a1a] p-6 rounded-lg border border-gray-800 mb-6">
              <h2 className="text-lg font-medium mb-2">Welcome to your chat with {dbName}</h2>
              <p className="text-gray-400">
                You can ask questions about your database and get instant answers.
              </p>
            </div>
            
            <div className="space-y-4">
              {/* Display chat history */}
              {chatHistory && chatHistory.length > 0 ? (
                <div className="space-y-4">
                  {chatHistory.map((chat, index) => (
                    <div key={index} className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-800">
                      {/* User message */}
                      <ChatMessage 
                        message={chat.message || ''}
                        response={chat.response || {}}
                        timestamp={chat.timestamp || new Date().toISOString()}
                        isUser={true}
                        userQuery={messageInputs[chat.id] || ''}
                        onUserQueryChange={(value) => handleMessageInputChange(chat.id, value)}
                      />
                      
                      {/* Agent response */}
                      <ChatMessage 
                        message=""
                        response={chat.response || {}}
                        timestamp={chat.timestamp || new Date().toISOString()}
                        isUser={false}
                        onOptionClick={handleOptionClick}
                        userQuery={messageInputs[chat.id] || ''}
                        onUserQueryChange={(value) => handleMessageInputChange(chat.id, value)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-4">
                  No previous conversations found. Start a new conversation!
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
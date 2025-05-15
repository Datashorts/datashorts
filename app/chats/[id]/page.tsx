'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Sidebar from '@/app/_components/chat/Sidebar'
import { useFoldersStore } from '@/app/store/useFoldersStore'
import { useUser } from '@clerk/nextjs'
import { Send, Loader2, DatabaseIcon, MessageSquareText } from 'lucide-react'

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export default function ChatPage() {
  const params = useParams()
  const { user } = useUser()
  const { setActiveConnection, loadFolders } = useFoldersStore()
  const chatId = params.id as string
  
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! How can I help you with your database today?',
      isUser: false,
      timestamp: new Date()
    }
  ])

  useEffect(() => {
    // Set the active connection based on the chat ID
    setActiveConnection(chatId)
    
    // Load folders if user is authenticated
    if (user) {
      loadFolders(user.id)
    }
  }, [chatId, setActiveConnection, loadFolders, user])

  const handleSendMessage = () => {
    if (!input.trim()) return;
    
    // Create new user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      isUser: true,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    // Simulate AI response
    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm analyzing your query. Let me check the database for that information.",
        isUser: false,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
      setIsLoading(false);
    }, 1500);
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="text-center bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full">
          <div className="w-16 h-16 bg-gray-700 rounded-full mx-auto mb-6 flex items-center justify-center">
            <DatabaseIcon size={32} className="text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold mb-3 text-white">Authentication Required</h1>
          <p className="text-gray-400 mb-6">Please sign in with your account to access the database chat interface.</p>
          <button className="bg-indigo-600 hover:bg-indigo-700 w-full py-2 px-4 rounded-lg text-white font-medium transition duration-200">
            Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-6 py-4 border-b border-gray-800 bg-gray-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <DatabaseIcon size={18} className="text-white" />
            </div>
            <h1 className="text-xl font-semibold text-white">Database Chat</h1>
          </div>
          <div className="flex items-center space-x-2">
            <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full font-medium">
              Connected
            </span>
          </div>
        </header>

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
          <div className="max-w-3xl mx-auto space-y-4 pb-4">
            {/* Welcome Card */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-750 p-5 rounded-xl border border-gray-700 shadow-lg mb-6">
              <div className="flex items-center space-x-3 mb-3">
                <div className="bg-indigo-500/20 p-2 rounded-lg">
                  <MessageSquareText size={20} className="text-indigo-400" />
                </div>
                <h2 className="text-lg font-medium text-white">Welcome to Database Chat</h2>
              </div>
              <p className="text-gray-300">
                Ask questions about your data in natural language. I can help you query, analyze, and visualize information from your connected database.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 rounded-lg text-sm transition">
                  Show all tables
                </button>
                <button className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 rounded-lg text-sm transition">
                  Recent queries
                </button>
                <button className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 rounded-lg text-sm transition">
                  Database schema
                </button>
              </div>
            </div>

            {/* Messages */}
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`${
                  message.isUser 
                    ? 'ml-auto bg-indigo-600 text-white rounded-tl-xl rounded-bl-xl rounded-tr-sm' 
                    : 'mr-auto bg-gray-800 text-gray-200 rounded-tr-xl rounded-br-xl rounded-tl-sm'
                } max-w-[80%] p-4 shadow-md border ${message.isUser ? 'border-indigo-700' : 'border-gray-700'}`}
              >
                <p>{message.content}</p>
                <div className={`text-xs mt-2 ${message.isUser ? 'text-indigo-200' : 'text-gray-400'}`}>
                  {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-center space-x-2 text-gray-400 p-3 bg-gray-800/50 rounded-lg w-fit">
                <Loader2 size={16} className="animate-spin" />
                <span>Generating response...</span>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-800 bg-gray-900">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-center">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about your database..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 pr-12 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none h-12 leading-5 overflow-hidden"
                style={{ maxHeight: '120px', minHeight: '48px' }}
                rows={1}
              />
              <button 
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className={`absolute right-3 rounded-lg p-1.5 ${
                  input.trim() && !isLoading 
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                } transition-colors duration-200`}
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500 px-2">
              Press Enter to send, Shift+Enter for new line
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
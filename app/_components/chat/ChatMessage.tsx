'use client'

import React from 'react'
import AgentResponse      from './AgentResponse'
import ResearcherResponse from './ResearcherResponse'
import { Bot, Loader2 }   from 'lucide-react'
import { UserButton }     from '@clerk/nextjs'

interface ChatMessageProps {
  message: string | {
    role?: string
    content?: any
    timestamp?: string
  }
  response?: any
  isUser?: boolean
  isLoading?: boolean
  onOptionClick?: (opt: string) => void
  userQuery?: string
  onUserQueryChange?: (v: string) => void
  onSubmitResponse?: (v: string) => void
}

/* ──────────────────────────────────────────────────────────
   Utils
─────────────────────────────────────────────────────────── */
const fmt = (ts?: string) =>
  ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''

/* ──────────────────────────────────────────────────────────
   Bubble components
─────────────────────────────────────────────────────────── */
const UserBubble: React.FC<{ msg: string; time: string }> = ({ msg, time }) => (
  <div className="flex justify-end mb-5">
    <div className="relative w-fit max-w-[80%] bg-blue-600/90 text-white px-4 py-3 rounded-2xl rounded-tr-none shadow-lg shadow-blue-500/10">
      <div className="absolute -top-3 -right-3">
        <UserButton afterSignOutUrl="/" />
      </div>
      <p className="text-sm whitespace-pre-wrap break-words">{msg}</p>
      {time && <p className="text-[10px] text-blue-200 mt-1">{time}</p>}
    </div>
  </div>
)

const BotBubble: React.FC<{ time: string; loading?: boolean; children: React.ReactNode }> = ({
  time,
  loading,
  children,
}) => (
  <div className="flex justify-start mb-5">
    <div className="relative w-fit max-w-[80%] bg-[#111214]/90 rounded-2xl rounded-tl-none px-4 py-3 shadow-lg shadow-blue-500/5 text-gray-200">
      <div className="absolute -top-3 -left-3">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
          <Bot size={16} className="text-white" />
        </div>
      </div>

      {time && <p className="text-[10px] text-gray-400 mb-2">{time}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Processing…</span>
        </div>
      ) : (
        children
      )}
    </div>
  </div>
)

/* ──────────────────────────────────────────────────────────
   Main component
─────────────────────────────────────────────────────────── */
const ChatMessage: React.FC<ChatMessageProps> = (props) => {
  const {
    message,
    response,
    isUser,
    isLoading = false,
    onOptionClick,
    userQuery,
    onUserQueryChange,
    onSubmitResponse,
  } = props

  console.log("ChatMessage received:", { message, response, isUser });

  /* Handle legacy / mixed props */
  if (typeof message === 'string' || isUser !== undefined) {
    const usr  = typeof message === 'string' ? isUser : message.role === 'user'
    const text = typeof message === 'string' ? message : message.content
    const time = fmt(typeof message === 'string' ? '' : message.timestamp)

    if (usr) {
      return <UserBubble msg={String(text)} time={time} />
    }

    console.log("Rendering bot response:", { response, text });
    
    return (
      <BotBubble time={time} loading={isLoading}>
        {/* FIXED: Route pipeline2 to AgentResponse, not ResearcherResponse */}
        {response?.agentType === 'pipeline2' ? (
          <AgentResponse
            agentType={response.agentType}
            agentOutput={response.agentOutput}
            onOptionClick={onOptionClick}
            userQuery={userQuery}
            onUserQueryChange={onUserQueryChange}
            onSubmitResponse={onSubmitResponse}
          />
        ) : response?.agentType === 'researcher' ? (
          <ResearcherResponse
            content={response.agentOutput?.data?.results || response.agentOutput}
            visualization={response.agentOutput?.data?.results?.visualization || response.agentOutput?.visualization}
          />
        ) : response?.agentType ? (
          <AgentResponse
            agentType={response.agentType}
            agentOutput={response.agentOutput}
            onOptionClick={onOptionClick}
            userQuery={userQuery}
            onUserQueryChange={onUserQueryChange}
            onSubmitResponse={onSubmitResponse}
          />
        ) : (
          <p className="whitespace-pre-wrap break-words">{String(text)}</p>
        )}
      </BotBubble>
    )
  }

  /* Object-based message */
  const time = fmt(message.timestamp)

  if (message.role === 'user') {
    return <UserBubble msg={String(message.content)} time={time} />
  }

  return (
    <BotBubble time={time} loading={isLoading}>
      {typeof message.content === 'string' ? (
        <AgentResponse
          agentType="analyze"
          agentOutput={{ analysis: message.content }}
          onSubmitResponse={onSubmitResponse}
        />
      ) : (
        <ResearcherResponse
          content={message.content || {}}
          visualization={message.content?.visualization}
        />
      )}
    </BotBubble>
  )
}

export default ChatMessage
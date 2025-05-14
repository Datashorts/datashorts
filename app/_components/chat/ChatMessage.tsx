import React from 'react';
import AgentResponse from './AgentResponse';
import ResearcherResponse from './ResearcherResponse';
import { Bot, Loader2 } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';

interface ChatMessageProps {
  message: string | {
    role?: string;
    content?: string | {
      summary?: string;
      details?: string[];
      metrics?: Record<string, number | string>;
      visualization?: {
        chartType: string;
        data: Array<{
          label: string;
          value: number;
        }>;
        config: {
          xAxis: {
            label: string;
            type: string;
          };
          yAxis: {
            label: string;
            type: string;
          };
          legend: boolean;
          stacked: boolean;
        };
      };
    };
    timestamp?: string;
  };
  response?: any;
  isUser?: boolean;
  isLoading?: boolean;
  onOptionClick?: (option: string) => void;
  userQuery?: string;
  onUserQueryChange?: (value: string) => void;
  onSubmitResponse?: (response: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  response,
  isUser,
  isLoading = false,
  onOptionClick,
  userQuery,
  onUserQueryChange,
  onSubmitResponse,
}) => {
  // Handle legacy format where message is a string and isUser is used
  if (typeof message === 'string' || isUser !== undefined) {
    const isUserMessage = typeof message === 'string' ? isUser : message.role === 'user';
    const messageContent = typeof message === 'string' ? message : message.content;
    const timestamp = typeof message === 'string' ? '' : message.timestamp;
    
    const formattedTime = timestamp 
      ? new Date(timestamp).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      : '';
    
    if (isUserMessage) {
      return (
        <div className="flex justify-end mb-4">
          <div className="max-w-[90%] sm:max-w-[85%] md:max-w-[75%] bg-[#0a0a0a] text-gray-200 p-3 sm:p-4 rounded-lg rounded-tr-none relative shadow-lg border border-blue-500/30">
            <div className="absolute -top-3 -right-3">
              <UserButton afterSignOutUrl="/" />
            </div>
            <p className="text-sm sm:text-base whitespace-pre-wrap break-words">
              {typeof messageContent === 'string' ? messageContent : JSON.stringify(messageContent)}
            </p>
            <p className="text-xs text-blue-400 mt-2">{formattedTime}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-[90%] sm:max-w-[85%] md:max-w-[75%] bg-[#0a0a0a] p-3 sm:p-4 rounded-lg rounded-tl-none relative shadow-lg border border-blue-500/20">
          <div className="absolute -top-3 -left-3">
            <div className="w-8 h-8 bg-[#0a0a0a] rounded-full flex items-center justify-center shadow-md border border-blue-500/30">
              <Bot size={16} className="text-blue-500" />
            </div>
          </div>
          <div className="flex items-center mb-2">
            <p className="text-xs text-gray-400">{formattedTime}</p>
          </div>
          
          {isLoading ? (
            <div className="flex items-center space-x-2 text-gray-300">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <span>Processing your request...</span>
            </div>
          ) : response && response.agentType === 'researcher' ? (
            <ResearcherResponse
              content={response.agentOutput}
              visualization={response.agentOutput.visualization}
            />
          ) : response && response.agentType ? (
            <AgentResponse
              agentType={response.agentType}
              agentOutput={response.agentOutput}
              onOptionClick={onOptionClick}
              userQuery={userQuery}
              onUserQueryChange={onUserQueryChange}
              onSubmitResponse={onSubmitResponse}
            />
          ) : (
            <p className="text-gray-300 text-sm sm:text-base whitespace-pre-wrap break-words">{typeof messageContent === 'string' ? messageContent : JSON.stringify(messageContent)}</p>
          )}
        </div>
      </div>
    );
  }

  // Handle new format with role and content
  const formattedTime = message.timestamp 
    ? new Date(message.timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    : '';

  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[80%] bg-blue-600 text-white p-3 rounded-lg rounded-tr-lg relative">
          <div className="absolute -top-3 -right-3">
            <UserButton afterSignOutUrl="/" />
          </div>
          <p className="text-sm">{typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}</p>
          <p className="text-xs text-blue-200 mt-1">{formattedTime}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[80%] bg-[#222] p-3 rounded-lg rounded-tl-lg relative">
        <div className="absolute -top-3 -left-3">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
            <Bot size={16} className="text-white" />
          </div>
        </div>
        <div className="flex items-center mb-2">
          <p className="text-xs text-gray-400">{formattedTime}</p>
        </div>
        
        {isLoading ? (
          <div className="flex items-center space-x-2 text-gray-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Processing your request...</span>
          </div>
        ) : typeof message.content === 'string' ? (
          <AgentResponse
            agentType="text"
            agentOutput={message.content}
            userQuery={userQuery}
            onUserQueryChange={onUserQueryChange}
            onSubmitResponse={onSubmitResponse}
          />
        ) : (
          <ResearcherResponse
            content={message.content || {}}
            visualization={message.content?.visualization}
          />
        )}
      </div>
    </div>
  );
};

export default ChatMessage; 
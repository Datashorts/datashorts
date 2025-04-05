import React from 'react';
import AgentResponse from './AgentResponse';
import { Bot } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';

interface ChatMessageProps {
  message: string;
  response: any;
  timestamp: string;
  isUser: boolean;
  onOptionClick?: (option: string) => void;
  userQuery?: string;
  onUserQueryChange?: (value: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  response,
  timestamp,
  isUser,
  onOptionClick,
  userQuery,
  onUserQueryChange
}) => {
  const formattedTime = new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[80%] bg-blue-600 text-white p-3 rounded-lg rounded-tr-lg relative">
          <div className="absolute -top-3 -right-3">
            <UserButton afterSignOutUrl="/" />
          </div>
          <p className="text-sm">{message}</p>
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
        
        {response.agentOutput && (
          <AgentResponse 
            agentType={response.agentType}
            agentOutput={response.agentOutput}
            onOptionClick={onOptionClick}
            userQuery={userQuery}
            onUserQueryChange={onUserQueryChange}
          />
        )}
      </div>
    </div>
  );
};

export default ChatMessage; 
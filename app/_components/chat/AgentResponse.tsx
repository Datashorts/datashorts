import React from 'react';

interface AgentResponseProps {
  agentType: string;
  agentOutput: any;
  onOptionClick?: (option: string) => void;
  userQuery?: string;
  onUserQueryChange?: (value: string) => void;
}

const AgentResponse: React.FC<AgentResponseProps> = ({
  agentType,
  agentOutput,
  onOptionClick,
  userQuery = '',
  onUserQueryChange
}) => {
  if (!agentOutput) return null;

  // Render different agent types
  switch (agentType) {
    case 'inquire':
      return (
        <div>
          <p className="font-medium">{agentOutput.question}</p>
          <p className="text-xs text-gray-400 mb-2">{agentOutput.context}</p>
          
          {agentOutput.options && agentOutput.options.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-gray-400 mb-1">Suggested options:</p>
              <div className="flex flex-wrap gap-2">
                {agentOutput.options.map((option: string, idx: number) => (
                  <button 
                    key={idx} 
                    className="text-xs bg-[#333] hover:bg-[#444] px-2 py-1 rounded"
                    onClick={() => onOptionClick && onOptionClick(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {agentOutput.allowCustomInput && onUserQueryChange && (
            <div className="mt-2">
              <p className="text-xs text-gray-400 mb-1">Or provide your own answer:</p>
              <input
                type={agentOutput.inputType || "text"}
                className="w-full bg-[#333] text-white text-sm p-2 rounded"
                placeholder="Type your answer here..."
                value={userQuery}
                onChange={(e) => onUserQueryChange(e.target.value)}
              />
            </div>
          )}
        </div>
      );
    
    case 'analyze':
      return (
        <div>
          <p className="font-medium">{agentOutput.analysis || 'Analysis in progress...'}</p>
        </div>
      );
    
    case 'visualize':
      return (
        <div>
          <p className="font-medium">{agentOutput.visualization || 'Visualization in progress...'}</p>
        </div>
      );
    
    default:
      return (
        <div>
          <p className="font-medium">Processing your request...</p>
        </div>
      );
  }
};

export default AgentResponse; 
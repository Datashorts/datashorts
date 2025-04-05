import React, { useState, useEffect } from 'react';

interface AgentResponseProps {
  agentType: string;
  agentOutput: any;
  onOptionClick?: (option: string) => void;
  userQuery?: string;
  onUserQueryChange?: (value: string) => void;
  onSubmitResponse?: (response: string) => void;
}

const AgentResponse: React.FC<AgentResponseProps> = ({
  agentType,
  agentOutput,
  onOptionClick,
  userQuery = '',
  onUserQueryChange,
  onSubmitResponse
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState<string>(userQuery);
  
  // Update customInput when userQuery changes
  useEffect(() => {
    setCustomInput(userQuery);
  }, [userQuery]);
  
  if (!agentOutput) return null;

  // Handle option selection
  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
    if (onOptionClick) {
      onOptionClick(option);
    }
  };
  
  // Handle custom input change
  const handleCustomInputChange = (value: string) => {
    setCustomInput(value);
    if (onUserQueryChange) {
      onUserQueryChange(value);
    }
  };
  
  // Handle submit button click
  const handleSubmit = () => {
    if (onSubmitResponse) {
      onSubmitResponse(selectedOption || customInput);
    }
  };
  
  // Determine if submit button should be enabled
  const isSubmitEnabled = selectedOption !== null || (customInput && customInput.trim() !== '');

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
                    className={`text-xs px-2 py-1 rounded ${
                      selectedOption === option 
                        ? 'bg-blue-600 hover:bg-blue-700' 
                        : 'bg-[#333] hover:bg-[#444]'
                    }`}
                    onClick={() => handleOptionSelect(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {agentOutput.allowCustomInput && (
            <div className="mt-2">
              <p className="text-xs text-gray-400 mb-1">Or provide your own answer:</p>
              <input
                type={agentOutput.inputType || "text"}
                className="w-full bg-[#333] text-white text-sm p-2 rounded"
                placeholder="Type your answer here..."
                value={customInput}
                onChange={(e) => handleCustomInputChange(e.target.value)}
              />
            </div>
          )}
          
          {onSubmitResponse && (
            <div className="mt-3">
              <button
                className={`w-full py-2 px-4 rounded ${
                  isSubmitEnabled 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-gray-700 cursor-not-allowed'
                }`}
                onClick={handleSubmit}
                disabled={!isSubmitEnabled}
              >
                Submit Response
              </button>
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
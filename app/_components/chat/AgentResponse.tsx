import React, { useState, useEffect } from 'react';
import { Bot, Send, User } from 'lucide-react';
import VisualizationRenderer from '@/components/VisualizationRenderer';
import ResearcherResponse from './ResearcherResponse';
import PieChart from '@/components/PieChart';
import BarChart from '@/components/BarChart';

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
  userQuery,
  onUserQueryChange,
  onSubmitResponse
}) => {
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [customInput, setCustomInput] = useState<string>('');
  const [isSubmitEnabled, setIsSubmitEnabled] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Enable submit button if an option is selected or custom input is provided
    setIsSubmitEnabled(selectedOption !== '' || customInput.trim() !== '');
  }, [selectedOption, customInput]);

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
    setCustomInput(''); // Clear custom input when an option is selected
  };

  const handleCustomInputChange = (value: string) => {
    setCustomInput(value);
    setSelectedOption(''); // Clear selected option when custom input is provided
  };

  const handleSubmit = () => {
    if (onSubmitResponse) {
      onSubmitResponse(selectedOption || customInput);
    }
  };

  // Render different agent types
  switch (agentType) {
    case 'multi':
      return (
        <div className="space-y-6">
          <div className="bg-[#2a2a2a] p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Overview</h3>
            <p className="text-gray-300">{agentOutput.summary}</p>
            {agentOutput.details && agentOutput.details.length > 0 && (
              <ul className="list-disc pl-5 mt-2 space-y-1">
                {agentOutput.details.map((detail: string, index: number) => (
                  <li key={index} className="text-gray-300">{detail}</li>
                ))}
              </ul>
            )}
          </div>
          
          {agentOutput.tasks && agentOutput.tasks.map((task: any, index: number) => (
            <div key={index} className="bg-[#2a2a2a] p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-2">
                {task.agentType.charAt(0).toUpperCase() + task.agentType.slice(1)} Response
              </h3>
              <p className="text-sm text-gray-400 mb-2">Query: {task.query}</p>
              
              {task.agentType === 'researcher' && (
                <ResearcherResponse
                  content={task.response}
                  visualization={task.response.visualization}
                />
              )}
              
              {task.agentType === 'visualize' && (
                <div>
                  <VisualizationRenderer visualization={task.response.visualization} />
                  {task.response.content && (
                    <div className="mt-4">
                      <p className="text-gray-300">{task.response.content.summary}</p>
                      {task.response.content.details && (
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                          {task.response.content.details.map((detail: string, idx: number) => (
                            <li key={idx} className="text-gray-300">{detail}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {task.agentType === 'inquire' && (
                <div>
                  <p className="font-medium">{task.response.question}</p>
                  <p className="text-xs text-gray-400 mb-2">{task.response.context}</p>
                  
                  {task.response.options && task.response.options.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-400 mb-1">Suggested options:</p>
                      <div className="flex flex-wrap gap-2">
                        {task.response.options.map((option: string, idx: number) => (
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
                </div>
              )}
            </div>
          ))}
        </div>
      );
    
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
      console.log("Visualize agent output:", agentOutput);
      
      // Check if agentOutput is a string (JSON) and parse it
      let parsedOutput = agentOutput;
      if (typeof agentOutput === 'string') {
        try {
          parsedOutput = JSON.parse(agentOutput);
          console.log("Parsed agent output:", parsedOutput);
        } catch (error) {
          console.error("Error parsing agent output:", error);
          return <div>Error parsing visualization data</div>;
        }
      }
      
      // Check if the output has the expected structure
      if (!parsedOutput.visualization) {
        console.error("Missing visualization data in agent output");
        return <div>No visualization data available</div>;
      }
      
      return (
        <div className="space-y-4">
          {parsedOutput.content &&
            <>
              <div className="bg-[#2a2a2a] p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-2">{parsedOutput.content.title || 'Visualization'}</h3>
                <p className="text-gray-300">{parsedOutput.content.summary}</p>
              </div>
              
              {parsedOutput.content.details && parsedOutput.content.details.length > 0 && (
                <div className="bg-[#2a2a2a] p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-2">Details</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {parsedOutput.content.details.map((detail: string, index: number) => (
                      <li key={index} className="text-gray-300">{detail}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {parsedOutput.content.metrics && Object.keys(parsedOutput.content.metrics).length > 0 && (
                <div className="bg-[#2a2a2a] p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-2">Metrics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(parsedOutput.content.metrics).map(([key, value], index) => (
                      <div key={index} className="bg-[#333] p-3 rounded">
                        <p className="text-sm text-gray-400">{key}</p>
                        <p className="text-lg font-medium">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          }
          
          {parsedOutput.visualization && (
            <div className="bg-[#2a2a2a] p-4 rounded-lg">
              <VisualizationRenderer visualization={parsedOutput.visualization} />
            </div>
          )}
        </div>
      );
    
    case 'pipeline2':
      return (
        <div className="space-y-4">
          {/* Task Manager Result */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Task Analysis</h3>
            <p className="text-sm text-gray-600">{agentOutput.taskResult?.reason}</p>
          </div>

          {/* Analysis Result */}
          {agentOutput.analysisResult && (
            <div className="space-y-4">
              {agentOutput.taskResult?.next === 'visualizer' ? (
                // Visualizer Output Format
                <>
                  {/* Content Section */}
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h2 className="text-2xl font-bold mb-4">{agentOutput.analysisResult.content.title}</h2>
                    <p className="text-gray-600 mb-4">{agentOutput.analysisResult.content.summary}</p>

                    {/* Details */}
                    {agentOutput.analysisResult.content.details && agentOutput.analysisResult.content.details.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-2">Key Insights</h3>
                        <ul className="list-disc list-inside space-y-2">
                          {agentOutput.analysisResult.content.details.map((detail: string, index: number) => (
                            <li key={index} className="text-gray-600">{detail}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Metrics */}
                    {agentOutput.analysisResult.content.metrics && Object.keys(agentOutput.analysisResult.content.metrics).length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {Object.entries(agentOutput.analysisResult.content.metrics).map(([key, value]) => (
                          value !== undefined && (
                            <div key={key} className="bg-gray-50 p-4 rounded-lg">
                              <p className="text-sm text-gray-500 capitalize">{key}</p>
                              <p className="text-xl font-semibold">{String(value)}</p>
                            </div>
                          )
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Visualization Section */}
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-xl font-bold mb-2">{agentOutput.analysisResult.visualization.config.title}</h3>
                    <p className="text-gray-600 mb-4">{agentOutput.analysisResult.visualization.config.description}</p>

                    <div className="visualization-container">
                      {agentOutput.analysisResult.visualization.chartType === 'pie' ? (
                        <PieChart
                          data={agentOutput.analysisResult.visualization.data} 
                          config={{
                            donut: false,
                            showPercentages: true,
                            ...agentOutput.analysisResult.visualization.config.pieConfig
                          }} 
                        />
                      ) : (
                        <BarChart 
                          data={agentOutput.analysisResult.visualization.data} 
                          config={{
                            barThickness: 40,
                            horizontal: false,
                            showGridLines: true,
                            xAxisLabel: agentOutput.analysisResult.visualization.config.xAxis,
                            yAxisLabel: agentOutput.analysisResult.visualization.config.yAxis
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* SQL Query Section */}
                  {agentOutput.analysisResult.sqlQuery && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">SQL Query</h3>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                        <code>{agentOutput.analysisResult.sqlQuery}</code>
                      </pre>
                    </div>
                  )}
                </>
              ) : (
                // Researcher Output Format
                <>
                  {/* Summary */}
                  <div className="bg-white p-4 rounded-lg border">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Summary</h3>
                    <p className="text-sm text-gray-600">{agentOutput.analysisResult.summary}</p>
                  </div>

                  {/* Details */}
                  {agentOutput.analysisResult.details && agentOutput.analysisResult.details.length > 0 && (
                    <div className="bg-white p-4 rounded-lg border">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Details</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {agentOutput.analysisResult.details.map((detail: string, index: number) => (
                          <li key={index} className="text-sm text-gray-600">{detail}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Metrics */}
                  {agentOutput.analysisResult.metrics && Object.keys(agentOutput.analysisResult.metrics).length > 0 && (
                    <div className="bg-white p-4 rounded-lg border">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Metrics</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(agentOutput.analysisResult.metrics).map(([key, value]) => (
                          <div key={key} className="text-sm">
                            <span className="font-medium text-gray-700">{key}:</span>{' '}
                            <span className="text-gray-600">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SQL Query */}
                  {agentOutput.analysisResult.sqlQuery && (
                    <div className="bg-white p-4 rounded-lg border">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">SQL Query</h3>
                      <pre className="bg-gray-50 p-2 rounded text-sm overflow-x-auto">
                        <code>{agentOutput.analysisResult.sqlQuery}</code>
                      </pre>
                    </div>
                  )}

                  {/* Query Results */}
                  {agentOutput.analysisResult.queryResult && (
                    <div className="bg-white p-4 rounded-lg border">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Query Results</h3>
                      {agentOutput.analysisResult.queryResult.success ? (
                        <div className="space-y-2">
                          <div className="text-sm text-gray-600">
                            Rows returned: {agentOutput.analysisResult.queryResult.rowCount}
                          </div>
                          {agentOutput.analysisResult.queryResult.rows && agentOutput.analysisResult.queryResult.rows.length > 0 && (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    {Object.keys(agentOutput.analysisResult.queryResult.rows[0]).map((header) => (
                                      <th
                                        key={header}
                                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                      >
                                        {header}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {agentOutput.analysisResult.queryResult.rows.map((row: any, index: number) => (
                                    <tr key={index}>
                                      {Object.values(row).map((value: any, i: number) => (
                                        <td
                                          key={i}
                                          className="px-3 py-2 text-sm text-gray-500 whitespace-nowrap"
                                        >
                                          {value}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-red-600">
                          Error: {agentOutput.analysisResult.queryResult.error}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Debug Information */}
          {agentOutput.debug && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Debug Info</h3>
              <div className="text-sm text-gray-600">
                <p>Message: {agentOutput.debug.message}</p>
                <p>Connection ID: {agentOutput.debug.connectionId}</p>
                <p>Query: {agentOutput.debug.query}</p>
                <p>Match Count: {agentOutput.debug.matchCount}</p>
              </div>
            </div>
          )}

          {/* Expand/Collapse Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {isExpanded ? 'Show Less' : 'Show More'}
          </button>
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
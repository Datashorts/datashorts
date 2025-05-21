import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import VisualizationRenderer from '@/components/VisualizationRenderer'
import DynamicVisualization from './DynamicVisualization'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface BookmarkMessageProps {
  response: any
  isUser: boolean
  connectionId?: string
}

const MetricCard: React.FC<{
  label: string;
  value: string | number;
}> = ({ label, value }) => (
  <div className="bg-[#333] p-3 rounded">
    <p className="text-sm text-gray-400">{label}</p>
    <p className="text-lg font-medium">{String(value)}</p>
  </div>
);

const BookmarkMessage: React.FC<BookmarkMessageProps> = ({ response, isUser, connectionId }) => {
  const [showDetails, setShowDetails] = useState(false)

  if (isUser) {
    return (
      <div className="text-gray-200">
        {response.message}
      </div>
    )
  }

  if (response.agentType === 'pipeline2') {
    const { taskResult, analysisResult } = response.agentOutput

    return (
      <div className="space-y-4">
        <div className="bg-[#2a2a2a] p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Task Analysis</h3>
          <p className="text-gray-300">{taskResult.reason}</p>
        </div>

        {analysisResult && (
          <>
            {taskResult.next === 'visualizer' ? (
              <>
                <div className="bg-[#2a2a2a] p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-2">{analysisResult.content.title}</h3>
                  <p className="text-gray-300">{analysisResult.content.summary}</p>

                  <div className="mt-4">
                    {analysisResult.sqlQuery ? (
                      <DynamicVisualization
                        visualization={analysisResult.visualization}
                        connectionId={connectionId || response.connectionId}
                        sqlQuery={analysisResult.sqlQuery}
                        refreshInterval={5000} // Default to 5 seconds
                      />
                    ) : (
                      <VisualizationRenderer visualization={analysisResult.visualization} />
                    )}
                  </div>

                  {(analysisResult.content.details?.length > 0 || analysisResult.content.metrics) && (
                    <div className="mt-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-400 hover:text-blue-300"
                        onClick={() => setShowDetails(!showDetails)}
                      >
                        {showDetails ? (
                          <ChevronUp className="h-4 w-4 mr-1" />
                        ) : (
                          <ChevronDown className="h-4 w-4 mr-1" />
                        )}
                        {showDetails ? 'Hide Details' : 'Show Details'}
                      </Button>

                      {showDetails && (
                        <div className="mt-4 space-y-4">
                          {analysisResult.content.details?.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Details</h4>
                              <ul className="list-disc pl-5 space-y-1">
                                {analysisResult.content.details.map((detail: string, index: number) => (
                                  <li key={index} className="text-gray-300 text-sm">{detail}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {analysisResult.content.metrics && Object.keys(analysisResult.content.metrics).length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Metrics</h4>
                              <div className="grid grid-cols-2 gap-4">
                                {Object.entries(analysisResult.content.metrics).map(([key, value], index) => (
                                  <div key={index} className="bg-[#333] p-3 rounded">
                                    <p className="text-sm text-gray-400">{key}</p>
                                    <p className="text-lg font-medium">{String(value)}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : taskResult.next === 'predictive' ? (
              <>
                <div className="bg-[#2a2a2a] p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-2">{analysisResult.content.title}</h3>
                  <p className="text-gray-300">{analysisResult.content.summary}</p>

                  {/* Metrics */}
                  {analysisResult.content.metrics && Object.keys(analysisResult.content.metrics).length > 0 && (
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      {Object.entries(analysisResult.content.metrics).map(([key, value], index) => (
                        <MetricCard key={index} label={key} value={value} />
                      ))}
                    </div>
                  )}
                  
                  {/* Prediction Visualization */}
                  {analysisResult.prediction && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">{analysisResult.prediction.config.title}</h4>
                      <p className="text-gray-400 text-sm mb-3">{analysisResult.prediction.config.description}</p>
                      <div className="bg-[#222] p-4 rounded-lg h-60">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart 
                            data={analysisResult.prediction.data} 
                            margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                            <XAxis 
                              dataKey="label" 
                              tick={{ fill: '#aaa' }}
                            />
                            <YAxis 
                              tick={{ fill: '#aaa' }}
                            />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#333', borderColor: '#555', color: '#eee' }}
                            />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="value" 
                              stroke="#4dabf7" 
                              name="Predicted Value" 
                              strokeWidth={2}
                              dot={{ fill: '#4dabf7', r: 4 }}
                            />
                            {analysisResult.prediction.data[0].confidenceInterval && (
                              <>
                                <Line 
                                  type="monotone" 
                                  dataKey="confidenceInterval.upper" 
                                  stroke="#4dabf755" 
                                  name="Upper Bound" 
                                  strokeWidth={1}
                                  strokeDasharray="5 5"
                                  dot={false}
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey="confidenceInterval.lower" 
                                  stroke="#4dabf755" 
                                  name="Lower Bound" 
                                  strokeWidth={1}
                                  strokeDasharray="5 5"
                                  dot={false}
                                />
                              </>
                            )}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-2 text-xs text-gray-400">
                        <span className="font-medium">Method:</span> {analysisResult.content.method}
                      </div>
                    </div>
                  )}

                  {/* Toggle details section */}
                  {(analysisResult.content.details?.length > 0 || analysisResult.sqlQuery) && (
                    <div className="mt-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-400 hover:text-blue-300"
                        onClick={() => setShowDetails(!showDetails)}
                      >
                        {showDetails ? (
                          <ChevronUp className="h-4 w-4 mr-1" />
                        ) : (
                          <ChevronDown className="h-4 w-4 mr-1" />
                        )}
                        {showDetails ? 'Hide Details' : 'Show Details'}
                      </Button>

                      {showDetails && (
                        <div className="mt-4 space-y-4">
                          {analysisResult.content.details?.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Details</h4>
                              <ul className="list-disc pl-5 space-y-1">
                                {analysisResult.content.details.map((detail: string, index: number) => (
                                  <li key={index} className="text-gray-300 text-sm">{detail}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {analysisResult.sqlQuery && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">SQL Query</h4>
                              <pre className="text-xs bg-[#222] p-3 rounded overflow-x-auto text-gray-300">
                                {analysisResult.sqlQuery}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="bg-[#2a2a2a] p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-2">Summary</h3>
                  <p className="text-gray-300">{analysisResult.summary}</p>

                  {(analysisResult.details?.length > 0 || analysisResult.metrics) && (
                    <div className="mt-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-400 hover:text-blue-300"
                        onClick={() => setShowDetails(!showDetails)}
                      >
                        {showDetails ? (
                          <ChevronUp className="h-4 w-4 mr-1" />
                        ) : (
                          <ChevronDown className="h-4 w-4 mr-1" />
                        )}
                        {showDetails ? 'Hide Details' : 'Show Details'}
                      </Button>

                      {showDetails && (
                        <div className="mt-4 space-y-4">
                          {analysisResult.details?.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Details</h4>
                              <ul className="list-disc pl-5 space-y-1">
                                {analysisResult.details.map((detail: string, index: number) => (
                                  <li key={index} className="text-gray-300 text-sm">{detail}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {analysisResult.metrics && Object.keys(analysisResult.metrics).length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Metrics</h4>
                              <div className="grid grid-cols-2 gap-4">
                                {Object.entries(analysisResult.metrics).map(([key, value], index) => (
                                  <div key={index} className="bg-[#333] p-3 rounded">
                                    <p className="text-sm text-gray-400">{key}</p>
                                    <p className="text-lg font-medium">{String(value)}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="text-gray-200">
      {response.agentOutput?.summary || response.agentOutput?.content?.summary || 'No content available'}
    </div>
  )
}

export default BookmarkMessage
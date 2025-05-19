import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import VisualizationRenderer from '@/components/VisualizationRenderer'

interface BookmarkMessageProps {
  response: any
  isUser: boolean
}

const BookmarkMessage: React.FC<BookmarkMessageProps> = ({ response, isUser }) => {
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
                    <VisualizationRenderer visualization={analysisResult.visualization} />
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
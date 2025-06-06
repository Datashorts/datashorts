// File: app/_components/query/QueryAssistant.tsx (FIXED VERSION)
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Lightbulb, 
  HelpCircle, 
  Wand2, 
  Copy, 
  BookOpen, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react'
import { explainQuery, getQuerySuggestions } from '@/app/actions/remoteQuery'

interface QueryAssistantProps {
  connectionId: string
  currentQuery: string
  onQuerySelect: (query: string) => void
}

interface QuerySuggestion {
  query: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
}

interface OptimizationResult {
  optimizedQuery: string
  explanation: string
  expectedImprovement: string
}

const difficultyIcons = {
  beginner: CheckCircle,
  intermediate: Clock,
  advanced: AlertTriangle
}

export default function QueryAssistant({ connectionId, currentQuery, onQuerySelect }: QueryAssistantProps) {
  const [isExplaining, setIsExplaining] = useState(false)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [isGettingSuggestions, setIsGettingSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<QuerySuggestion[]>([])
  const [userIntent, setUserIntent] = useState('')
  const [activeTab, setActiveTab] = useState<'explain' | 'suggest' | 'optimize'>('explain')
  
  // Optimization state
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null)
  const [optimizationError, setOptimizationError] = useState<string | null>(null)

  const handleExplainQuery = async () => {
    if (!currentQuery.trim()) return

    setIsExplaining(true)
    try {
      const result = await explainQuery(connectionId, currentQuery)
      if (result.success) {
        setExplanation(result.explanation || null)
      } else {
        setExplanation(`Error: ${result.error}`)
      }
    } catch (error) {
      setExplanation('Failed to explain query')
    } finally {
      setIsExplaining(false)
    }
  }

  const handleGetSuggestions = async () => {
    if (!userIntent.trim()) return

    setIsGettingSuggestions(true)
    try {
      const result = await getQuerySuggestions(connectionId, userIntent)
      if (result.success) {
        setSuggestions(result.suggestions || [])
      } else {
        setSuggestions([])
      }
    } catch (error) {
      setSuggestions([])
    } finally {
      setIsGettingSuggestions(false)
    }
  }

  const handleOptimizeQuery = async () => {
    if (!currentQuery.trim()) return

    setIsOptimizing(true)
    setOptimizationError(null)
    setOptimizationResult(null)

    try {
      const response = await fetch('/api/optimize-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionId,
          query: currentQuery
        })
      })

      const result = await response.json()
      
      if (result.success) {
        if (result.optimization) {
          setOptimizationResult(result.optimization)
        } else {
          setOptimizationResult(null)
        }
      } else {
        setOptimizationError(result.error || 'Failed to optimize query')
      }
    } catch (error) {
      console.error('Error optimizing query:', error)
      setOptimizationError('Failed to connect to optimization service')
    } finally {
      setIsOptimizing(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="w-full max-w-2xl bg-[#111214] border border-blue-500/20 rounded-lg flex flex-col h-[80vh]">
      <CardHeader className="flex-shrink-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-gray-200">
          <Wand2 className="h-5 w-5 text-blue-500" />
          Query Assistant
        </CardTitle>
        <CardDescription className="text-gray-400">
          Get help with understanding queries, generating new ones, and optimizing performance
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden flex flex-col p-4">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 bg-[#0a0a0a] flex-shrink-0 mb-4">
            <TabsTrigger value="explain" className="flex items-center gap-2 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
              <HelpCircle className="h-4 w-4" />
              Explain
            </TabsTrigger>
            <TabsTrigger value="suggest" className="flex items-center gap-2 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
              <Lightbulb className="h-4 w-4" />
              Suggest
            </TabsTrigger>
            <TabsTrigger value="optimize" className="flex items-center gap-2 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
              <Zap className="h-4 w-4" />
              Optimize
            </TabsTrigger>
          </TabsList>

          {/* EXPLAIN TAB */}
          <TabsContent value="explain" className="flex-1 overflow-hidden flex flex-col mt-0">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h3 className="text-sm font-medium text-gray-200">Query Explanation</h3>
              <Button
                onClick={handleExplainQuery}
                disabled={isExplaining || !currentQuery.trim()}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isExplaining ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Explain Query
                  </>
                )}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {!currentQuery.trim() && (
                <div className="text-sm text-gray-500 italic">
                  Enter a SQL query to get an explanation
                </div>
              )}

              {explanation && (
                <Card className="bg-[#0a0a0a] border-blue-500/20">
                  <CardContent className="pt-4">
                    <div className="whitespace-pre-wrap text-sm text-gray-300 leading-relaxed">
                      {explanation}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* SUGGEST TAB */}
          <TabsContent value="suggest" className="flex-1 overflow-hidden flex flex-col mt-0">
            <div className="flex-shrink-0 space-y-3 mb-4">
              <div>
                <h3 className="text-sm font-medium mb-2 text-gray-200">What do you want to do?</h3>
                <Textarea
                  placeholder="Describe what you want to query... e.g., 'Find all users who signed up last month' or 'Show the top 10 products by sales'"
                  value={userIntent}
                  onChange={(e) => setUserIntent(e.target.value)}
                  className="min-h-[80px] bg-[#0a0a0a] border-blue-500/20 text-gray-200 placeholder-gray-500"
                />
              </div>

              <Button
                onClick={handleGetSuggestions}
                disabled={isGettingSuggestions || !userIntent.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isGettingSuggestions ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Getting Suggestions...
                  </>
                ) : (
                  <>
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Get Query Suggestions
                  </>
                )}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {suggestions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-200">Suggested Queries</h4>
                  <div className="space-y-3">
                    {suggestions.map((suggestion, index) => {
                      const DifficultyIcon = difficultyIcons[suggestion.difficulty]
                      return (
                        <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow bg-[#0a0a0a] border-blue-500/20 hover:border-blue-500/40">
                          <CardContent className="pt-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Badge 
                                  variant="secondary"
                                  className={`${
                                    suggestion.difficulty === 'beginner' 
                                      ? 'bg-green-900/20 text-green-400 border-green-500/30'
                                      : suggestion.difficulty === 'intermediate'
                                      ? 'bg-yellow-900/20 text-yellow-400 border-yellow-500/30'
                                      : 'bg-red-900/20 text-red-400 border-red-500/30'
                                  }`}
                                >
                                  <DifficultyIcon className="h-3 w-3 mr-1" />
                                  {suggestion.difficulty}
                                </Badge>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(suggestion.query)}
                                    className="text-gray-400 hover:text-gray-200"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onQuerySelect(suggestion.query)}
                                    className="text-blue-400 hover:text-blue-300"
                                  >
                                    Use Query
                                  </Button>
                                </div>
                              </div>
                              
                              <div>
                                <p className="text-sm text-gray-400 mb-2">{suggestion.description}</p>
                                <pre className="text-xs bg-[#0f1013] p-2 rounded border border-blue-500/20 overflow-x-auto text-gray-300">
                                  <code>{suggestion.query}</code>
                                </pre>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* OPTIMIZE TAB */}
          <TabsContent value="optimize" className="flex-1 overflow-hidden flex flex-col mt-0">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h3 className="text-sm font-medium text-gray-200">Query Optimization</h3>
              <Button
                onClick={handleOptimizeQuery}
                disabled={isOptimizing || !currentQuery.trim()}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isOptimizing ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Optimize Query
                  </>
                )}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {!currentQuery.trim() && (
                <div className="text-sm text-gray-500 italic">
                  Enter a SQL query to get optimization suggestions
                </div>
              )}

              {optimizationError && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{optimizationError}</p>
                </div>
              )}

              {optimizationResult ? (
                <Card className="bg-[#0a0a0a] border-blue-500/20">
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-blue-400 mb-2">Optimization Results</h4>
                        <p className="text-sm text-gray-300 mb-2">{optimizationResult.explanation}</p>
                        <p className="text-xs text-green-400 mb-3">
                          Expected improvement: {optimizationResult.expectedImprovement}
                        </p>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-sm font-medium text-gray-200">Optimized Query</h5>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(optimizationResult.optimizedQuery)}
                              className="text-gray-400 hover:text-gray-200"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onQuerySelect(optimizationResult.optimizedQuery)}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              Use Optimized
                            </Button>
                          </div>
                        </div>
                        <pre className="text-xs bg-[#0f1013] p-3 rounded border border-blue-500/20 overflow-x-auto text-gray-300 whitespace-pre-wrap break-words">
                          <code>{optimizationResult.optimizedQuery}</code>
                        </pre>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : optimizationResult === null && !isOptimizing && !optimizationError && currentQuery.trim() ? (
                <div className="text-center py-6 text-gray-400">
                  <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No optimization suggestions for this query</p>
                  <p className="text-xs text-gray-500 mt-1">The query appears to be already well-optimized</p>
                </div>
              ) : null}

              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-400 mb-2">General Optimization Tips</h4>
                <ul className="text-xs text-blue-300 space-y-1">
                  <li>• Use LIMIT to restrict result sets for faster queries</li>
                  <li>• Add WHERE clauses to filter data early</li>
                  <li>• Consider creating indexes on frequently queried columns</li>
                  <li>• Use specific column names instead of SELECT *</li>
                  <li>• Optimize JOIN conditions and order</li>
                  <li>• Avoid functions in WHERE clauses when possible</li>
                  <li>• Replace correlated subqueries with JOINs when possible</li>
                  <li>• Use window functions instead of subqueries for aggregations</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </div>
  )
}
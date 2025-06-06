// Path: app/_components/query/QueryAssistant.tsx

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

const difficultyColors = {
  beginner: 'bg-green-100 text-green-800 border-green-200',
  intermediate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  advanced: 'bg-red-100 text-red-800 border-red-200'
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="w-full max-w-2xl bg-[#111214] border-blue-500/20 rounded-lg max-h-[600px] flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-gray-200">
          <Wand2 className="h-5 w-5 text-blue-500" />
          Query Assistant
        </CardTitle>
        <CardDescription className="text-gray-400">
          Get help with understanding queries, generating new ones, and optimizing performance
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 bg-[#0a0a0a] flex-shrink-0">
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

          <div className="flex-1 overflow-y-auto mt-4 pr-2 scrollbar-thin scrollbar-thumb-blue-500/30 scrollbar-track-transparent">
            <TabsContent value="explain" className="space-y-4 mt-0">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
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

                {!currentQuery.trim() && (
                  <div className="text-sm text-gray-500 italic">
                    Enter a SQL query to get an explanation
                  </div>
                )}

                {explanation && (
                  <Card className="bg-[#0a0a0a] border-blue-500/20">
                    <CardContent className="pt-4">
                      <div className="max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-blue-500/30 scrollbar-track-transparent">
                        <div className="whitespace-pre-wrap text-sm text-gray-300 leading-relaxed">
                          {explanation}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="suggest" className="space-y-4 mt-0">
              <div className="space-y-3">
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

                {suggestions.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-200">Suggested Queries</h4>
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-blue-500/30 scrollbar-track-transparent">
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

            <TabsContent value="optimize" className="space-y-4 mt-0">
              <div className="space-y-3">
                <div className="text-center py-8 text-gray-500">
                  <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2 text-gray-200">Query Optimization</h3>
                  <p className="text-sm text-gray-400">
                    Query optimization features are available when executing queries.
                    The system will automatically suggest optimizations for better performance.
                  </p>
                </div>

                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-400 mb-2">Optimization Tips</h4>
                  <ul className="text-xs text-blue-300 space-y-1">
                    <li>• Use LIMIT to restrict result sets for faster queries</li>
                    <li>• Add WHERE clauses to filter data early</li>
                    <li>• Consider creating indexes on frequently queried columns</li>
                    <li>• Use specific column names instead of SELECT *</li>
                    <li>• Optimize JOIN conditions and order</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </div>
  )
}
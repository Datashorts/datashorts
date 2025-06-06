// app/_components/query/QueryAssistant.tsx
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
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-blue-500" />
          Query Assistant
        </CardTitle>
        <CardDescription>
          Get help with understanding queries, generating new ones, and optimizing performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="explain" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Explain
            </TabsTrigger>
            <TabsTrigger value="suggest" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Suggest
            </TabsTrigger>
            <TabsTrigger value="optimize" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Optimize
            </TabsTrigger>
          </TabsList>

          <TabsContent value="explain" className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Query Explanation</h3>
                <Button
                  onClick={handleExplainQuery}
                  disabled={isExplaining || !currentQuery.trim()}
                  size="sm"
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
                <Card>
                  <CardContent className="pt-4">
                    <div className="prose prose-sm max-w-none">
                      <div className="whitespace-pre-wrap text-sm">{explanation}</div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="suggest" className="space-y-4">
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-medium mb-2">What do you want to do?</h3>
                <Textarea
                  placeholder="Describe what you want to query... e.g., 'Find all users who signed up last month' or 'Show the top 10 products by sales'"
                  value={userIntent}
                  onChange={(e) => setUserIntent(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              <Button
                onClick={handleGetSuggestions}
                disabled={isGettingSuggestions || !userIntent.trim()}
                className="w-full"
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
                  <h4 className="text-sm font-medium">Suggested Queries</h4>
                  {suggestions.map((suggestion, index) => {
                    const DifficultyIcon = difficultyIcons[suggestion.difficulty]
                    return (
                      <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="pt-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Badge 
                                variant="secondary"
                                className={difficultyColors[suggestion.difficulty]}
                              >
                                <DifficultyIcon className="h-3 w-3 mr-1" />
                                {suggestion.difficulty}
                              </Badge>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(suggestion.query)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onQuerySelect(suggestion.query)}
                                >
                                  Use Query
                                </Button>
                              </div>
                            </div>
                            
                            <div>
                              <p className="text-sm text-gray-600 mb-2">{suggestion.description}</p>
                              <pre className="text-xs bg-gray-50 p-2 rounded border overflow-x-auto">
                                <code>{suggestion.query}</code>
                              </pre>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="optimize" className="space-y-4">
            <div className="space-y-3">
              <div className="text-center py-8 text-gray-500">
                <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Query Optimization</h3>
                <p className="text-sm">
                  Query optimization features are available when executing queries.
                  The system will automatically suggest optimizations for better performance.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Optimization Tips</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Use LIMIT to restrict result sets for faster queries</li>
                  <li>• Add WHERE clauses to filter data early</li>
                  <li>• Consider creating indexes on frequently queried columns</li>
                  <li>• Use specific column names instead of SELECT *</li>
                  <li>• Optimize JOIN conditions and order</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
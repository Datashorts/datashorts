// File: app/chats/[id]/[dbname]/query/page.tsx
'use client'

import { useEffect, useState, useRef, KeyboardEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useFoldersStore } from '@/app/store/useFoldersStore'
import Sidebar from '@/app/_components/chat/Sidebar'
import { useUser } from '@clerk/nextjs'
import { executeRemoteQuery } from '@/app/actions/remoteQuery'
import { Button } from '@/components/ui/button'
import { Play, Download, Copy, Database, AlertCircle, CheckCircle, Clock, RotateCcw, Wand2, Shield, Zap, AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import QueryAssistant from '@/app/_components/query/QueryAssistant'
import Link from 'next/link'

interface QueryResult {
  success: boolean
  data?: {
    rows: any[]
    rowCount: number
    columns: string[]
    executionTime: number
  }
  error?: string
  validation?: {
    isValid: boolean
    riskLevel: 'low' | 'medium' | 'high'
    warnings: string[]
    suggestions?: string[]
    estimatedImpact?: string
  }
  optimization?: {
    originalQuery: string
    optimizedQuery: string
    explanation: string
    expectedImprovement: string
  }
  metadata?: {
    queryType: string
    affectedTables: string[]
    readOnly: boolean
  }
}

interface QueryHistory {
  id: string
  query: string
  result: QueryResult
  timestamp: Date
}

export default function RemoteQueryPage() {
  const params = useParams()
  const { user } = useUser()
  const { setActiveConnection, loadFolders, folders } = useFoldersStore()
  const router = useRouter()

  const connectionId = params.id as string
  const dbName = params.dbname as string

  const [sqlQuery, setSqlQuery] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  const [currentResult, setCurrentResult] = useState<QueryResult | null>(null)
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([])
  const [selectedTable, setSelectedTable] = useState('')
  const [dbSchema, setDbSchema] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showAssistant, setShowAssistant] = useState(false)
  const [queryOptions, setQueryOptions] = useState({
    validateQuery: true,
    optimizeQuery: true,
    forceExecution: false
  })
  const [activeTab, setActiveTab] = useState<'query' | 'results' | 'schema'>('query')

  const queryEditorRef = useRef<HTMLTextAreaElement>(null)

  // Common SQL templates
  const sqlTemplates = [
    { name: 'Select All', query: 'SELECT * FROM table_name LIMIT 100;' },
    { name: 'Count Records', query: 'SELECT COUNT(*) FROM table_name;' },
    { name: 'Show Tables', query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';" },
    { name: 'Describe Table', query: 'SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = \'table_name\';' },
    { name: 'Recent Records', query: 'SELECT * FROM table_name ORDER BY created_at DESC LIMIT 10;' }
  ]

  useEffect(() => {
    if (user) loadFolders(user.id)
  }, [user, loadFolders])

  useEffect(() => {
    const connectionExists = folders.some(folder => 
      folder.connections.some(conn => conn.id === connectionId)
    )
    
    if (!connectionExists && folders.length > 0) {
      router.push('/stats')
    }
  }, [folders, connectionId, router])

  useEffect(() => {
    if (connectionId) {
      setActiveConnection(connectionId)
      fetchDatabaseSchema()
    }
  }, [connectionId, setActiveConnection])

  // Load query history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem(`query-history-${connectionId}`)
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory)
        setQueryHistory(parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        })))
      } catch (error) {
        console.error('Error loading query history:', error)
      }
    }
  }, [connectionId])

  const fetchDatabaseSchema = async () => {
    try {
      const schemaQuery = `
        SELECT 
          t.table_name,
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default
        FROM information_schema.tables t
        LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
        WHERE t.table_schema = 'public'
        ORDER BY t.table_name, c.ordinal_position
      `
      
      const result = await executeRemoteQuery(connectionId, schemaQuery, { validateQuery: false })
      if (result.success && 'rows' in result) {
        const schemaByTable: { [key: string]: any[] } = {}
        result.rows.forEach((row: any) => {
          if (!schemaByTable[row.table_name]) {
            schemaByTable[row.table_name] = []
          }
          if (row.column_name) {
            schemaByTable[row.table_name].push({
              column_name: row.column_name,
              data_type: row.data_type,
              is_nullable: row.is_nullable,
              column_default: row.column_default,
            })
          }
        })
        setDbSchema(Object.entries(schemaByTable).map(([tableName, columns]) => ({
          tableName,
          columns
        })))
      }
    } catch (error) {
      console.error('Error fetching database schema:', error)
    }
  }

  const executeSQL = async () => {
    if (!sqlQuery.trim()) return

    setIsExecuting(true)
    const startTime = Date.now()

    try {
      const result = await executeRemoteQuery(connectionId, sqlQuery.trim(), queryOptions)
      
      const queryResult: QueryResult = {
        ...result,
        data: 'rows' in result ? {
          rows: result.rows,
          rowCount: result.rowCount || 0,
          columns: Object.keys(result.rows?.[0] || {}),
          executionTime: Date.now() - startTime
        } : undefined
      }

      setCurrentResult(queryResult)

      // Add to history
      const historyEntry: QueryHistory = {
        id: Date.now().toString(),
        query: sqlQuery.trim(),
        result: queryResult,
        timestamp: new Date()
      }

      const newHistory = [historyEntry, ...queryHistory].slice(0, 50) // Keep last 50 queries
      setQueryHistory(newHistory)

      // Save to localStorage
      localStorage.setItem(`query-history-${connectionId}`, JSON.stringify(newHistory))

      // Switch to results tab
      setActiveTab('results')
    } catch (error) {
      console.error('Error executing query:', error)
      setCurrentResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setIsExecuting(false)
    }
  }

  const insertTemplate = (template: string) => {
    if (selectedTable && template.includes('table_name')) {
      setSqlQuery(template.replace(/table_name/g, selectedTable))
    } else {
      setSqlQuery(template)
    }
    queryEditorRef.current?.focus()
  }

  const loadFromHistory = (historyItem: QueryHistory) => {
    setSqlQuery(historyItem.query)
    setCurrentResult(historyItem.result)
    setShowHistory(false)
    setActiveTab('query')
  }

  const exportResults = () => {
    if (!currentResult?.data?.rows) return

    const csvContent = [
      currentResult.data.columns.join(','),
      ...currentResult.data.rows.map(row => 
        currentResult.data!.columns.map(column => {
          const value = row[column]
          return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `query-results-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyResults = () => {
    if (!currentResult?.data?.rows) return
    
    const text = JSON.stringify(currentResult.data.rows, null, 2)
    navigator.clipboard.writeText(text)
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a] text-gray-200">
        <p className="text-xl font-semibold">Please sign in to continue.</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-gray-200">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-20 backdrop-blur border-b border-blue-500/20 px-4 py-3">
          <div className="max-w-6xl mx-auto flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="h-6 w-6 text-blue-400" />
              <div>
                <h1 className="text-lg sm:text-xl font-semibold">Remote Query Executor</h1>
                <p className="text-sm text-gray-400">{dbName}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Link 
                href={`/chats/${connectionId}/${dbName}`}
                className="px-3 py-1.5 rounded-lg border border-blue-400/30 hover:bg-blue-500/10 text-sm"
              >
                ← Back to Chat
              </Link>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAssistant(!showAssistant)}
                className="border-blue-400/30 hover:bg-blue-500/10"
              >
                <Wand2 className="h-4 w-4 mr-1" />
                Assistant
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowHistory(!showHistory)}
                className="border-blue-400/30 hover:bg-blue-500/10"
              >
                <Clock className="h-4 w-4 mr-1" />
                History
              </Button>
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Query Editor */}
          <div className="flex-1 flex flex-col border-r border-blue-500/20">
            {/* Tabs */}
            <div className="flex border-b border-blue-500/20">
              {[
                { id: 'query', label: 'Query Editor', icon: Database },
                { id: 'results', label: 'Results', icon: CheckCircle },
                { id: 'schema', label: 'Schema', icon: Database }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'query' && (
                <div className="flex flex-col h-full">
                  {/* Query Options */}
                  <div className="p-4 border-b border-blue-500/20">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium">Query Options</h3>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Shield className="h-4 w-4 mr-1" />
                            Settings
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Query Execution Settings</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="validate"
                                checked={queryOptions.validateQuery}
                                onCheckedChange={(checked) => 
                                  setQueryOptions(prev => ({ ...prev, validateQuery: checked }))
                                }
                              />
                              <Label htmlFor="validate">Validate queries for safety</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="optimize"
                                checked={queryOptions.optimizeQuery}
                                onCheckedChange={(checked) => 
                                  setQueryOptions(prev => ({ ...prev, optimizeQuery: checked }))
                                }
                              />
                              <Label htmlFor="optimize">Get optimization suggestions</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="force"
                                checked={queryOptions.forceExecution}
                                onCheckedChange={(checked) => 
                                  setQueryOptions(prev => ({ ...prev, forceExecution: checked }))
                                }
                              />
                              <Label htmlFor="force">Force execution of high-risk queries</Label>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {queryOptions.validateQuery && (
                        <span className="text-xs px-2 py-1 bg-green-900/20 text-green-400 rounded">
                          Validation ON
                        </span>
                      )}
                      {queryOptions.optimizeQuery && (
                        <span className="text-xs px-2 py-1 bg-blue-900/20 text-blue-400 rounded">
                          Optimization ON
                        </span>
                      )}
                      {queryOptions.forceExecution && (
                        <span className="text-xs px-2 py-1 bg-red-900/20 text-red-400 rounded">
                          Force Mode ON
                        </span>
                      )}
                    </div>
                  </div>

                  {/* SQL Templates */}
                  <div className="p-4 border-b border-blue-500/20">
                    <h3 className="text-sm font-medium mb-3">Quick Templates</h3>
                    <div className="flex flex-wrap gap-2">
                      {sqlTemplates.map((template) => (
                        <button
                          key={template.name}
                          onClick={() => insertTemplate(template.query)}
                          className="px-3 py-1.5 text-xs rounded-lg bg-blue-900/20 hover:bg-blue-900/30 border border-blue-500/30 text-blue-300"
                        >
                          {template.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Query Editor */}
                  <div className="flex-1 p-4">
                    <textarea
                      ref={queryEditorRef}
                      value={sqlQuery}
                      onChange={(e) => setSqlQuery(e.target.value)}
                      placeholder="Enter your SQL query here..."
                      className="w-full h-full resize-none bg-[#0f1013] border border-blue-500/20 rounded-lg p-4 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 focus:outline-none placeholder-gray-500 text-gray-200 font-mono"
                      disabled={isExecuting}
                    />
                  </div>

                  {/* Execute Button */}
                  <div className="p-4 border-t border-blue-500/20">
                    <Button
                      onClick={executeSQL}
                      disabled={isExecuting || !sqlQuery.trim()}
                      className="w-full bg-gradient-to-r from-blue-600/90 to-blue-500/90 hover:from-blue-600 hover:to-blue-500"
                    >
                      {isExecuting ? (
                        <>
                          <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                          Executing...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Execute Query
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === 'results' && (
                <div className="flex flex-col h-full">
                  {currentResult ? (
                    <>
                      {/* Results Header */}
                      <div className="p-4 border-b border-blue-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {currentResult.success ? (
                            <CheckCircle className="h-5 w-5 text-green-400" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-red-400" />
                          )}
                          <div>
                            <p className="font-medium">
                              {currentResult.success ? 'Query Successful' : 'Query Failed'}
                            </p>
                            {currentResult.success && currentResult.data && (
                              <p className="text-sm text-gray-400">
                                {currentResult.data.rowCount} rows returned
                                {currentResult.data.executionTime && ` in ${currentResult.data.executionTime}ms`}
                              </p>
                            )}
                            {currentResult.metadata && (
                              <p className="text-xs text-gray-500">
                                Type: {currentResult.metadata.queryType} | 
                                Tables: {currentResult.metadata.affectedTables.join(', ') || 'None'} | 
                                {currentResult.metadata.readOnly ? 'Read-only' : 'Modifies data'}
                              </p>
                            )}
                          </div>
                        </div>

                        {currentResult.success && currentResult.data && (
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={copyResults}>
                              <Copy className="h-4 w-4 mr-1" />
                              Copy
                            </Button>
                            <Button variant="outline" size="sm" onClick={exportResults}>
                              <Download className="h-4 w-4 mr-1" />
                              Export CSV
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Results Content */}
                      <div className="flex-1 overflow-auto p-4">
                        {/* Validation Results */}
                        {currentResult.validation && (
                          <div className={`mb-4 p-3 rounded-lg border ${
                            currentResult.validation.riskLevel === 'high' 
                              ? 'bg-red-900/20 border-red-500/30' 
                              : currentResult.validation.riskLevel === 'medium'
                              ? 'bg-yellow-900/20 border-yellow-500/30'
                              : 'bg-green-900/20 border-green-500/30'
                          }`}>
                            <div className="flex items-center gap-2 mb-2">
                              <Shield className="h-4 w-4" />
                              <span className="font-medium">Security Analysis</span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                currentResult.validation.riskLevel === 'high' 
                                  ? 'bg-red-500/20 text-red-400' 
                                  : currentResult.validation.riskLevel === 'medium'
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : 'bg-green-500/20 text-green-400'
                              }`}>
                                {currentResult.validation.riskLevel.toUpperCase()} RISK
                              </span>
                            </div>
                            {currentResult.validation.warnings.length > 0 && (
                              <div className="text-sm space-y-1">
                                {currentResult.validation.warnings.map((warning, i) => (
                                  <div key={i} className="flex items-start gap-2">
                                    <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                    <span>{warning}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Optimization Results */}
                        {currentResult.optimization && (
                          <div className="mb-4 p-3 rounded-lg border bg-blue-900/20 border-blue-500/30">
                            <div className="flex items-center gap-2 mb-2">
                              <Zap className="h-4 w-4 text-blue-400" />
                              <span className="font-medium text-blue-400">Optimization Suggestion</span>
                            </div>
                            <p className="text-sm mb-2">{currentResult.optimization.explanation}</p>
                            <p className="text-xs text-blue-300 mb-2">Expected: {currentResult.optimization.expectedImprovement}</p>
                            <details className="text-sm">
                              <summary className="cursor-pointer text-blue-400 hover:text-blue-300">
                                View optimized query
                              </summary>
                              <pre className="mt-2 p-2 bg-blue-950/30 rounded text-xs overflow-x-auto">
                                {currentResult.optimization.optimizedQuery}
                              </pre>
                            </details>
                          </div>
                        )}

                        {currentResult.success && currentResult.data ? (
                          currentResult.data.rows.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="min-w-full border border-blue-500/20 rounded-lg">
                                <thead className="bg-blue-900/20">
                                  <tr>
                                    {currentResult.data.columns.map((header) => (
                                      <th key={header} className="px-4 py-3 text-left font-medium text-gray-100 border-b border-blue-500/20">
                                        {header}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {currentResult.data.rows.map((row, i) => (
                                    <tr key={i} className="hover:bg-blue-500/5">
                                      {currentResult.data!.columns.map((column, j) => (
                                        <td key={j} className="px-4 py-3 text-gray-300 border-b border-blue-500/10">
                                          {row[column] === null ? (
                                            <span className="text-gray-500 italic">NULL</span>
                                          ) : (
                                            String(row[column])
                                          )}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-400">
                              Query executed successfully but returned no rows.
                            </div>
                          )
                        ) : (
                          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                            <p className="text-red-400 font-medium mb-2">Error executing query:</p>
                            <p className="text-gray-300 font-mono text-sm">{currentResult.error}</p>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Execute a query to see results here</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'schema' && (
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b border-blue-500/20">
                    <h3 className="font-medium text-gray-200">Database Schema</h3>
                    <p className="text-sm text-gray-400">Click on a table to select it for templates</p>
                  </div>
                  <div className="flex-1 overflow-auto p-4">
                    {dbSchema.length > 0 ? (
                      <div className="space-y-4">
                        {dbSchema.map((table) => (
                          <div 
                            key={table.tableName}
                            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                              selectedTable === table.tableName
                                ? 'border-blue-500/50 bg-blue-900/20'
                                : 'border-blue-500/20 hover:border-blue-500/40'
                            }`}
                            onClick={() => setSelectedTable(table.tableName)}
                          >
                            <h4 className="font-medium text-blue-400 mb-2">{table.tableName}</h4>
                            <div className="space-y-1">
                              {table.columns.map((column: any, idx: number) => (
                                <div key={idx} className="text-sm text-gray-300 flex justify-between">
                                  <span>{column.column_name}</span>
                                  <span className="text-gray-500">{column.data_type}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 py-8">
                        <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Loading database schema...</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Query Assistant Panel */}
          {showAssistant && (
            <div className="w-96 border-l border-blue-500/20 flex flex-col">
              <div className="p-4">
                <QueryAssistant
                  connectionId={connectionId}
                  currentQuery={sqlQuery}
                  onQuerySelect={(query) => {
                    setSqlQuery(query)
                    setActiveTab('query')
                    queryEditorRef.current?.focus()
                  }}
                />
              </div>
            </div>
          )}

          {/* Right Panel - Query History */}
          {showHistory && (
            <div className="w-80 border-l border-blue-500/20 flex flex-col">
              <div className="p-4 border-b border-blue-500/20">
                <h3 className="font-medium text-gray-200">Query History</h3>
                <p className="text-sm text-gray-400">Click to rerun a query</p>
              </div>
              <div className="flex-1 overflow-auto">
                {queryHistory.length > 0 ? (
                  <div className="space-y-2 p-4">
                    {queryHistory.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => loadFromHistory(item)}
                        className="p-3 rounded-lg border border-blue-500/20 hover:border-blue-500/40 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {item.result.success ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-400" />
                          )}
                          <span className="text-xs text-gray-400">
                            {item.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 font-mono truncate">
                          {item.query}
                        </p>
                        {item.result.success && item.result.data && (
                          <p className="text-xs text-gray-500 mt-1">
                            {item.result.data.rowCount} rows
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-400">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No query history</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
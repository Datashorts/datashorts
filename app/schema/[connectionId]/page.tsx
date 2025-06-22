// File: app/schema/[connectionId]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Database, 
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  Settings,
  Eye,
  List,
  FileJson,
  FileText,
  Image,
} from 'lucide-react'
import ERDDiagram from '@/app/_components/schema/ERDDiagram'
// Import the function correctly - make sure the path matches your project structure
import { getConnectionSchema } from '@/app/actions/getConnectionSchema'

// Import types
import type { SchemaData, TableSchema } from '@/app/_types/schema'

export default function SchemaPage() {
  const params = useParams()
  const router = useRouter()
  const connectionId = parseInt(params?.connectionId as string)
  
  const [schemaData, setSchemaData] = useState<SchemaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'diagram' | 'tables'>('diagram')

  // Load schema on mount
  useEffect(() => {
    if (connectionId) {
      loadSchema(connectionId)
    }
  }, [connectionId])

  const loadSchema = async (id: number) => {
    try {
      setLoading(true)
      setError(null)
      
      // Call the server action function - make sure it's imported correctly
      const response = await getConnectionSchema(id)
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load schema data')
      }
      
      setSchemaData(response.data as SchemaData)
      
    } catch (err) {
      console.error('Error loading schema:', err)
      setError(err instanceof Error ? err.message : 'Failed to load schema data')
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshSchema = async () => {
    if (!connectionId) return
    
    try {
      setRefreshing(true)
      setError(null)
      
      // Reload schema
      await loadSchema(connectionId)
      
    } catch (err) {
      setError('Failed to refresh schema')
      console.error('Error refreshing schema:', err)
    } finally {
      setRefreshing(false)
    }
  }

  const handleExportSchema = async (format: 'json' | 'sql' | 'png') => {
    if (!schemaData) return
    
    try {
      // Implement export functionality here
      if (format === 'json') {
        const content = JSON.stringify(schemaData, null, 2)
        const blob = new Blob([content], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${schemaData.connectionName.replace(/\s+/g, '_')}_schema.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else if (format === 'sql') {
        // Generate SQL for the schema
        const content = generateSQLFromSchema(schemaData.tableSchema)
        const blob = new Blob([content], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${schemaData.connectionName.replace(/\s+/g, '_')}_schema.sql`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else if (format === 'png') {
        // PNG export would require canvas capture of the diagram
        alert('PNG export would capture the diagram as an image')
      }
    } catch (err) {
      setError('Failed to export schema')
      console.error('Error exporting schema:', err)
    }
  }

  const generateSQLFromSchema = (tableSchema: TableSchema[]): string => {
    const sqlStatements = tableSchema.map(table => {
      const columns = table.columns.map(col => {
        let columnDef = `  ${col.column_name} ${col.data_type}`
        
        if (col.character_maximum_length) {
          columnDef += `(${col.character_maximum_length})`
        }
        
        if (col.is_nullable === 'NO') {
          columnDef += ' NOT NULL'
        }
        
        if (col.column_default) {
          columnDef += ` DEFAULT ${col.column_default}`
        }
        
        return columnDef
      })
      
      // Add primary key constraint
      const primaryKeys = table.columns.filter(col => col.is_primary_key).map(col => col.column_name)
      if (primaryKeys.length > 0) {
        columns.push(`  PRIMARY KEY (${primaryKeys.join(', ')})`)
      }
      
      return `CREATE TABLE ${table.tableName} (\n${columns.join(',\n')}\n);`
    })
    
    return `-- Schema export\n-- Generated on ${new Date().toISOString()}\n\n${sqlStatements.join('\n\n')}`
  }

  const getDataTypeColor = (dataType: string) => {
    if (dataType.includes('int') || dataType.includes('serial')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    if (dataType.includes('varchar') || dataType.includes('text')) return 'bg-green-500/20 text-green-400 border-green-500/30'
    if (dataType.includes('timestamp') || dataType.includes('date')) return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    if (dataType.includes('boolean')) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    if (dataType.includes('decimal') || dataType.includes('numeric')) return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
          <p className="text-gray-600">Loading schema diagram...</p>
        </div>
      </div>
    )
  }

  if (error && !schemaData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Failed to Load Schema</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-x-3">
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            <Button onClick={() => loadSchema(connectionId)} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.back()}
              className="text-gray-500"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="h-6 w-px bg-gray-200" />
            <div className="flex items-center gap-3">
              <Database className="h-6 w-6 text-blue-500" />
              <div>
                <h1 className="text-xl font-semibold">
                  {schemaData?.connectionName || 'Database Schema'}
                </h1>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span>{schemaData?.dbType.toUpperCase()}</span>
                  <span>•</span>
                  <span>Connection #{connectionId}</span>
                  <span>•</span>
                  <span>Updated {schemaData ? new Date(schemaData.lastUpdated).toLocaleDateString() : 'Unknown'}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefreshSchema}
              disabled={refreshing}
              className="text-gray-500"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button variant="outline" size="sm" className="text-gray-500">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        {schemaData && (
          <div className="flex items-center gap-6 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{schemaData.stats.totalTables}</div>
              <div className="text-xs text-gray-500">Tables</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{schemaData.stats.totalColumns}</div>
              <div className="text-xs text-gray-500">Columns</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{schemaData.stats.totalPrimaryKeys}</div>
              <div className="text-xs text-gray-500">Primary Keys</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{schemaData.stats.totalRelationships}</div>
              <div className="text-xs text-gray-500">Relationships</div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      {schemaData ? (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'diagram' | 'tables')} className="flex-1">
          <div className="bg-white border-b border-gray-200 px-6 py-3">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="diagram">
                  <Eye className="h-4 w-4 mr-2" />
                  ERD Diagram
                </TabsTrigger>
                <TabsTrigger value="tables">
                  <List className="h-4 w-4 mr-2" />
                  Tables ({schemaData.stats.totalTables})
                </TabsTrigger>
              </TabsList>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleExportSchema('json')}
                  className="text-gray-500"
                >
                  <FileJson className="h-4 w-4 mr-2" />
                  JSON
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleExportSchema('sql')}
                  className="text-gray-500"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  SQL
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleExportSchema('png')}
                  className="text-gray-500"
                >
                  <Image className="h-4 w-4 mr-2" />
                  PNG
                </Button>
              </div>
            </div>
          </div>

          <TabsContent value="diagram" className="m-0 p-6">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm h-[calc(100vh-250px)]">
              <ERDDiagram
                connectionId={connectionId}
                schemaData={schemaData.tableSchema}
                onTableSelect={setSelectedTable}
                onExport={handleExportSchema}
              />
            </div>
          </TabsContent>

          <TabsContent value="tables" className="m-0 p-6 h-[calc(100vh-220px)] overflow-y-auto">
            <div className="grid gap-6">
              {schemaData.tableSchema.map(table => (
                <Card 
                  key={table.tableName} 
                  className={`border-gray-200 transition-all duration-200 ${
                    selectedTable === table.tableName ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-blue-600">
                      <Database className="h-5 w-5" />
                      {table.tableName}
                      <Badge variant="outline" className="ml-auto border-gray-300 text-gray-600">
                        {table.columnCount} columns
                      </Badge>
                      {selectedTable === table.tableName && (
                        <Badge variant="default" className="bg-blue-600 text-white">
                          Selected
                        </Badge>
                      )}
                    </CardTitle>
                    {table.relationships && table.relationships.length > 0 && (
                      <CardDescription>
                        {table.relationships.length} relationship{table.relationships.length !== 1 ? 's' : ''}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left p-2 text-gray-600">Column</th>
                            <th className="text-left p-2 text-gray-600">Type</th>
                            <th className="text-left p-2 text-gray-600">Nullable</th>
                            <th className="text-left p-2 text-gray-600">Default</th>
                            <th className="text-left p-2 text-gray-600">Constraints</th>
                          </tr>
                        </thead>
                        <tbody>
                          {table.columns.map(column => (
                            <tr key={column.column_name} className="border-b border-gray-100">
                              <td className="p-2">
                                <div className="flex items-center gap-2">
                                  {column.is_primary_key && <div className="w-3 h-3 bg-yellow-400 rounded-full" title="Primary Key" />}
                                  {column.is_foreign_key && !column.is_primary_key && <div className="w-3 h-3 bg-blue-400 rounded-full" title="Foreign Key" />}
                                  <span className="font-mono text-gray-800">
                                    {column.column_name}
                                  </span>
                                </div>
                              </td>
                              <td className="p-2">
                                <Badge variant="outline" className={getDataTypeColor(column.data_type)}>
                                  {column.data_type}
                                  {column.character_maximum_length && `(${column.character_maximum_length})`}
                                </Badge>
                              </td>
                              <td className="p-2 text-gray-600">
                                {column.is_nullable === 'NO' ? 'No' : 'Yes'}
                              </td>
                              <td className="p-2 text-gray-600 font-mono text-xs">
                                {column.column_default || '-'}
                              </td>
                              <td className="p-2">
                                <div className="flex gap-1 flex-wrap">
                                  {column.is_primary_key && (
                                    <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300">
                                      PRIMARY KEY
                                    </Badge>
                                  )}
                                  {column.is_foreign_key && column.foreign_table && (
                                    <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">
                                      FK → {column.foreign_table}
                                    </Badge>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <Database className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Schema Data</h3>
            <p className="text-gray-500">Unable to load schema information for this connection</p>
          </div>
        </div>
      )}
    </div>
  );
}
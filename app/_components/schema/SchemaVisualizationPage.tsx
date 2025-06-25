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
  Activity,
  BarChart3,
  Users,
  Server,
  Clock,
  CheckCircle2,
  Wifi,
  Shield
} from 'lucide-react'

// Mock data - replace with actual data fetching
const mockSchemaData = {
  connectionId: 1,
  connectionName: "Music Production Database",
  dbType: "postgresql",
  host: "db.example.com",
  lastUpdated: "2024-01-15T10:30:00Z",
  status: "connected",
  tableSchema: [
    {
      tableName: "songs",
      columnCount: 12,
      columns: [
        { column_name: "id", data_type: "varchar(36)", is_nullable: "NO", is_primary_key: true, is_foreign_key: false },
        { column_name: "album_id", data_type: "int", is_nullable: "NO", is_primary_key: false, is_foreign_key: true, foreign_table: "albums", foreign_column: "id" },
        { column_name: "artist_id", data_type: "int", is_nullable: "YES", is_primary_key: false, is_foreign_key: true, foreign_table: "artists", foreign_column: "id" },
        { column_name: "title", data_type: "varchar", is_nullable: "NO" },
        { column_name: "length", data_type: "float", is_nullable: "NO" },
        { column_name: "track", data_type: "int", is_nullable: "YES" },
        { column_name: "disc", data_type: "int", is_nullable: "NO" },
        { column_name: "lyrics", data_type: "text", is_nullable: "YES" },
        { column_name: "path", data_type: "text", is_nullable: "NO" },
        { column_name: "mtime", data_type: "int", is_nullable: "NO" },
        { column_name: "created_at", data_type: "datetime", is_nullable: "NO" },
        { column_name: "updated_at", data_type: "datetime", is_nullable: "YES" }
      ]
    },
    {
      tableName: "albums",
      columnCount: 6,
      columns: [
        { column_name: "id", data_type: "int", is_nullable: "NO", is_primary_key: true },
        { column_name: "artist_id", data_type: "int", is_nullable: "NO", is_foreign_key: true, foreign_table: "artists" },
        { column_name: "name", data_type: "varchar", is_nullable: "NO" },
        { column_name: "cover", data_type: "varchar", is_nullable: "YES" },
        { column_name: "created_at", data_type: "datetime", is_nullable: "NO" },
        { column_name: "updated_at", data_type: "datetime", is_nullable: "YES" }
      ]
    },
    {
      tableName: "artists",
      columnCount: 5,
      columns: [
        { column_name: "id", data_type: "int", is_nullable: "NO", is_primary_key: true },
        { column_name: "name", data_type: "varchar", is_nullable: "NO" },
        { column_name: "image", data_type: "varchar", is_nullable: "YES" },
        { column_name: "created_at", data_type: "datetime", is_nullable: "NO" },
        { column_name: "updated_at", data_type: "datetime", is_nullable: "YES" }
      ]
    }
  ],
  stats: {
    totalTables: 3,
    totalColumns: 23,
    totalPrimaryKeys: 3,
    totalForeignKeys: 3,
    totalRelationships: 4
  }
};

export default function SchemaPage() {
  const params = useParams()
  const router = useRouter()
  const connectionId = parseInt(params?.connectionId as string)
  
  const [schemaData, setSchemaData] = useState(mockSchemaData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'diagram' | 'tables'>('diagram')

  const handleRefreshSchema = async () => {
    setRefreshing(true)
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false)
    }, 2000)
  }

  const handleExportSchema = async (format: 'json' | 'sql' | 'png') => {
    // Export implementation would go here
    console.log(`Exporting as ${format}`)
  }

  const getDataTypeColor = (dataType: string) => {
    if (dataType.includes('int') || dataType.includes('serial')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    if (dataType.includes('varchar') || dataType.includes('text')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    if (dataType.includes('timestamp') || dataType.includes('date')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    if (dataType.includes('boolean')) return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    if (dataType.includes('decimal') || dataType.includes('numeric')) return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <RefreshCw className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
            <div className="absolute inset-0 h-12 w-12 bg-blue-500/20 rounded-full blur-xl mx-auto"></div>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Loading Schema</h2>
          <p className="text-gray-400">Analyzing database structure...</p>
        </div>
      </div>
    )
  }

  if (error && !schemaData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-white mb-4">Failed to Load Schema</h2>
          <p className="text-gray-400 mb-8">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={() => router.back()} 
              variant="outline"
              className="bg-white/5 border-white/20 hover:bg-white/10 text-gray-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            <Button 
              onClick={handleRefreshSchema}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Stars Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(59, 130, 246, 0.15) 1px, transparent 0)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      <div className="relative z-10">
        {/* Enhanced Header */}
        <div className="bg-black/40 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => router.back()}
                  className="text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Connections
                </Button>
                <div className="h-6 w-px bg-white/20" />
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg">
                    <Database className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                      {schemaData?.connectionName || 'Database Schema'}
                    </h1>
                    <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 uppercase text-xs">
                          {schemaData?.dbType}
                        </Badge>
                        <span>•</span>
                        <span>Connection #{connectionId}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>Updated {new Date(schemaData.lastUpdated).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                        <span className="text-green-400">Connected</span>
                      </div>
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
                  className="bg-white/5 border-white/20 hover:bg-white/10 text-gray-300"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-white/5 border-white/20 hover:bg-white/10 text-gray-300"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configure
                </Button>
              </div>
            </div>

            {/* Connection Health Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Wifi className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-green-400 font-semibold">Connected</p>
                    <p className="text-xs text-gray-400">Connection is healthy</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Server className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">{schemaData.host}</p>
                    <p className="text-xs text-gray-400">Database Host</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Shield className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">SSL Enabled</p>
                    <p className="text-xs text-gray-400">Secure Connection</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Schema Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Database className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{schemaData.stats.totalTables}</p>
                    <p className="text-xs text-gray-400">Tables</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{schemaData.stats.totalColumns}</p>
                    <p className="text-xs text-gray-400">Columns</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Activity className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{schemaData.stats.totalPrimaryKeys}</p>
                    <p className="text-xs text-gray-400">Primary Keys</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Users className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{schemaData.stats.totalForeignKeys}</p>
                    <p className="text-xs text-gray-400">Foreign Keys</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-500/20 rounded-lg">
                    <Activity className="h-5 w-5 text-teal-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{schemaData.stats.totalRelationships}</p>
                    <p className="text-xs text-gray-400">Relationships</p>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div>
                    <p className="text-red-400 font-semibold">Connection Issue</p>
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'diagram' | 'tables')}>
            <div className="flex items-center justify-between mb-6">
              <TabsList className="bg-white/5 border border-white/20">
                <TabsTrigger 
                  value="diagram"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  ERD Diagram
                </TabsTrigger>
                <TabsTrigger 
                  value="tables"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white"
                >
                  <List className="h-4 w-4 mr-2" />
                  Tables ({schemaData.stats.totalTables})
                </TabsTrigger>
              </TabsList>
              
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleExportSchema('json')}
                  className="bg-white/5 border-white/20 hover:bg-white/10 text-gray-300"
                >
                  <FileJson className="h-4 w-4 mr-2" />
                  JSON
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleExportSchema('sql')}
                  className="bg-white/5 border-white/20 hover:bg-white/10 text-gray-300"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  SQL
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleExportSchema('png')}
                  className="bg-white/5 border-white/20 hover:bg-white/10 text-gray-300"
                >
                  <Image className="h-4 w-4 mr-2" />
                  PNG
                </Button>
              </div>
            </div>

            <TabsContent value="diagram" className="m-0">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl shadow-2xl h-[calc(100vh-400px)]">
                {/* ERD Diagram Component would be integrated here */}
                <div className="h-full flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Database className="h-20 w-20 mx-auto mb-6 opacity-50" />
                    <h3 className="text-2xl font-semibold text-white mb-3">ERD Diagram</h3>
                    <p className="text-lg text-gray-400 mb-4">Interactive database schema visualization</p>
                    <Button 
                      variant="outline"
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
                    >
                      Load Diagram
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tables" className="m-0">
              <div className="grid gap-6">
                {schemaData.tableSchema.map(table => (
                  <Card 
                    key={table.tableName} 
                    className={`bg-white/5 backdrop-blur-sm border-white/10 overflow-hidden transition-all duration-200 hover:bg-white/10 hover:border-white/20 ${
                      selectedTable === table.tableName ? 'ring-2 ring-blue-500 border-blue-500/50' : ''
                    }`}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg">
                            <Database className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-white text-xl flex items-center gap-3">
                              {table.tableName}
                              {selectedTable === table.tableName && (
                                <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs">
                                  Selected
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription className="text-gray-400 mt-1">
                              {table.columnCount} columns • {table.columns.filter(col => col.is_primary_key).length} primary keys • {table.columns.filter(col => col.is_foreign_key).length} foreign keys
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="border-white/20 text-gray-300 bg-white/5 px-3 py-1">
                            {table.columnCount} columns
                          </Badge>
                          <Button
                            variant={selectedTable === table.tableName ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedTable(selectedTable === table.tableName ? null : table.tableName)}
                            className={selectedTable === table.tableName 
                              ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0" 
                              : "bg-white/5 border-white/20 hover:bg-white/10 text-gray-300"
                            }
                          >
                            {selectedTable === table.tableName ? 'Selected' : 'Select'}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-white/10 bg-white/5">
                                <th className="text-left p-4 text-gray-300 font-semibold">Column</th>
                                <th className="text-left p-4 text-gray-300 font-semibold">Type</th>
                                <th className="text-left p-4 text-gray-300 font-semibold">Nullable</th>
                                <th className="text-left p-4 text-gray-300 font-semibold">Default</th>
                                <th className="text-left p-4 text-gray-300 font-semibold">Constraints</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                              {table.columns.map((column, index) => (
                                <tr 
                                  key={column.column_name} 
                                  className={`hover:bg-white/5 transition-colors ${
                                    column.is_primary_key ? 'bg-amber-500/5 border-l-4 border-amber-500' : 
                                    column.is_foreign_key ? 'bg-blue-500/5 border-l-4 border-blue-500' : ''
                                  }`}
                                >
                                  <td className="p-4">
                                    <div className="flex items-center gap-3">
                                      {column.is_primary_key && (
                                        <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-500/30" title="Primary Key">
                                          <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                                        </div>
                                      )}
                                      {column.is_foreign_key && !column.is_primary_key && (
                                        <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full border border-white/20" 
                                             title={`Foreign Key to ${column.foreign_table}`} />
                                      )}
                                      <div className="flex flex-col">
                                        <span className="font-mono text-white font-semibold text-base">
                                          {column.column_name}
                                        </span>
                                        {column.is_foreign_key && column.foreign_table && (
                                          <span className="text-xs text-blue-400 font-medium">
                                            → references {column.foreign_table}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <Badge 
                                      variant="outline" 
                                      className={`${getDataTypeColor(column.data_type)} font-mono text-xs px-3 py-1`}
                                    >
                                      {column.data_type}
                                    </Badge>
                                  </td>
                                  <td className="p-4">
                                    <div className="flex items-center gap-2">
                                      {column.is_nullable === 'NO' ? (
                                        <>
                                          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                                          <span className="text-red-400 text-sm font-medium">Required</span>
                                        </>
                                      ) : (
                                        <>
                                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                          <span className="text-gray-400 text-sm">Optional</span>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-4 text-gray-400 font-mono text-xs">
                                    {column.column_default ? (
                                      <code className="bg-white/10 px-2 py-1 rounded text-gray-300">
                                        {column.column_default}
                                      </code>
                                    ) : (
                                      <span className="text-gray-500">NULL</span>
                                    )}
                                  </td>
                                  <td className="p-4">
                                    <div className="flex gap-2 flex-wrap">
                                      {column.is_primary_key && (
                                        <Badge 
                                          variant="outline" 
                                          className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/30 font-medium"
                                        >
                                          PRIMARY KEY
                                        </Badge>
                                      )}
                                      {column.is_foreign_key && column.foreign_table && (
                                        <Badge 
                                          variant="outline" 
                                          className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30 font-medium"
                                        >
                                          FK → {column.foreign_table}
                                        </Badge>
                                      )}
                                      {column.is_nullable === 'NO' && !column.is_primary_key && (
                                        <Badge 
                                          variant="outline" 
                                          className="text-xs bg-red-500/10 text-red-400 border-red-500/30 font-medium"
                                        >
                                          NOT NULL
                                        </Badge>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Table Actions */}
                      <div className="mt-6 flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span className="flex items-center gap-2">
                            <Database className="h-4 w-4" />
                            {table.columnCount} columns
                          </span>
                          <span className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                            {table.columns.filter(col => col.is_primary_key).length} primary keys
                          </span>
                          <span className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                            {table.columns.filter(col => col.is_foreign_key).length} foreign keys
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-white/5 border-white/20 hover:bg-white/10 text-gray-300 text-xs"
                          >
                            View Data
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-white/5 border-white/20 hover:bg-white/10 text-gray-300 text-xs"
                          >
                            Generate SQL
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <style jsx>{`
        /* Custom scrollbar styles */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #2563eb, #7c3aed);
        }

        /* Smooth animations */
        * {
          transition: all 0.2s ease;
        }
      `}</style>
    </div>
  );
}
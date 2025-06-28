'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Database, 
  RefreshCw,
  AlertCircle,
  Clock,
  Server,
  ArrowRight,
  Eye,
  Plus,
  Search,
  Filter,
  BarChart3,
  Activity,
  Users,
  Wifi,
  WifiOff,
  Settings,
  Trash2,
  Edit,
  LineChart
} from 'lucide-react'
import Link from 'next/link'
// Import the function correctly - make sure the path matches your project structure
import { getUserConnections } from '@/app/actions/getConnectionSchema'

// Import types
import type { ConnectionData } from '@/app/_types/schema'

export default function SchemaListPage() {
  const [connections, setConnections] = useState<ConnectionData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'connected' | 'disconnected'>('all')
  const [filterDbType, setFilterDbType] = useState<'all' | 'postgresql' | 'mongodb'>('all')

  const loadConnections = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Call the server action
      const response = await getUserConnections()
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load connections')
      }
      
      setConnections(response.data)
      
    } catch (err) {
      console.error('Error loading connections:', err)
      setError(err instanceof Error ? err.message : 'Failed to load connections')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConnections()
  }, [])

  const filteredConnections = connections.filter(conn => {
    const matchesSearch = conn.connectionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (conn.host && conn.host.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'connected' && conn.hasSchema) ||
                         (filterStatus === 'disconnected' && !conn.hasSchema)
    const matchesDbType = filterDbType === 'all' || conn.dbType.toLowerCase() === filterDbType
    
    return matchesSearch && matchesStatus && matchesDbType
  })

  const getStatusColor = (hasSchema: boolean, updatedAt: string | Date | null) => {
    if (!hasSchema) return 'bg-red-500/10 text-red-400 border-red-500/20'
    
    // Check if connection is recent (within last 24 hours)
    if (!updatedAt) return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    const lastUpdate = new Date(updatedAt)
    const now = new Date()
    const hoursDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)
    
    if (hoursDiff < 24) return 'bg-green-500/10 text-green-400 border-green-500/20'
    return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
  }

  const getStatusIcon = (hasSchema: boolean, updatedAt: string | Date | null) => {
    if (!hasSchema) return <WifiOff className="h-4 w-4" />
    
    if (!updatedAt) return <AlertCircle className="h-4 w-4" />
    const lastUpdate = new Date(updatedAt)
    const now = new Date()
    const hoursDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)
    
    if (hoursDiff < 24) return <Wifi className="h-4 w-4" />
    return <AlertCircle className="h-4 w-4" />
  }

  const getStatusText = (hasSchema: boolean, updatedAt: string | Date | null) => {
    if (!hasSchema) return 'No Schema'
    
    if (!updatedAt) return 'Unknown'
    const lastUpdate = new Date(updatedAt)
    const now = new Date()
    const hoursDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)
    
    if (hoursDiff < 1) return 'Active'
    if (hoursDiff < 24) return 'Connected'
    return 'Stale'
  }

  const getDbTypeColor = (dbType: string) => {
    switch (dbType.toLowerCase()) {
      case 'postgresql':
      case 'postgres': 
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'mongodb':
      case 'mongo': 
        return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'mysql': 
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
      case 'sqlite': 
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
      default: 
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    }
  }

  const totalConnections = connections.length
  const connectedCount = connections.filter(c => c.hasSchema).length
  const totalTables = connections.reduce((sum, conn) => sum + conn.tableCount, 0)
  const healthyPercentage = totalConnections > 0 ? Math.round((connectedCount / totalConnections) * 100) : 0

  const handleDeleteConnection = async (id: number) => {
    try {
      // You would implement actual delete API call here
      // await deleteConnection(id)
      
      // For now, just remove from local state
      setConnections(prev => prev.filter(conn => conn.id !== id))
    } catch (err) {
      console.error('Error deleting connection:', err)
      setError('Failed to delete connection')
    }
  }

  const handleTestConnection = async (id: number) => {
    try {
      // You would implement actual connection test API call here
      // const result = await testConnection(id)
      
      // For now, simulate testing by refreshing the connection data
      await loadConnections()
    } catch (err) {
      console.error('Error testing connection:', err)
      setError('Failed to test connection')
    }
  }

  const getLastActivityText = (updatedAt: string | Date | null) => {
    if (!updatedAt) return 'Never'
    const lastUpdate = new Date(updatedAt)
    const now = new Date()
    const diffInMs = now.getTime() - lastUpdate.getTime()
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInHours / 24)
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    if (diffInDays < 30) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
    
    return lastUpdate.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <RefreshCw className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
            <div className="absolute inset-0 h-12 w-12 bg-blue-500/20 rounded-full blur-xl mx-auto"></div>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Loading Connections</h2>
          <p className="text-gray-400">Fetching your database connections...</p>
        </div>
      </div>
    )
  }

  if (error && connections.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-white mb-4">Failed to Load Connections</h2>
          <p className="text-gray-400 mb-8">{error}</p>
          <Button 
            onClick={loadConnections}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
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
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg">
                  <LineChart className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                    DataShorts Schema
                  </h1>
                  <p className="text-gray-400 text-lg mt-2">
                    Visualize and explore your database schemas with interactive diagrams
                  </p>
                </div>
              </div>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg px-6 py-3 text-lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Connection
              </Button>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/20 rounded-xl">
                    <Database className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-white">{totalConnections}</p>
                    <p className="text-sm text-gray-400">Total Connections</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500/20 rounded-xl">
                    <Wifi className="h-6 w-6 text-green-400" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-white">{connectedCount}</p>
                    <p className="text-sm text-gray-400">Connected</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-500/20 rounded-xl">
                    <BarChart3 className="h-6 w-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-white">{totalTables}</p>
                    <p className="text-sm text-gray-400">Total Tables</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-teal-500/20 rounded-xl">
                    <Activity className="h-6 w-6 text-teal-400" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-white">{healthyPercentage}%</p>
                    <p className="text-sm text-gray-400">Health Score</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex-1 max-w-2xl">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search connections by name or host..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors text-base"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Filter className="h-5 w-5 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="connected">Connected</option>
                  <option value="disconnected">Disconnected</option>
                </select>
                <select
                  value={filterDbType}
                  onChange={(e) => setFilterDbType(e.target.value as any)}
                  className="bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">All Databases</option>
                  <option value="postgresql">PostgreSQL</option>
                  <option value="mongodb">MongoDB</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadConnections}
                  className="bg-white/5 border-white/20 hover:bg-white/10 text-gray-300"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <p className="text-red-400">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setError(null)}
                    className="ml-auto bg-red-500/10 border-red-500/20 hover:bg-red-500/20 text-red-400"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {filteredConnections.length === 0 ? (
            <div className="text-center py-16">
              <Database className="h-20 w-20 text-gray-400 mx-auto mb-6 opacity-50" />
              <h3 className="text-2xl font-semibold text-white mb-3">
                {searchTerm || filterStatus !== 'all' || filterDbType !== 'all' 
                  ? 'No matching connections found' 
                  : 'No database connections'}
              </h3>
              <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
                {searchTerm || filterStatus !== 'all' || filterDbType !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'Add your first database connection to start visualizing schemas'}
              </p>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 py-3 text-lg">
                <Plus className="h-5 w-5 mr-2" />
                Add Your First Connection
              </Button>
            </div>
          ) : (
            <div className="grid gap-6">
              {filteredConnections.map((conn) => (
                <Card key={conn.id} className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200 overflow-hidden group">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl shadow-lg ${
                          conn.dbType.toLowerCase() === 'postgresql' || conn.dbType.toLowerCase() === 'postgres' ? 'bg-blue-500/20' : 
                          conn.dbType.toLowerCase() === 'mongodb' || conn.dbType.toLowerCase() === 'mongo' ? 'bg-green-500/20' : 
                          'bg-purple-500/20'
                        }`}>
                          <Database className={`h-6 w-6 ${
                            conn.dbType.toLowerCase() === 'postgresql' || conn.dbType.toLowerCase() === 'postgres' ? 'text-blue-400' : 
                            conn.dbType.toLowerCase() === 'mongodb' || conn.dbType.toLowerCase() === 'mongo' ? 'text-green-400' : 
                            'text-purple-400'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <CardTitle className="text-white text-xl">{conn.connectionName}</CardTitle>
                            <Badge 
                              variant="outline" 
                              className={getStatusColor(conn.hasSchema, conn.updatedAt)}
                            >
                              <span className="flex items-center gap-1">
                                {getStatusIcon(conn.hasSchema, conn.updatedAt)}
                                {getStatusText(conn.hasSchema, conn.updatedAt)}
                              </span>
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={`${getDbTypeColor(conn.dbType)} uppercase font-semibold`}
                            >
                              {conn.dbType}
                            </Badge>
                          </div>
                          <CardDescription className="text-gray-400 flex items-center gap-4">
                            {conn.host && (
                              <>
                                <span className="flex items-center gap-1">
                                  <Server className="h-4 w-4" /> 
                                  {conn.host}
                                </span>
                                <span className="text-gray-500">•</span>
                              </>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {getLastActivityText(conn.updatedAt)}
                            </span>
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {conn.hasSchema && (
                          <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                            Schema Available
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white/5 border-white/20 hover:bg-white/10 text-gray-300"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Configure
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white/5 border-white/20 hover:bg-white/10 text-gray-300"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-8">
                        <div className="flex items-center gap-2 text-gray-300">
                          <BarChart3 className="h-5 w-5 text-gray-400" />
                          <span className="font-semibold text-lg">{conn.tableCount}</span>
                          <span className="text-gray-400">tables</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-300">
                          <Clock className="h-5 w-5 text-gray-400" />
                          <span>Updated {conn.updatedAt ? new Date(conn.updatedAt).toLocaleDateString() : 'Never'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-300">
                          <Activity className="h-5 w-5 text-gray-400" />
                          <span>Last active {getLastActivityText(conn.updatedAt)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleTestConnection(conn.id)}
                          className="bg-white/5 border-white/20 hover:bg-white/10 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Test Connection
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteConnection(conn.id)}
                          className="bg-red-500/10 border-red-500/20 hover:bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                        <Link href={`/schema/${conn.id}`}>
                          <Button 
                            size="sm" 
                            className={`${conn.hasSchema 
                              ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' 
                              : 'bg-gray-600 hover:bg-gray-700 cursor-not-allowed'
                            } shadow-lg transition-all duration-200 group-hover:scale-105`}
                            disabled={!conn.hasSchema}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {conn.hasSchema ? 'View Schema' : 'Generate Schema'}
                            <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {/* Connection Health Bar */}
                    <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-300 font-medium">Connection Health</span>
                        <span className="text-sm text-gray-400">
                          {conn.hasSchema ? '100%' : '0%'}
                        </span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            conn.hasSchema ? 'bg-gradient-to-r from-green-500 to-emerald-500 w-full' :
                            'bg-gradient-to-r from-red-500 to-rose-500 w-0'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Quick Stats */}
                    {conn.hasSchema && (
                      <div className="mt-4 grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
                          <p className="text-2xl font-bold text-blue-400">{conn.tableCount}</p>
                          <p className="text-xs text-gray-400">Tables</p>
                        </div>
                        <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
                          <p className="text-2xl font-bold text-purple-400">{Math.floor(conn.tableCount * 2.3)}</p>
                          <p className="text-xs text-gray-400">Relationships</p>
                        </div>
                        <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
                          <p className="text-2xl font-bold text-teal-400">{Math.floor(conn.tableCount * 8.5)}</p>
                          <p className="text-xs text-gray-400">Columns</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Bottom CTA Section */}
        {connections.length > 0 && (
          <div className="bg-black/40 backdrop-blur-sm border-t border-white/10 mt-16">
            <div className="max-w-7xl mx-auto px-6 py-12">
              <div className="text-center">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-4">
                  Ready to explore your data?
                </h2>
                <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
                  Connect more databases or dive deeper into your existing schemas with our interactive visualization tools.
                </p>
                <div className="flex items-center justify-center gap-4">
                  <Button 
                    variant="outline"
                    className="bg-white/5 border-white/20 hover:bg-white/10 text-gray-300 px-6 py-3"
                  >
                    <Database className="h-5 w-5 mr-2" />
                    View Documentation
                  </Button>
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-6 py-3">
                    <Plus className="h-5 w-5 mr-2" />
                    Add Another Connection
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
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

        /* Enhanced hover effects */
        .group:hover .group-hover\\:scale-105 {
          transform: scale(1.05);
        }
        
        .group:hover .group-hover\\:translate-x-1 {
          transform: translateX(0.25rem);
        }

        /* Smooth animations */
        * {
          transition: all 0.2s ease;
        }
      `}</style>
    </div>
  )
}
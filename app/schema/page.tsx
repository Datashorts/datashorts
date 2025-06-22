// File: app/schema/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Database, 
  RefreshCw,
  AlertCircle,
  Clock,
  Server,
  ArrowRight,
  Eye
} from 'lucide-react'
import Link from 'next/link'
// Import the function correctly - make sure the path matches your project structure
import { getUserConnections } from '@/app/actions/getConnectionSchema'

// Import types
import type { ConnectionData } from '@/app/_types/schema'

export default function SchemaListPage() {
  const [connections, setConnections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadConnections()
  }, [])

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
          <p className="text-gray-600">Loading connections...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Failed to Load Connections</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={loadConnections} className="bg-blue-600 hover:bg-blue-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-800">Database Schema Visualizer</h1>
          </div>
          <Button>
            Add Connection
          </Button>
        </div>
        
        <div className="grid gap-6">
          {connections.map((conn) => (
            <Card key={conn.id} className="border-gray-200 hover:border-blue-200 hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      conn.dbType === 'postgres' ? 'bg-blue-100 text-blue-600' : 
                      conn.dbType === 'mongodb' ? 'bg-green-100 text-green-600' : 
                      'bg-purple-100 text-purple-600'
                    }`}>
                      <Database className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>{conn.connectionName}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {conn.dbType}
                        </Badge>
                        {conn.host && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Server className="h-3 w-3" /> 
                              {conn.host}
                            </span>
                          </>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <div>
                    <Badge variant={conn.hasSchema ? 'default' : 'outline'} className={
                      conn.hasSchema ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'text-amber-700 border-amber-300'
                    }>
                      {conn.hasSchema ? 'Schema Available' : 'No Schema'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Database className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{conn.tableCount}</span>
                      <span className="text-gray-500">tables</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>Updated {new Date(conn.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => loadConnections()}
                      className="text-gray-500"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                    <Link href={`/schema/${conn.id}`}>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <Eye className="h-4 w-4 mr-2" />
                        View Schema
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty state if no connections */}
        {connections.length === 0 && (
          <div className="text-center p-12 border-2 border-dashed border-gray-300 rounded-lg">
            <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Database Connections</h3>
            <p className="text-gray-500 mb-4">Add your first database connection to visualize its schema</p>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Add Connection
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
'use client'

import { useEffect } from 'react'
import Sidebar from '@/app/_components/chat/Sidebar'
import { useUser } from '@clerk/nextjs'
import { Database, TrendingUp, BarChart3, Activity, FolderIcon } from 'lucide-react'
import { useFoldersStore } from '@/app/store/useFoldersStore'
import { useRouter } from "next/navigation"

export default function StatsPage() {
  const { user } = useUser()
  const router = useRouter()
  const { 
    folders, 
    loadFolders,
    openCreateFolderModal,
    setActiveConnection 
  } = useFoldersStore()

  useEffect(() => {
    if (user) {
      loadFolders(user.id)
    }
  }, [user, loadFolders])

  // Count connections reactively
  const connectionCounts = folders.reduce(
    (counts, folder) => {
      folder.connections.forEach((conn) => {
        if (conn.type === 'postgres') counts.postgres += 1
        else if (conn.type === 'mongodb') counts.mongodb += 1
      })
      return counts
    },
    { postgres: 0, mongodb: 0 }
  )

  const totalConnections = connectionCounts.postgres + connectionCounts.mongodb
  const totalFolders = folders.length

  // Group ALL folders and connections (no artificial limits)
  const groupedActivity = folders.map(folder => ({
    folderName: folder.name,
    folderId: folder.id,
    connections: folder.connections,
    createdAt: folder.id // Use ID as a proxy for creation order
  })).filter(group => group.connections.length > 0)
  
  // Sort by most recent (highest ID = most recent)
  .sort((a, b) => b.createdAt - a.createdAt)

  const handleConnectionClick = (connectionId: string, dbName: string) => {
    setActiveConnection(connectionId)
    const endpoint = `/chats/${connectionId}/${encodeURIComponent(dbName)}`
    router.push(endpoint)
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        {/* Stars Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.15) 1px, transparent 0)`,
              backgroundSize: '50px 50px'
            }}
          />
        </div>
        <div className="text-center relative z-10">
          <h1 className="text-2xl font-bold mb-4 text-white">Authentication Required</h1>
          <p className="text-gray-400">Please sign in to view stats.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-black text-white relative overflow-hidden">
      {/* Stars Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.15) 1px, transparent 0)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Background gradients - contained within viewport */}
      <div className="absolute top-0 left-0 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl opacity-70 pointer-events-none z-0 transform -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-purple-500/5 blur-3xl opacity-70 pointer-events-none z-0 transform translate-x-1/2 translate-y-1/2" />

      <Sidebar />
      
      <div className="flex-1 p-8 overflow-y-auto relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Database <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-teal-500 bg-clip-text text-transparent">Statistics</span>
            </h1>
            <p className="text-xl text-gray-300">
              Monitor your database connections and activity
            </p>
          </div>

          {/* Stats Grid - Simplified */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {/* Total Folders */}
            <StatsCard
              title="Folders"
              value={totalFolders.toString()}
              icon={<FolderIcon className="h-5 w-5 text-purple-400" />}
              gradient="from-purple-500/10 to-pink-500/10"
            />

            {/* Total Connections */}
            <StatsCard
              title="Connections"
              value={totalConnections.toString()}
              icon={<Database className="h-5 w-5 text-blue-400" />}
              gradient="from-blue-500/10 to-purple-500/10"
            />

            {/* PostgreSQL */}
            <StatsCard
              title="PostgreSQL"
              value={connectionCounts.postgres.toString()}
              icon={<Database className="h-5 w-5 text-blue-500" />}
              gradient="from-blue-500/10 to-cyan-500/10"
            />

            {/* MongoDB */}
            <StatsCard
              title="MongoDB"
              value={connectionCounts.mongodb.toString()}
              icon={<Database className="h-5 w-5 text-green-500" />}
              gradient="from-green-500/10 to-teal-500/10"
            />
          </div>

          {/* Your Databases Section - Improved */}
          <div className="bg-black/20 border border-white/5 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-medium text-white">Your Databases</h3>
              <div className="flex items-center gap-3">
                {totalFolders > 0 && (
                  <span className="text-xs text-gray-500 bg-gray-800/30 px-2 py-1 rounded">
                    {totalFolders} folder{totalFolders !== 1 ? 's' : ''} • {totalConnections} connection{totalConnections !== 1 ? 's' : ''}
                  </span>
                )}
                <button 
                  onClick={() => openCreateFolderModal()}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 hover:bg-blue-500/20 px-2 py-1 rounded"
                >
                  + New Folder
                </button>
              </div>
            </div>
            
            {/* Scrollable container */}
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
              {groupedActivity.length > 0 ? (
                groupedActivity.map((group) => (
                  <div key={group.folderId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-400">
                        <FolderIcon className="h-3 w-3" />
                        <span className="text-sm">{group.folderName}</span>
                        <span className="text-xs text-gray-600">
                          {group.connections.length}
                        </span>
                      </div>
                      {group.connections.length > 6 && (
                        <span className="text-xs text-gray-600">
                          +{group.connections.length - 6} more
                        </span>
                      )}
                    </div>
                    
                    {/* Show all connections with responsive grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 ml-4">
                      {group.connections.slice(0, 8).map((connection) => (
                        <ConnectionCard
                          key={connection.id}
                          connection={connection}
                          onClick={() => handleConnectionClick(connection.id, connection.name)}
                        />
                      ))}
                    </div>
                    
                    {/* Show overflow indicator */}
                    {group.connections.length > 8 && (
                      <div className="ml-4">
                        <button className="text-xs text-gray-500 hover:text-gray-400 transition-colors bg-gray-800/30 hover:bg-gray-800/50 px-2 py-1 rounded">
                          + {group.connections.length - 8} more connections
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Database className="h-8 w-8 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No connections yet</p>
                  <button 
                    onClick={() => openCreateFolderModal()}
                    className="text-blue-400 text-sm hover:text-blue-300 transition-colors mt-1"
                  >
                    Create your first folder
                  </button>
                </div>
              )}
            </div>
          </div>

          <style jsx>{`
            .custom-scrollbar {
              scrollbar-width: thin;
              scrollbar-color: rgba(75, 85, 99, 0.5) transparent;
            }
            
            .custom-scrollbar::-webkit-scrollbar {
              width: 4px;
            }
            
            .custom-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }
            
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background-color: rgba(75, 85, 99, 0.5);
              border-radius: 2px;
            }
            
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background-color: rgba(75, 85, 99, 0.7);
            }
          `}</style>

          
        </div>
      </div>
    </div>
  )
}

// Connection Card Component - Minimalist
function ConnectionCard({ 
  connection, 
  onClick 
}: {
  connection: any
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group p-3 bg-white/5 hover:bg-white/8 rounded-lg transition-all duration-200 text-left w-full border border-transparent hover:border-white/10"
    >
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${
          connection.type === 'postgres' ? 'bg-blue-400' : 'bg-green-400'
        }`} />
        <p className="font-medium text-white text-sm truncate group-hover:text-blue-200 transition-colors">
          {connection.name}
        </p>
      </div>
    </button>
  )
}

// Stats Card Component - Simplified
function StatsCard({ 
  title, 
  value, 
  icon, 
  gradient 
}: {
  title: string
  value: string
  icon: React.ReactNode
  gradient: string
}) {
  return (
    <div className="group relative bg-black/20 border border-white/5 rounded-lg p-4 hover:bg-black/30 transition-all duration-300">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg`} />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="text-gray-400">
            {icon}
          </div>
        </div>
        
        <div className="text-2xl font-bold text-white mb-1">{value}</div>
        <div className="text-xs text-gray-400">{title}</div>
      </div>
    </div>
  )
}

// Quick Action Card Component - Minimal
function QuickActionCard({ 
  title, 
  icon,
  onClick
}: {
  title: string
  icon: React.ReactNode
  onClick?: () => void
}) {
  return (
    <button 
      onClick={onClick}
      className="group p-3 bg-white/5 hover:bg-white/8 rounded-lg transition-all duration-200 border border-transparent hover:border-white/10"
    >
      <div className="flex flex-col items-center gap-2">
        <div className="text-gray-400 group-hover:text-blue-400 transition-colors">
          {icon}
        </div>
        <span className="text-xs text-gray-300 group-hover:text-white transition-colors">{title}</span>
      </div>
    </button>
  )
}
'use client'

import { useEffect } from 'react'
import Sidebar from '@/app/_components/chat/Sidebar'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Database, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { useFoldersStore } from '@/app/store/useFoldersStore'

export default function StatsPage() {
  const { user } = useUser()
  const { folders, loadFolders } = useFoldersStore()

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

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#121212]">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-gray-400">Please sign in to view stat.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#121212] text-white">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-8">Database Statistics</h1>

        {/* Database Count Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">PostgreSQL Connections</CardTitle>
              <Database className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{connectionCounts.postgres}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MongoDB Connections</CardTitle>
              <Database className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{connectionCounts.mongodb}</div>
            </CardContent>
          </Card>
        </div>

        {/* Pinned Analytics Section */}
        <h2 className="text-xl font-semibold mb-4">📌 Pinned Analytics</h2>

        {folders.length === 0 ? (
          <div className="text-gray-400">No folders or connections found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {folders.flatMap((folder) =>
              folder.connections.map((conn) => (
                <Link
                  key={`${folder.id}-${conn.id}`}
                  href={`/chats/${conn.id}/${encodeURIComponent(conn.name)}/dashboard`}
                  className="hover:scale-[1.02] transition-transform"
                >
                  <Card className="bg-[#1a1a1a] border border-blue-900/20 hover:border-blue-500/30">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {folder.name} – {conn.name}
                      </CardTitle>
                      <BarChart3 className="h-4 w-4 text-yellow-400" />
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-400 text-sm">
                        {conn.type === 'postgres' ? 'PostgreSQL' : 'MongoDB'} Connection
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

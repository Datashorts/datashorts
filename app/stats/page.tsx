'use client'

import { useEffect } from 'react'
import Sidebar from '@/app/_components/chat/Sidebar'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Database } from 'lucide-react'
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
          <p className="text-gray-400">Please sign in to view stats.</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
      </div>
    </div>
  )
}
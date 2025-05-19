'use client'

import { useEffect, useState } from 'react'
import Sidebar from '@/app/_components/chat/Sidebar'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Database, BarChart3 } from 'lucide-react'
import Link from 'next/link'

interface Folder {
  id: number
  name: string
  connections: {
    id: string
    name: string
    type: 'postgres' | 'mongodb'
  }[]
}

export default function StatsPage() {
  const { user } = useUser()
  const [stats, setStats] = useState({ postgres: 0, mongodb: 0 })
  const [folders, setFolders] = useState<Folder[]>([])

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return

      try {
        const res = await fetch(`/api/connections?userId=${user.id}`)
        const connections = await res.json()
        const counts = {
          postgres: connections.filter((conn: any) => conn.dbType === 'postgres').length,
          mongodb: connections.filter((conn: any) => conn.dbType === 'mongodb').length
        }
        setStats(counts)
      } catch (error) {
        console.error('Error fetching stats:', error)
      }
    }

    const fetchFolders = async () => {
      if (!user) return

      try {
        const res = await fetch(`/api/folders-with-connections?userId=${user.id}`)
        const data = await res.json()
        setFolders(data)
      } catch (error) {
        console.error('Error fetching folders:', error)
      }
    }

    fetchStats()
    fetchFolders()
  }, [user])

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">PostgreSQL Connections</CardTitle>
              <Database className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.postgres}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MongoDB Connections</CardTitle>
              <Database className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.mongodb}</div>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-xl font-semibold mb-4">📌 Pinned Analytics</h2>
        {folders.length === 0 ? (
          <div className="text-gray-400">No folders or connections found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {folders.map((folder) => {
              const firstConn = folder.connections[0]
              return firstConn ? (
                <Link
                  href={`/chats/${firstConn.id}/${encodeURIComponent(firstConn.name)}/dashboard`}
                  key={folder.id}
                  className="hover:scale-[1.02] transition-transform"
                >
                  <Card className="bg-[#1a1a1a] border border-blue-900/20 hover:border-blue-500/30">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {folder.name}
                      </CardTitle>
                      <BarChart3 className="h-4 w-4 text-yellow-400" />
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-400 text-sm">
                        {firstConn.name} ({firstConn.type})
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ) : null
            })}
          </div>
        )}
      </div>
    </div>
  )
}

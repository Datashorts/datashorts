'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface BetaTester {
  id: number
  userId: string
  name: string
  email: string
  company: string | null
  role: string | null
  accepted: boolean
  createdAt: string
}

interface UserActivity {
  id: number
  userId: string
  ipAddress: string
  userAgent: string
  sessionStart: string
  sessionEnd: string | null
  lastActive: string
  pageVisits: {
    path: string
    timestamp: string
    duration: number
  }[]
  createdAt: string
}

interface UserWithActivity extends BetaTester {
  activity?: UserActivity[]
}

export default function AdminDashboard() {
  const { user } = useUser()
  const [betaTesters, setBetaTesters] = useState<UserWithActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('beta-testers')

  const fetchBetaTesters = async () => {
    try {
      const response = await fetch('/api/admin/beta-testers')
      if (!response.ok) throw new Error('Failed to fetch beta testers')
      const data = await response.json()
      setBetaTesters(data)
    } catch (error) {
      toast.error('Failed to fetch beta testers')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserActivity = async () => {
    try {
      const response = await fetch('/api/admin/user-activity')
      if (!response.ok) throw new Error('Failed to fetch user activity')
      const activityData = await response.json()
      

      setBetaTesters(prev => prev.map(tester => ({
        ...tester,
        activity: activityData.filter((a: UserActivity) => a.userId === tester.userId)
      })))
    } catch (error) {
      toast.error('Failed to fetch user activity')
    }
  }

  const updateBetaTesterStatus = async (id: number, accepted: boolean) => {
    try {
      const response = await fetch('/api/admin/beta-testers', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, accepted }),
      })

      if (!response.ok) throw new Error('Failed to update status')
      
      toast.success(`Beta tester ${accepted ? 'approved' : 'rejected'} successfully`)
      fetchBetaTesters()
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  useEffect(() => {
    fetchBetaTesters()
    fetchUserActivity()
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  const calculateTotalSessionTime = (activity: UserActivity[]) => {
    return activity.reduce((total, session) => {
      const start = new Date(session.sessionStart).getTime()
      const end = session.sessionEnd ? new Date(session.sessionEnd).getTime() : Date.now()
      return total + (end - start)
    }, 0)
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="beta-testers">Beta Testers</TabsTrigger>
          <TabsTrigger value="user-activity">User Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="beta-testers">
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Applied On</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {betaTesters.map((tester) => (
                  <TableRow key={tester.id}>
                    <TableCell>{tester.name}</TableCell>
                    <TableCell>{tester.email}</TableCell>
                    <TableCell>{tester.company || '-'}</TableCell>
                    <TableCell>{tester.role || '-'}</TableCell>
                    <TableCell>{new Date(tester.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        tester.accepted ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'
                      }`}>
                        {tester.accepted ? 'Approved' : 'Pending'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {!tester.accepted && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => updateBetaTesterStatus(tester.id, true)}
                          >
                            Approve
                          </Button>
                        )}
                        {tester.accepted && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateBetaTesterStatus(tester.id, false)}
                          >
                            Revoke
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="user-activity">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {betaTesters.map((tester) => (
              <Card key={tester.id} className="bg-[#1a1a1a] border-gray-800">
                <CardHeader>
                  <CardTitle className="text-lg">{tester.name}</CardTitle>
                  <p className="text-sm text-gray-400">{tester.email}</p>
                </CardHeader>
                <CardContent>
                  {tester.activity && tester.activity.length > 0 ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium">Total Sessions: {tester.activity.length}</p>
                        <p className="text-sm text-gray-400">
                          Total Time: {formatDuration(calculateTotalSessionTime(tester.activity))}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">Recent Activity:</p>
                        <div className="space-y-2">
                          {tester.activity.slice(-3).map((session, index) => (
                            <div key={index} className="text-sm">
                              <p className="text-gray-400">
                                {new Date(session.sessionStart).toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-500">
                                IP: {session.ipAddress}
                              </p>
                              <p className="text-xs text-gray-500">
                                Last Active: {new Date(session.lastActive).toLocaleString()}
                              </p>
                              <div className="mt-1">
                                {session.pageVisits.slice(-3).map((visit, vIndex) => (
                                  <p key={vIndex} className="text-xs text-gray-400">
                                    {visit.path} ({formatDuration(visit.duration)})
                                  </p>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No activity recorded</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 
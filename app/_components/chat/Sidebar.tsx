'use client'

import { useState, useEffect } from 'react'
import { useFoldersStore } from '@/app/store/useFoldersStore'
import { Folder, Connection } from '@/app/store/useFoldersStore'
import { ChevronDown, ChevronRight, Folder as FolderIcon, Database, Plus, Trash2, Loader2, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { useUser } from '@clerk/nextjs'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { embeddings } from '@/app/actions/chat'
import { processPipeline2Embeddings } from '@/app/actions/pipeline2Embeddings'
// mongodb+srv://karthiknadar1204:u31oziQ2NgYPhzS9@cluster0.eibha1d.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
export default function Sidebar() {
  const router = useRouter()
  const { user } = useUser()
  const { 
    folders, 
    activeFolderId, 
    activeConnectionId,
    isCreateFolderModalOpen,
    newFolderName,
    selectedConnectionForFolder,
    isLoading,
    setActiveFolder,
    setActiveConnection,
    openCreateFolderModal,
    closeCreateFolderModal,
    setNewFolderName,
    addFolder,
    removeFolder,
    addConnectionToFolder,
    setSelectedConnectionForFolder,
    loadFolders,
    removeConnectionFromFolder
  } = useFoldersStore()

  const [expandedFolders, setExpandedFolders] = useState<Record<number, boolean>>({})
  const [isCreateConnectionModalOpen, setIsCreateConnectionModalOpen] = useState(false)
  const [selectedFolderForConnection, setSelectedFolderForConnection] = useState<number | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [selectedPipeline, setSelectedPipeline] = useState<'karthik' | 'shive'>('karthik')
  const [newConnection, setNewConnection] = useState<Connection>({
    id: '',
    name: '',
    type: 'postgres',
    url: ''
  })

  useEffect(() => {
    if (user) {
      loadFolders(user.id)
    }
  }, [loadFolders, user])

  const toggleFolder = (folderId: number) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }))
  }

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed)
  }

  const handleCreateFolder = async () => {
    if (newFolderName.trim() && user) {
      await addFolder(user.id, newFolderName)
      

      if (selectedConnectionForFolder) {
        const folderId = folders[folders.length - 1].id
        addConnectionToFolder(folderId, selectedConnectionForFolder)
      }
    }
  }

  const openCreateConnectionModal = (folderId: number) => {
    setSelectedFolderForConnection(folderId)
    setIsCreateConnectionModalOpen(true)
  }

  const closeCreateConnectionModal = () => {
    setIsCreateConnectionModalOpen(false)
    setSelectedFolderForConnection(null)
    setNewConnection({
      id: '',
      name: '',
      type: 'postgres',
      url: ''
    })
  }


  const generateConnectionEndpoint = (connectionId: string, dbName: string) => {
    return `/chats/${connectionId}/${encodeURIComponent(dbName)}`
  }

  const handleCreateConnection = async () => {
    if (newConnection.name && selectedFolderForConnection) {
      try {
        useFoldersStore.setState({ isLoading: true })
        
        if (selectedPipeline === 'shive') {

          const response = await fetch('/api/connectdb-persistent', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: newConnection.name,
              type: newConnection.type,
              url: newConnection.url,
              folderId: selectedFolderForConnection
            })
          })
          
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to establish persistent connection')
          }
          
          const data = await response.json()
          console.log('Persistent connection established successfully:', data)
          

          try {
            const formattedData = {
              id: data.connection.id,
              connectionName: data.connection.name,
              dbType: data.connection.type,
              schema: data.schema,
              postgresUrl: data.connection.url
            }
            
            processPipeline2Embeddings(formattedData).catch(error => {
              console.error('Error processing pipeline 2 embeddings:', error)
            })


            const connectionWithId = {
              ...newConnection,
              id: data.connection.id
            }
            

            addConnectionToFolder(selectedFolderForConnection, connectionWithId)
            

            closeCreateConnectionModal()
            const connectionEndpoint = generateConnectionEndpoint(connectionWithId.id, connectionWithId.name)
            router.push(connectionEndpoint)
          } catch (error) {
            console.error('Error formatting data for pipeline 2 embeddings:', error)

          }
          
          return
        }
        

        const apiEndpoint = newConnection.type === 'mongodb' 
          ? '/api/connectMongodb' 
          : '/api/connectdb'
        
        console.log('Using API endpoint:', apiEndpoint)
        

        let requestBody;
        if (newConnection.type === 'mongodb') {
          requestBody = {
            mongoUrl: newConnection.url,
            connectionName: newConnection.name,
            folderId: selectedFolderForConnection
          };
        } else {
          requestBody = {
            name: newConnection.name,
            type: newConnection.type,
            url: newConnection.url,
            folderId: selectedFolderForConnection
          };
        }
        
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          credentials: 'include'
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to connect to database')
        }
        
        const data = await response.json()
        
        const connectionId = data.id || (data.connection && data.connection.id)
        console.log('Extracted connection ID:', connectionId)
        

        const connectionWithId = {
          ...newConnection,
          id: connectionId
        }
        

        addConnectionToFolder(selectedFolderForConnection, connectionWithId)
        

        closeCreateConnectionModal()
        const connectionEndpoint = generateConnectionEndpoint(connectionWithId.id, connectionWithId.name)
        router.push(connectionEndpoint)
        

        try {
          const formattedData = {
            id: connectionId,
            connectionName: newConnection.name,
            dbType: newConnection.type,
            tables: data.tables || [],
            postgresUrl: data.connection && data.connection.url
          }
          

          embeddings(formattedData).catch(error => {
            console.error('Error processing embeddings:', error)

          })
        } catch (error) {
          console.error('Error formatting data for embeddings:', error)

        }
        
      } catch (error) {
        console.error('Error creating connection:', error)
      } finally {
        useFoldersStore.setState({ isLoading: false })
      }
    }
  }

  const handleConnectionClick = (connectionId: string, dbName: string) => {
    setActiveConnection(connectionId)

    const endpoint = generateConnectionEndpoint(connectionId, dbName)
    router.push(endpoint)
  }

  if (!user) {
    return (
      <div className={`h-full bg-[#1a1a1a] border-r border-gray-800 p-4 flex items-center justify-center transition-all duration-300 ${isSidebarCollapsed ? 'w-12' : 'w-64'}`}>
        <p className="text-gray-400 text-sm">Please sign in to view your folders.</p>
      </div>
    )
  }

  return (
    <div className={`h-full bg-[#1a1a1a] border-r border-gray-800 p-4 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'w-12' : 'w-64'}`}>
      <div className="flex justify-between items-center mb-4">
        {!isSidebarCollapsed && <h2 className="text-lg font-semibold">Folders</h2>}
        <div className="flex items-center gap-2">
          {!isSidebarCollapsed && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={openCreateFolderModal}
              className="text-blue-500 hover:text-blue-400"
              disabled={isLoading}
            >
              <Plus size={16} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="text-gray-400 hover:text-gray-300"
          >
            {isSidebarCollapsed ? <ChevronRightIcon size={16} /> : <ChevronLeft size={16} />}
          </Button>
        </div>
      </div>

      {!isSidebarCollapsed && (
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : folders.length === 0 ? (
            <p className="text-gray-400 text-sm">No folders yet. Create one to get started.</p>
          ) : (
            <ul className="space-y-2">
              {folders.map(folder => (
                <li key={folder.id} className="border border-gray-800 rounded-md">
                  <div 
                    className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-800"
                    onClick={() => toggleFolder(folder.id)}
                  >
                    <div className="flex items-center gap-2">
                      {expandedFolders[folder.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      <FolderIcon size={16} className="text-blue-500" />
                      <span>{folder.name}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFolder(folder.id)
                      }}
                      className="text-red-500 hover:text-red-400"
                      disabled={isLoading}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                  
                  {expandedFolders[folder.id] && (
                    <div className="pl-6 pr-2 pb-2">
                      <div className="flex justify-between items-center mb-2 mt-2">
                        <h3 className="text-sm font-medium">Connections</h3>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation()
                            openCreateConnectionModal(folder.id)
                          }}
                          className="text-blue-500 hover:text-blue-400 text-xs"
                          disabled={isLoading}
                        >
                          <Plus size={14} />
                        </Button>
                      </div>
                      
                      {folder.connections.length === 0 ? (
                        <p className="text-gray-400 text-xs">No connections in this folder.</p>
                      ) : (
                        <ul className="space-y-1">
                          {folder.connections.map(connection => (
                            <li 
                              key={connection.id}
                              className={`flex items-center gap-2 p-1 rounded cursor-pointer ${
                                activeConnectionId === connection.id ? 'bg-blue-900/30' : 'hover:bg-gray-800'
                              }`}
                              onClick={() => handleConnectionClick(connection.id, connection.name)}
                            >
                              <Database size={14} className="text-blue-500" />
                              <span className="text-sm">{connection.name}</span>
                              <span className="text-xs text-gray-500 ml-auto">
                                {connection.type}
                              </span>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  try {
                                    await removeConnectionFromFolder(folder.id, connection.id)

                                  } catch (error) {
                                    console.error('Error deleting connection:', error);
                                  }
                                }}
                                className="text-red-500 hover:text-red-400"
                                disabled={isLoading}
                              >
                                <Trash2 size={12} />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {isSidebarCollapsed && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={openCreateFolderModal}
            className="text-blue-500 hover:text-blue-400 mb-4"
            disabled={isLoading}
          >
            <Plus size={16} />
          </Button>
          <div className="flex flex-col items-center gap-2">
            {folders.map(folder => (
              <Button
                key={folder.id}
                variant="ghost"
                size="sm"
                onClick={() => toggleFolder(folder.id)}
                className="text-gray-400 hover:text-gray-300"
                title={folder.name}
              >
                <FolderIcon size={16} className="text-blue-500" />
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      <Dialog open={isCreateFolderModalOpen} onOpenChange={closeCreateFolderModal}>
        <DialogContent className="bg-[#1a1a1a] text-white border-gray-800">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Folder Name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="bg-[#222] border-gray-700 text-white"
              disabled={isLoading}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCreateFolderModal} className="border-gray-700">
              Cancel
            </Button>
            <Button 
              onClick={handleCreateFolder} 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Connection Modal */}
      <Dialog open={isCreateConnectionModalOpen} onOpenChange={closeCreateConnectionModal}>
        <DialogContent className="bg-[#1a1a1a] text-white border-gray-800">
          <DialogHeader>
            <DialogTitle>Add Database Connection</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-center space-x-4">
              <Button
                variant={selectedPipeline === 'karthik' ? 'default' : 'outline'}
                onClick={() => setSelectedPipeline('karthik')}
                className="w-24"
              >
                Karthik
              </Button>
              <Button
                variant={selectedPipeline === 'shive' ? 'default' : 'outline'}
                onClick={() => setSelectedPipeline('shive')}
                className="w-24"
              >
                Shive
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="connection-name">Database Name</Label>
              <Input
                id="connection-name"
                placeholder="My Database"
                value={newConnection.name}
                onChange={(e) => setNewConnection(prev => ({ ...prev, name: e.target.value }))}
                className="bg-[#222] border-gray-700 text-white"
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="connection-type">Database Type</Label>
              <Select 
                value={newConnection.type} 
                onValueChange={(value) => setNewConnection(prev => ({ ...prev, type: value as 'postgres' | 'mongodb' }))}
                disabled={isLoading}
              >
                <SelectTrigger className="bg-[#222] border-gray-700 text-white">
                  <SelectValue placeholder="Select database type" />
                </SelectTrigger>
                <SelectContent className="bg-[#222] border-gray-700 text-white">
                  <SelectItem value="postgres">PostgreSQL</SelectItem>
                  <SelectItem value="mongodb">MongoDB</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="connection-url">Connection URL</Label>
              <Input
                id="connection-url"
                placeholder="postgresql://username:password@host:port/database"
                value={newConnection.url}
                onChange={(e) => setNewConnection(prev => ({ ...prev, url: e.target.value }))}
                className="bg-[#222] border-gray-700 text-white"
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCreateConnectionModal} className="border-gray-700">
              Cancel
            </Button>
            <Button 
              onClick={handleCreateConnection} 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isLoading || !newConnection.name}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {selectedPipeline === 'shive' ? 'Processing...' : 'Connecting...'}
                </>
              ) : (
                selectedPipeline === 'shive' ? 'Process' : 'Connect'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 
'use client'

import { useState, useEffect } from 'react'
import { useFoldersStore } from '@/app/store/useFoldersStore'
import { Connection } from '@/app/store/useFoldersStore'
import { 
  ChevronDown, 
  ChevronRight, 
  Folder as FolderIcon, 
  Database, 
  Plus, 
  Trash2, 
  Loader2, 
  ChevronLeft, 
  ChevronRight as ChevronRightIcon,
  Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { processPipeline2Embeddings } from '@/app/actions/pipeline2Embeddings'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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
  const [newConnection, setNewConnection] = useState<Connection>({
    id: '',
    name: '',
    type: 'postgres',
    url: ''
  })
  const [isDirectUrl, setIsDirectUrl] = useState(true)
  const [connectionDetails, setConnectionDetails] = useState({
    host: '',
    port: '',
    database: '',
    username: '',
    password: ''
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

  const buildConnectionUrl = () => {
    if (isDirectUrl) return newConnection.url;
    
    const { host, port, database, username, password } = connectionDetails;
    
    if (newConnection.type === 'postgres') {
      return `postgresql://${username}:${password}@${host}:${port}/${database}?sslmode=no-verify`;
    } else if (newConnection.type === 'mysql') {
      // MySQL connection string format
      return `mysql://${username}:${password}@${host}:${port}/${database}`;
    }
    
    return '';
  };

  const handleCreateConnection = async () => {
    if (newConnection.name && selectedFolderForConnection) {
      try {
        useFoldersStore.setState({ isLoading: true })
        
        const finalUrl = buildConnectionUrl();

        const response = await fetch('/api/connectdb-persistent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: newConnection.name,
            type: newConnection.type,
            url: finalUrl,
            folderId: selectedFolderForConnection
          })
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to establish persistent connection')
        }
        
        const data = await response.json()
        
        try {
          const formattedData = {
            id: data.connection.id,
            connectionName: data.connection.name,
            dbType: data.connection.type,
            schema: data.schema,
            postgresUrl: finalUrl
          }
          
          processPipeline2Embeddings(formattedData).catch(error => {
            console.error('Error processing pipeline 2 embeddings:', error)
          })

          const connectionWithId = {
            ...newConnection,
            id: data.connection.id,
            url: finalUrl
          }
          
          addConnectionToFolder(selectedFolderForConnection, connectionWithId)
          
          closeCreateConnectionModal()
          const connectionEndpoint = generateConnectionEndpoint(connectionWithId.id, connectionWithId.name)
          router.push(connectionEndpoint)
        } catch (error) {
          console.error('Error formatting data for pipeline 2 embeddings:', error)
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

  const getConnectionTypeColor = (type: string) => {
    switch(type) {
      case 'postgres':
        return 'bg-blue-900/30 text-blue-400';
      case 'mysql':
        return 'bg-yellow-900/30 text-yellow-400';
      case 'mongodb':
        return 'bg-green-900/30 text-green-400';
      default:
        return 'bg-gray-900/30 text-gray-400';
    }
  };

  const getDefaultPort = (dbType: string) => {
    switch(dbType) {
      case 'postgres':
        return '5432';
      case 'mysql':
        return '3306';
      case 'mongodb':
        return '27017';
      default:
        return '';
    }
  };

  if (!user) {
    return (
      <div className={`h-full bg-[#0f1011] border-r border-gray-800/50 flex items-center justify-center transition-all duration-300 ${isSidebarCollapsed ? 'w-16' : 'w-72'}`}>
        <p className="text-gray-400 text-sm px-4 text-center">Please sign in to view your databases</p>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className={`h-full bg-[#0f1011] border-r border-gray-800/50 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'w-16' : 'w-72'}`}>
        <div className="flex justify-between items-center p-4">
          {!isSidebarCollapsed && (
            <h2 className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
              DB Explorer
            </h2>
          )}
          <div className="flex items-center gap-2">
            {!isSidebarCollapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={openCreateFolderModal}
                    className="text-blue-500 hover:text-blue-400 hover:bg-blue-900/20 rounded-full p-2 h-8 w-8"
                    disabled={isLoading}
                  >
                    <Plus size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Create new folder</p>
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSidebar}
                  className="text-gray-400 hover:text-gray-300 hover:bg-gray-800/50 rounded-full p-2 h-8 w-8"
                >
                  {isSidebarCollapsed ? <ChevronRightIcon size={16} /> : <ChevronLeft size={16} />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {!isSidebarCollapsed ? (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            ) : folders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-3">
                <FolderIcon className="h-10 w-10 text-gray-700" />
                <p className="text-gray-400 text-sm text-center">No folders yet. Create one to get started.</p>
                <Button 
                  variant="outline"
                  onClick={openCreateFolderModal}
                  className="text-blue-500 border-blue-500/50 hover:bg-blue-900/20"
                >
                  Create Folder
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {folders.map(folder => (
                  <li key={folder.id} className="rounded-lg overflow-hidden border border-gray-800/60 bg-gray-900/20 hover:bg-gray-900/40 transition-colors">
                    <div 
                      className={`flex items-center justify-between p-3 cursor-pointer ${activeFolderId === folder.id ? 'bg-gradient-to-r from-blue-900/20 to-indigo-900/20' : ''}`}
                      onClick={() => toggleFolder(folder.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="text-blue-500">
                          {expandedFolders[folder.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>
                        <FolderIcon size={16} className="text-indigo-400" />
                        <span className="font-medium text-gray-200">{folder.name}</span>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation()
                              removeFolder(folder.id)
                            }}
                            className="text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-full p-1 h-6 w-6 opacity-80 hover:opacity-100"
                            disabled={isLoading}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete folder</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    
                    {expandedFolders[folder.id] && (
                      <div className="pl-7 pr-3 pb-3">
                        <div className="flex justify-between items-center mb-2 mt-1">
                          <h3 className="text-xs font-medium text-gray-400">Connections</h3>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openCreateConnectionModal(folder.id)
                                }}
                                className="text-blue-500 hover:text-blue-400 hover:bg-blue-900/20 rounded-full p-1 h-6 w-6 opacity-80 hover:opacity-100"
                                disabled={isLoading}
                              >
                                <Plus size={14} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Add database connection</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        
                        {folder.connections.length === 0 ? (
                          <div className="text-gray-500 text-xs p-2 rounded bg-gray-800/20 text-center">
                            No connections yet
                          </div>
                        ) : (
                          <ul className="space-y-1">
                            {folder.connections.map(connection => (
                              <li 
                                key={connection.id}
                                className={`flex items-center gap-2 p-2 rounded-md transition-colors ${
                                  activeConnectionId === connection.id 
                                    ? 'bg-gradient-to-r from-blue-900/30 to-indigo-900/30 text-white' 
                                    : 'hover:bg-gray-800/50 text-gray-300'
                                }`}
                                onClick={() => handleConnectionClick(connection.id, connection.name)}
                              >
                                <Database size={14} className={
                                  activeConnectionId === connection.id 
                                    ? 'text-blue-400' 
                                    : 'text-gray-500'
                                } />
                                <span className="text-sm truncate flex-1">{connection.name}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${getConnectionTypeColor(connection.type)}`}>
                                  {connection.type}
                                </span>
                                <Tooltip>
                                  <TooltipTrigger asChild>
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
                                      className="text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-full p-1 h-5 w-5 ml-1 opacity-60 hover:opacity-100"
                                      disabled={isLoading}
                                    >
                                      <Trash2 size={12} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Remove connection</p>
                                  </TooltipContent>
                                </Tooltip>
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
        ) : (
          <div className="flex-1 py-4 flex flex-col items-center gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openCreateFolderModal}
                  className="text-blue-500 hover:text-blue-400 hover:bg-blue-900/20 rounded-full p-2 h-10 w-10"
                  disabled={isLoading}
                >
                  <Plus size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Create new folder</p>
              </TooltipContent>
            </Tooltip>
            
            <div className="flex flex-col items-center gap-3 mt-2">
              {folders.map(folder => (
                <Tooltip key={folder.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActiveFolder(folder.id);
                        toggleFolder(folder.id);
                        if (!isSidebarCollapsed) {
                          toggleSidebar();
                        }
                      }}
                      className={`text-gray-400 hover:text-gray-200 rounded-full p-2 h-10 w-10 flex items-center justify-center ${
                        activeFolderId === folder.id ? 'bg-blue-900/30 text-blue-400' : 'hover:bg-gray-800/70'
                      }`}
                      title={folder.name}
                    >
                      <FolderIcon size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{folder.name}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        )}

        {!isSidebarCollapsed && (
          <div className="p-3 border-t border-gray-800/50">
            <Button 
              variant="ghost" 
              className="w-full flex items-center justify-start gap-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 transition-colors"
              onClick={() => console.log('Settings clicked')}
            >
              <Settings size={16} />
              <span>Settings</span>
            </Button>
          </div>
        )}

        {/* Create Folder Modal */}
        <Dialog open={isCreateFolderModalOpen} onOpenChange={closeCreateFolderModal}>
          <DialogContent className="bg-[#0f1011] text-white border-gray-800/70 shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Create New Folder</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="folder-name" className="text-gray-400 mb-2 block">
                Enter a name for your new folder
              </Label>
              <Input
                id="folder-name"
                placeholder="Folder Name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="bg-[#161718] border-gray-800/70 text-white focus:border-blue-500 focus:ring-blue-500"
                disabled={isLoading}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeCreateFolderModal} className="border-gray-700 hover:bg-gray-800/70">
                Cancel
              </Button>
              <Button 
                onClick={handleCreateFolder} 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                disabled={isLoading || !newFolderName.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Folder'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Connection Modal */}
        <Dialog open={isCreateConnectionModalOpen} onOpenChange={closeCreateConnectionModal}>
          <DialogContent className="bg-[#0f1011] text-white border-gray-800/70 shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Add Database Connection</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-5">              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="connection-name" className="text-xs text-gray-400">Database Name</Label>
                    <Input
                      id="connection-name"
                      placeholder="My Database"
                      value={newConnection.name}
                      onChange={(e) => setNewConnection(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-[#161718] border-gray-800/70 text-white focus:border-blue-500 focus:ring-blue-500 h-10"
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="connection-type" className="text-xs text-gray-400">Database Type</Label>
                    <Select 
                      value={newConnection.type} 
                      onValueChange={(value) => {
                        setNewConnection(prev => ({ ...prev, type: value as 'postgres' | 'mysql' | 'mongodb' }));
                        // Update default port when type changes
                        setConnectionDetails(prev => ({ ...prev, port: getDefaultPort(value) }));
                      }}
                      disabled={isLoading}
                    >
                      <SelectTrigger id="connection-type" className="bg-[#161718] border-gray-800/70 text-white h-10 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#161718] border-gray-800/70 text-white">
                        <SelectItem value="postgres">PostgreSQL</SelectItem>
                        <SelectItem value="mysql">MySQL</SelectItem>
                        <SelectItem value="mongodb">MongoDB</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="connection-url" className="text-gray-400 font-medium">Connection Method</Label>
                    <div className="flex items-center gap-3 bg-gray-900/30 px-3 py-1.5 rounded-full">
                      <Label className={`text-sm cursor-pointer ${isDirectUrl ? 'text-blue-400 font-medium' : 'text-gray-400'}`} onClick={() => setIsDirectUrl(true)}>
                        URL
                      </Label>
                      <Switch
                        checked={!isDirectUrl}
                        onCheckedChange={(checked) => setIsDirectUrl(!checked)}
                        className="data-[state=checked]:bg-blue-600"
                      />
                      <Label className={`text-sm cursor-pointer ${!isDirectUrl ? 'text-blue-400 font-medium' : 'text-gray-400'}`} onClick={() => setIsDirectUrl(false)}>
                        Details
                      </Label>
                    </div>
                  </div>
                  
                  {!isDirectUrl ? (
                    <div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="host" className="text-xs text-gray-400">Host</Label>
                          <Input
                            id="host"
                            placeholder="localhost"
                            value={connectionDetails.host}
                            onChange={(e) => setConnectionDetails(prev => ({ ...prev, host: e.target.value }))}
                            className="bg-[#161718] border-gray-800/70 text-white focus:border-blue-500 focus:ring-blue-500 h-10"
                            disabled={isLoading}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="port" className="text-xs text-gray-400">Port</Label>
                          <Input
                            id="port"
                            placeholder={getDefaultPort(newConnection.type)}
                            value={connectionDetails.port}
                            onChange={(e) => setConnectionDetails(prev => ({ ...prev, port: e.target.value }))}
                            className="bg-[#161718] border-gray-800/70 text-white focus:border-blue-500 focus:ring-blue-500 h-10"
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-1.5 mb-3">
                        <Label htmlFor="database" className="text-xs text-gray-400">Database Name</Label>
                        <Input
                          id="database"
                          placeholder="mydb"
                          value={connectionDetails.database}
                          onChange={(e) => setConnectionDetails(prev => ({ ...prev, database: e.target.value }))}
                          className="bg-[#161718] border-gray-800/70 text-white focus:border-blue-500 focus:ring-blue-500 h-10"
                          disabled={isLoading}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="username" className="text-xs text-gray-400">Username</Label>
                          <Input
                            id="username"
                            placeholder={newConnection.type === 'mysql' ? 'root' : 'postgres'}
                            value={connectionDetails.username}
                            onChange={(e) => setConnectionDetails(prev => ({ ...prev, username: e.target.value }))}
                            className="bg-[#161718] border-gray-800/70 text-white focus:border-blue-500 focus:ring-blue-500 h-10"
                            disabled={isLoading}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="password" className="text-xs text-gray-400">Password</Label>
                          <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={connectionDetails.password}
                            onChange={(e) => setConnectionDetails(prev => ({ ...prev, password: e.target.value }))}
                            className="bg-[#161718] border-gray-800/70 text-white focus:border-blue-500 focus:ring-blue-500 h-10"
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                      
                      <div className="mt-3 p-2 rounded bg-gray-900/30 text-xs text-gray-400">
                        <p className="mb-1 font-medium">Connection String Preview:</p>
                        <code className="block overflow-x-auto whitespace-nowrap text-blue-400 pb-1">
                          {newConnection.type === 'mysql' 
                            ? `mysql://${connectionDetails.username || 'username'}:${connectionDetails.password ? '••••••••' : 'password'}@${connectionDetails.host || 'host'}:${connectionDetails.port || '3306'}/${connectionDetails.database || 'database'}`
                            : `postgresql://${connectionDetails.username || 'username'}:${connectionDetails.password ? '••••••••' : 'password'}@${connectionDetails.host || 'host'}:${connectionDetails.port || '5432'}/${connectionDetails.database || 'database'}`
                          }
                        </code>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Input
                        id="connection-url"
                        placeholder={newConnection.type === 'mysql' 
                          ? "mysql://username:password@host:port/database" 
                          : "postgresql://username:password@host:port/database"
                        }
                        value={newConnection.url}
                        onChange={(e) => setNewConnection(prev => ({ ...prev, url: e.target.value }))}
                        className="bg-[#161718] border-gray-800/70 text-white focus:border-blue-500 focus:ring-blue-500 h-10"
                        disabled={isLoading}
                      />
                      <div className="p-2 rounded bg-gray-900/30 text-xs text-gray-400">
                        <p>Enter the full connection URL for your database, including credentials</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter className="flex gap-2 mt-6">
              <Button 
                variant="outline" 
                onClick={closeCreateConnectionModal} 
                className="flex-1 border-gray-700 hover:bg-gray-800/70"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateConnection} 
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                disabled={isLoading || !newConnection.name || (!isDirectUrl ? (!connectionDetails.host || !connectionDetails.database || !connectionDetails.username) : !newConnection.url)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Connect to Database'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
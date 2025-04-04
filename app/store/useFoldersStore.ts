import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { createFolder, getFolders, deleteFolder } from '@/app/actions/folder'

export type Folder = {
  id: number
  name: string
  connections: Connection[]
}

export type Connection = {
  id: string
  name: string
  type: 'postgres' | 'mongodb'
  url: string
}

type FoldersState = {
  folders: Folder[]
  activeFolderId: number | null
  activeConnectionId: string | null
  isCreateFolderModalOpen: boolean
  newFolderName: string
  selectedConnectionForFolder: Connection | null
  isLoading: boolean
  
  // Actions
  setFolders: (folders: Folder[]) => void
  addFolder: (userId: string, name: string) => Promise<void>
  removeFolder: (id: number) => Promise<void>
  setActiveFolder: (id: number | null) => void
  setActiveConnection: (id: string | null) => void
  addConnectionToFolder: (folderId: number, connection: Connection) => void
  removeConnectionFromFolder: (folderId: number, connectionId: string) => void
  openCreateFolderModal: () => void
  closeCreateFolderModal: () => void
  setNewFolderName: (name: string) => void
  setSelectedConnectionForFolder: (connection: Connection | null) => void
  loadFolders: (userId: string) => Promise<void>
}

export const useFoldersStore = create<FoldersState>((set, get) => ({
  folders: [],
  activeFolderId: null,
  activeConnectionId: null,
  isCreateFolderModalOpen: false,
  newFolderName: '',
  selectedConnectionForFolder: null,
  isLoading: false,
  
  setFolders: (folders) => set({ folders }),
  
  addFolder: async (userId, name) => {
    set({ isLoading: true })
    try {
      const newFolder = await createFolder(userId, name)
      set((state) => ({ 
        folders: [...state.folders, { ...newFolder, connections: [] }],
        isCreateFolderModalOpen: false,
        newFolderName: ''
      }))
    } catch (error) {
      console.error('Error adding folder:', error)
    } finally {
      set({ isLoading: false })
    }
  },
  
  removeFolder: async (id) => {
    set({ isLoading: true })
    try {
      await deleteFolder(id)
      set((state) => ({ 
        folders: state.folders.filter(folder => folder.id !== id),
        activeFolderId: state.activeFolderId === id ? null : state.activeFolderId
      }))
    } catch (error) {
      console.error('Error removing folder:', error)
    } finally {
      set({ isLoading: false })
    }
  },
  
  setActiveFolder: (id) => set({ activeFolderId: id }),
  
  setActiveConnection: (id) => set({ activeConnectionId: id }),
  
  addConnectionToFolder: (folderId, connection) => {
    set((state) => ({
      folders: state.folders.map(folder => 
        folder.id === folderId 
          ? { ...folder, connections: [...folder.connections, connection] }
          : folder
      )
    }))
  },
  
  removeConnectionFromFolder: (folderId, connectionId) => {
    set((state) => ({
      folders: state.folders.map(folder => 
        folder.id === folderId 
          ? { ...folder, connections: folder.connections.filter(conn => conn.id !== connectionId) }
          : folder
      )
    }))
  },
  
  openCreateFolderModal: () => set({ isCreateFolderModalOpen: true }),
  
  closeCreateFolderModal: () => set({ 
    isCreateFolderModalOpen: false,
    newFolderName: '',
    selectedConnectionForFolder: null
  }),
  
  setNewFolderName: (name) => set({ newFolderName: name }),
  
  setSelectedConnectionForFolder: (connection) => set({ selectedConnectionForFolder: connection }),

  loadFolders: async (userId) => {
    set({ isLoading: true })
    try {
      const folders = await getFolders(userId)
      
      // Get all connections for this user
      const response = await fetch(`/api/connections?userId=${userId}`, {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch connections')
      }
      
      const connections = await response.json()
      
      // Map connections to their respective folders
      const foldersWithConnections = folders.map(folder => {
        const folderConnections = connections.filter(
          (conn: any) => conn.folderId === folder.id
        ).map((conn: any) => ({
          id: conn.id.toString(),
          name: conn.connectionName,
          type: conn.dbType,
          url: conn.postgresUrl || conn.mongoUrl || ''
        }))
        
        return { 
          ...folder, 
          connections: folderConnections 
        }
      })
      
      set({ folders: foldersWithConnections })
    } catch (error) {
      console.error('Error loading folders:', error)
    } finally {
      set({ isLoading: false })
    }
  }
})) 
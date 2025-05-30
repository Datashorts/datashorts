import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { createFolder, getFolders } from '@/app/actions/folder'

export type Folder = {
  id: number
  name: string
  connections: Connection[]
}

export type Connection = {
  id: string
  name: string
  type: 'postgres' | 'mysql' | 'mongodb'
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
  removeConnectionFromFolder: (folderId: number, connectionId: string) => Promise<boolean>
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

      const response = await fetch(`/api/folders/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete folder')
      }
      

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
  
  removeConnectionFromFolder: async (folderId, connectionId) => {
    set({ isLoading: true })
    try {
      console.log(`Deleting connection ${connectionId} from folder ${folderId}`);
      

      const response = await fetch(`/api/connections/${connectionId}/`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Failed to delete connection:', errorData);
        throw new Error(errorData.error || 'Failed to delete connection')
      }
      
      const result = await response.json();
      console.log('Connection deleted successfully:', result);
      

      set((state) => ({
        folders: state.folders.map(folder => 
          folder.id === folderId 
            ? { ...folder, connections: folder.connections.filter(conn => conn.id !== connectionId) }
            : folder
        )
      }))
      
      return true;
    } catch (error) {
      console.error('Error removing connection from folder:', error);
      throw error;
    } finally {
      set({ isLoading: false })
    }
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

      const response = await fetch(`/api/folders-with-connections?userId=${userId}`, {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch folders with connections')
      }
      
      const foldersWithConnections = await response.json()
      
      // Set the folders with their connections
      set({ folders: foldersWithConnections })
    } catch (error) {
      console.error('Error loading folders:', error)
    } finally {
      set({ isLoading: false })
    }
  }
})) 
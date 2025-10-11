import { create } from 'zustand'
import { User, FileMetadata, UserStats, RSAKeyPair } from '@/types'

interface AuthState {
  user: User | null
  walletAddress: string | null
  ensName: string | null
  isConnected: boolean
  keyPair: RSAKeyPair | null
  setUser: (user: User | null) => void
  setWalletAddress: (address: string | null) => void
  setEnsName: (name: string | null) => void
  setIsConnected: (connected: boolean) => void
  setKeyPair: (keyPair: RSAKeyPair | null) => void
  logout: () => void
}

interface FileState {
  files: FileMetadata[]
  selectedFile: FileMetadata | null
  isUploading: boolean
  uploadProgress: number
  setFiles: (files: FileMetadata[]) => void
  addFile: (file: FileMetadata) => void
  setSelectedFile: (file: FileMetadata | null) => void
  setIsUploading: (uploading: boolean) => void
  setUploadProgress: (progress: number) => void
  removeFile: (fileId: string) => void
}

interface UIState {
  sidebarOpen: boolean
  theme: 'light' | 'dark' | 'system'
  setSidebarOpen: (open: boolean) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
}

interface StatsState {
  userStats: UserStats | null
  setUserStats: (stats: UserStats | null) => void
}

type AppState = AuthState & FileState & UIState & StatsState

export const useStore = create<AppState>((set) => ({
  // Auth State
  user: null,
  walletAddress: null,
  ensName: null,
  isConnected: false,
  keyPair: null,
  setUser: (user) => set({ user }),
  setWalletAddress: (address) => set({ walletAddress: address }),
  setEnsName: (name) => set({ ensName: name }),
  setIsConnected: (connected) => set({ isConnected: connected }),
  setKeyPair: (keyPair) => set({ keyPair }),
  logout: () =>
    set({
      user: null,
      walletAddress: null,
      ensName: null,
      isConnected: false,
      keyPair: null,
      files: [],
    }),

  // File State
  files: [],
  selectedFile: null,
  isUploading: false,
  uploadProgress: 0,
  setFiles: (files) => set({ files }),
  addFile: (file) => set((state) => ({ files: [file, ...state.files] })),
  setSelectedFile: (file) => set({ selectedFile: file }),
  setIsUploading: (uploading) => set({ isUploading: uploading }),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  removeFile: (fileId) =>
    set((state) => ({
      files: state.files.filter((f) => f.id !== fileId),
    })),

  // UI State
  sidebarOpen: true,
  theme: 'system',
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setTheme: (theme) => set({ theme }),

  // Stats State
  userStats: null,
  setUserStats: (stats) => set({ userStats: stats }),
}))

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { FileText, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sidebar } from '@/components/Sidebar'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ConnectWallet } from '@/components/ConnectWallet'
import { FileCard } from '@/components/FileCard'
import { FileEditDialog } from '@/components/FileEditDialog'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { useStore } from '@/store/useStore'
import { useEncryption } from '@/hooks/useEncryption'
import { getUserFiles, getAccessibleFiles, deleteFile, updateFileAccessCount, updateFileMetadata } from '@/lib/supabase'
import { getFromIPFS, unpinFromIPFS } from '@/lib/pinata'
import { downloadFile } from '@/lib/utils'
import { encryptKeyForUsersFromOwnerEncrypted } from '@/lib/sharedEncryption'
import { FileMetadata } from '@/types'
import toast from 'react-hot-toast'

export default function FilesPage() {
  const router = useRouter()
  const { isConnected, user, files, setFiles, keyPair, setKeyPair, removeFile } = useStore()
  const { decrypt, generateKeys } = useEncryption()
  const [isLoading, setIsLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [editingFile, setEditingFile] = useState<FileMetadata | null>(null)

  useEffect(() => {
    if (!isConnected) {
      router.push('/')
      return
    }

    const fetchFiles = async () => {
      if (!user) return
      
      // Restore encryption keys if not in store
      if (!keyPair && user.wallet_address) {
        const keys = await generateKeys(user.wallet_address)
        if (keys) {
          setKeyPair(keys)
        }
      }

      setIsLoading(true)
      try {
        // Get files owned by user + files shared with them
        const accessibleFiles = await getAccessibleFiles(user.id, user.username)
        
        setFiles(accessibleFiles)
        
        // Count shared files
        const ownedCount = accessibleFiles.filter(f => f.user_id === user.id).length
        const sharedCount = accessibleFiles.length - ownedCount
        
        if (sharedCount > 0) {
          toast.success(`Loaded ${accessibleFiles.length} files (${sharedCount} shared with you)`, {
            duration: 3000
          })
        }

        // Auto-backfill missing shared_keys for owned files
        // This fixes cases where recipients connected later or usernames changed case
        ;(async () => {
          try {
            const ownedFiles = (accessibleFiles || []).filter(f => f.user_id === user.id)
            for (const file of ownedFiles) {
              const recipients: string[] = (file.shared_with || [])
              if (!recipients || recipients.length === 0) continue

              const existingKeys = (file.shared_keys || []) as any[]
              const missing = recipients.filter(u => !existingKeys.some(k => (k.username || '').toLowerCase() === (u || '').toLowerCase()))
              if (missing.length === 0) continue

              if (!file.encrypted_key) continue

              console.log(`Backfilling shared keys for ${file.file_name}:`, missing)
              const ownerPriv = keyPair?.privateKey
              if (!ownerPriv) continue
              const newKeys = await encryptKeyForUsersFromOwnerEncrypted(
                file.encrypted_key,
                ownerPriv,
                missing.map(u => (u || '').toLowerCase())
              )
              if (newKeys.length > 0) {
                const merged = [
                  ...existingKeys.filter(k => recipients.includes(k.username)),
                  ...newKeys,
                ]
                await updateFileMetadata(file.id, { shared_keys: merged } as any)
                // Update local state optimistically (store expects an array, not updater fn)
                const updatedList: FileMetadata[] = (files || []).map((f: any) => (
                  f.id === file.id ? { ...f, shared_keys: merged } : f
                ))
                setFiles(updatedList as any)
                console.log(`✅ Backfilled ${newKeys.length} shared key(s) for ${file.file_name}`)
              }
            }
          } catch (bfErr) {
            console.warn('Auto-backfill shared_keys failed:', bfErr)
          }
        })()
      } catch (error) {
        console.error('Error fetching files:', error)
        toast.error('Failed to load files')
      } finally {
        setIsLoading(false)
      }
    }

    fetchFiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, user?.id, user?.username]) // Re-run when username becomes available

  const handleDownload = async (file: any) => {
    if (!keyPair) {
      toast.error('Encryption keys not found')
      return
    }

    try {
      toast.loading('Downloading and decrypting...', { id: 'download' })

      // Download from IPFS
      const encryptedBlob = await getFromIPFS(file.ipfs_hash)
      const encryptedData = await encryptedBlob.text()

      // Verify encryption metadata exists
      if (!file.encrypted_key || !file.iv) {
        throw new Error('Missing encryption metadata')
      }

      // Determine which encrypted key to use
      let encryptedKeyToUse = file.encrypted_key
      const isSharedFile = file.user_id !== user?.id
      
      if (isSharedFile && file.shared_keys && user?.username) {
        // This is a shared file - find the key encrypted for this user
        const myUsername = user.username.toLowerCase()
        const sharedKey = file.shared_keys.find((k: any) => (k.username || '').toLowerCase() === myUsername)
        if (sharedKey) {
          encryptedKeyToUse = sharedKey.encrypted_aes_key
          console.log(`✅ Using shared key for @${myUsername}`)
        } else {
          throw new Error(`No encryption key found for @${myUsername}. File owner needs to re-share.`)
        }
      }

      // Prepare encryption data for decryption
      const encryptionResult = {
        encryptedData: encryptedData,
        encryptedKey: encryptedKeyToUse,
        iv: file.iv,
      }

      // Decrypt
      const decryptedData = await decrypt(encryptionResult, keyPair.privateKey)
      if (!decryptedData) {
        if (isSharedFile) {
          throw new Error('Decryption failed - your encryption key may have changed')
        }
        throw new Error('Decryption failed - wrong encryption key')
      }

      // Download
      const blob = new Blob([decryptedData], { type: file.file_type })
      downloadFile(blob, file.file_name)

      // Update access count
      await updateFileAccessCount(file.id)

      toast.success('File downloaded successfully', { id: 'download' })
    } catch (error: any) {
      console.error('Download error:', error)
      toast.error(error.message || 'Download failed', { id: 'download' })
    }
  }

  const handleDelete = async (file: any) => {
    if (!confirm(`Are you sure you want to delete "${file.file_name}"? This will permanently remove it from IPFS.`)) {
      return
    }

    try {
      toast.loading('Deleting file...', { id: 'delete' })

      // Delete from IPFS first
      console.log('Unpinning from IPFS:', file.ipfs_hash)
      const unpinned = await unpinFromIPFS(file.ipfs_hash)
      
      if (!unpinned) {
        console.warn('Failed to unpin from IPFS, continuing with database deletion')
      } else {
        console.log('Successfully unpinned from IPFS')
      }

      // Delete from Supabase
      const success = await deleteFile(file.id)
      if (success) {
        removeFile(file.id)
        toast.success('File deleted from database and IPFS', { id: 'delete' })
      } else {
        throw new Error('Delete from database failed')
      }
    } catch (error: any) {
      console.error('Delete error:', error)
      toast.error(`Failed to delete file: ${error.message}`, { id: 'delete' })
    }
  }

  const handleEdit = (file: FileMetadata) => {
    setEditingFile(file)
  }

  const handleUpdate = (fileId: string, updates: Partial<FileMetadata>) => {
    // Update local state
    setFiles(files.map(f => f.id === fileId ? { ...f, ...updates } : f))
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className="lg:pl-64">
        {/* Header */}
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="pl-16 pr-6 py-4 lg:px-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">My Files</h1>
              <p className="text-sm text-muted-foreground">
                {files.length} file{files.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <ConnectWallet />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6">
          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowFilterMenu(!showFilterMenu)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filter: {filterType === 'all' ? 'All Files' : filterType.toUpperCase()}
              </Button>
              {showFilterMenu && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-card border rounded-lg shadow-lg z-10">
                  <button
                    onClick={() => { setFilterType('all'); setShowFilterMenu(false) }}
                    className="w-full text-left px-4 py-2 hover:bg-accent rounded-t-lg"
                  >
                    All Files
                  </button>
                  <button
                    onClick={() => { setFilterType('pdf'); setShowFilterMenu(false) }}
                    className="w-full text-left px-4 py-2 hover:bg-accent"
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => { setFilterType('image'); setShowFilterMenu(false) }}
                    className="w-full text-left px-4 py-2 hover:bg-accent"
                  >
                    Images
                  </button>
                  <button
                    onClick={() => { setFilterType('video'); setShowFilterMenu(false) }}
                    className="w-full text-left px-4 py-2 hover:bg-accent"
                  >
                    Videos
                  </button>
                  <button
                    onClick={() => { setFilterType('document'); setShowFilterMenu(false) }}
                    className="w-full text-left px-4 py-2 hover:bg-accent rounded-b-lg"
                  >
                    Documents
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Files Grid */}
          {isLoading ? (
            <LoadingSpinner message="Loading files..." />
          ) : files.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {files
                .filter((file) => {
                  if (filterType === 'all') return true
                  if (filterType === 'pdf') return file.file_type.includes('pdf')
                  if (filterType === 'image') return file.file_type.startsWith('image/')
                  if (filterType === 'video') return file.file_type.startsWith('video/')
                  if (filterType === 'document') return file.file_type.includes('document') || file.file_type.includes('text') || file.file_type.includes('word')
                  return true
                })
                .map((file) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    currentUserId={user?.id}
                    onView={handleDownload}
                    onDownload={handleDownload}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No files yet</h3>
              <p className="text-muted-foreground mb-6">
                Upload your first encrypted file to get started
              </p>
              <Button onClick={() => router.push('/upload')}>
                Upload File
              </Button>
            </motion.div>
          )}
        </main>
      </div>

      {/* Edit Dialog */}
      {editingFile && (
        <FileEditDialog
          file={editingFile}
          isOpen={true}
          onClose={() => setEditingFile(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  )
}

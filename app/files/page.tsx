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
import { FilePreview } from '@/components/FilePreview'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { useStore } from '@/store/useStore'
import { useEncryption } from '@/hooks/useEncryption'
import { useAnomalyMonitor } from '@/hooks/useAnomalyMonitor'
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
  const { logActivity } = useAnomalyMonitor()
  const [isLoading, setIsLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [editingFile, setEditingFile] = useState<FileMetadata | null>(null)
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null)
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ file: any, isShared: boolean } | null>(null)

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

  const handleView = async (file: any) => {
    await decryptAndPrepare(file, true)
  }

  const handleDownload = async (file: any) => {
    await decryptAndPrepare(file, false)
  }

  const decryptAndPrepare = async (file: any, isPreview: boolean) => {
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

      let decryptedData: ArrayBuffer | null = null
      const isSharedFile = file.user_id !== user?.id
      
      console.log('🔍 Decryption Debug:', {
        isSharedFile,
        currentUsername: user?.username?.toLowerCase(),
        hasSharedKeys: !!file.shared_keys,
        sharedKeysCount: file.shared_keys?.length || 0,
        sharedUsers: file.shared_with,
      })
      
      // Try primary decryption first (owner's key or correct shared key)
      let encryptedKeyToUse = file.encrypted_key
      
      if (isSharedFile && file.shared_keys && user?.username) {
        // This is a shared file - try to find the key encrypted for this user
        const myUsername = user.username.toLowerCase()
        console.log('📋 Available shared keys:', file.shared_keys.map((k: any) => k.username))
        
        const sharedKey = file.shared_keys.find((k: any) => {
          const keyUsername = (k.username || '').toLowerCase()
          console.log(`Comparing: "${keyUsername}" === "${myUsername}"`)
          return keyUsername === myUsername
        })
        
        if (sharedKey && sharedKey.encrypted_aes_key) {
          encryptedKeyToUse = sharedKey.encrypted_aes_key
          console.log(`✅ Using shared key for @${myUsername}`)
        }
      }

      // Attempt decryption with primary key
      try {
        const encryptionResult = {
          encryptedData: encryptedData,
          encryptedKey: encryptedKeyToUse,
          iv: file.iv,
        }

        decryptedData = await decrypt(encryptionResult, keyPair.privateKey)
        if (decryptedData) {
          console.log('✅ Primary decryption successful')
        }
      } catch (primaryError) {
        console.warn('❌ Primary decryption failed:', primaryError)
        decryptedData = null
      }

      // Fallback: If primary failed, try with owner's key (cross-device scenario)
      if (!decryptedData && encryptedKeyToUse !== file.encrypted_key) {
        console.log('🔄 Trying fallback with owner key...')
        try {
          const fallbackResult = {
            encryptedData: encryptedData,
            encryptedKey: file.encrypted_key,
            iv: file.iv,
          }
          
          decryptedData = await decrypt(fallbackResult, keyPair.privateKey)
          if (decryptedData) {
            console.log('✅ Fallback decryption successful with owner key!')
          }
        } catch (fallbackError) {
          console.error('❌ Fallback decryption also failed:', fallbackError)
        }
      }

      // Second fallback: Try all shared keys if available
      if (!decryptedData && file.shared_keys && file.shared_keys.length > 0 && user?.username) {
        console.log('🔄 Trying all available shared keys...')
        
        for (const sharedKey of file.shared_keys) {
          if (sharedKey.encrypted_aes_key) {
            try {
              const attemptResult = {
                encryptedData: encryptedData,
                encryptedKey: sharedKey.encrypted_aes_key,
                iv: file.iv,
              }
              
              decryptedData = await decrypt(attemptResult, keyPair.privateKey)
              if (decryptedData) {
                console.log(`✅ Successfully decrypted with key for @${sharedKey.username}`)
                break
              }
            } catch {
              // Continue to next key
              continue
            }
          }
        }
      }

      // Final check
      if (!decryptedData) {
        throw new Error('Decryption failed with all available keys. File owner may need to re-share.')
      }

      // Create blob
      const blob = new Blob([decryptedData], { type: file.file_type })
      
      if (isPreview) {
        // Open preview
        setPreviewFile(file)
        setPreviewBlob(blob)
        toast.success('File decrypted for preview', { id: 'download' })
        
        // Log view activity
        await logActivity('view', {
          fileId: file.id,
          fileName: file.file_name,
          success: true,
        })
      } else {
        // Download
        downloadFile(blob, file.file_name)
        toast.success('File downloaded successfully', { id: 'download' })
        
        // Log download activity
        await logActivity('download', {
          fileId: file.id,
          fileName: file.file_name,
          success: true,
        })
      }

      // Update access count
      await updateFileAccessCount(file.id)
    } catch (error: any) {
      console.error('Download error:', error)
      toast.error(error.message || 'Download failed', { id: 'download' })
    }
  }

  const handleDelete = async (file: any) => {
    const isOwner = file.user_id === user?.id
    const isShared = !isOwner
    
    // Show confirm dialog
    setDeleteConfirm({ file, isShared })
  }

  const executeDelete = async () => {
    if (!deleteConfirm) return
    const { file, isShared } = deleteConfirm
    
    if (isShared) {
      // For shared files, just remove access for this user
      try {
        toast.loading('Removing shared file...', { id: 'delete' })
        
        if (!user?.username) {
          throw new Error('Username not found')
        }
        
        const currentUsername = user.username.toLowerCase()
        
        // Remove this user from shared_with and shared_keys
        const updatedSharedWith = (file.shared_with || []).filter((u: string) => u !== currentUsername)
        const updatedSharedKeys = (file.shared_keys || []).filter((k: any) => k.username !== currentUsername)
        
        console.log('🗑️ Removing user from shared file:', {
          fileId: file.id,
          currentUser: currentUsername,
          beforeSharedWith: file.shared_with,
          afterSharedWith: updatedSharedWith
        })
        
        const success = await updateFileMetadata(file.id, {
          shared_with: updatedSharedWith,
          shared_keys: updatedSharedKeys,
        } as any)
        
        if (success) {
          removeFile(file.id)
          toast.success('File deleted for me', { id: 'delete' })
          
          // Refresh file list from database
          const refreshedFiles = await getAccessibleFiles(user.id, user.username)
          setFiles(refreshedFiles)
        } else {
          throw new Error('Failed to remove file access')
        }
      } catch (error: any) {
        console.error('Remove shared file error:', error)
        toast.error(`Failed to remove shared file: ${error.message}`, { id: 'delete' })
      }
    } else {
      // For owned files, delete completely
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
          <div className="pl-16 pr-4 py-3 lg:pl-6 lg:pr-6 lg:py-4 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold truncate">My Files</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {files.length} file{files.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <ThemeToggle />
              <ConnectWallet />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-4 sm:p-6">
          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className="text-xs sm:text-sm"
              >
                <Filter className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Filter: </span>
                {filterType === 'all' ? 'All' : filterType === 'shared' ? 'Shared' : filterType.toUpperCase()}
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
                    onClick={() => { setFilterType('shared'); setShowFilterMenu(false) }}
                    className="w-full text-left px-4 py-2 hover:bg-accent"
                  >
                    Shared with you
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
                  if (filterType === 'shared') return file.user_id !== user?.id
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
                    onView={handleView}
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

      {/* File Preview Dialog */}
      <FilePreview
        file={previewFile}
        decryptedBlob={previewBlob}
        isOpen={!!previewFile}
        onClose={() => {
          setPreviewFile(null)
          setPreviewBlob(null)
        }}
        onDownload={() => {
          if (previewBlob && previewFile) {
            downloadFile(previewBlob, previewFile.file_name)
            toast.success('File downloaded')
          }
        }}
      />

      {/* Confirm Delete Dialog */}
      {deleteConfirm && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => {
            setDeleteConfirm(null)
            setIsLoading(false)
          }}
          onConfirm={executeDelete}
          title={deleteConfirm.isShared ? 'Remove Shared File?' : 'Delete File Permanently?'}
          description={
            deleteConfirm.isShared
              ? `Remove "${deleteConfirm.file.file_name}" from your shared files? This will not delete the file for the owner or other recipients.`
              : `Are you sure you want to delete "${deleteConfirm.file.file_name}"? This will permanently remove it from IPFS and for all shared users.`
          }
          confirmText={deleteConfirm.isShared ? 'Remove' : 'Delete'}
          cancelText="Cancel"
          variant="destructive"
        />
      )}
    </div>
  )
}

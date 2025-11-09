'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { Sidebar } from '@/components/Sidebar'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ConnectWallet } from '@/components/ConnectWallet'
import { SearchBar } from '@/components/SearchBar'
import { FileCard } from '@/components/FileCard'
import { FilePreview } from '@/components/FilePreview'
import { useStore } from '@/store/useStore'
import { useEncryption } from '@/hooks/useEncryption'
import { FileMetadata } from '@/types'
import { generateEmbeddings, cosineSimilarity } from '@/lib/embeddingClient'
import { updateFileAccessCount } from '@/lib/supabase'
import { getFromIPFS } from '@/lib/pinata'
import { downloadFile } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function SearchPage() {
  const router = useRouter()
  const { isConnected, user, files, keyPair } = useStore()
  const { decrypt } = useEncryption()
  const [results, setResults] = useState<FileMetadata[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null)
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)

  useEffect(() => {
    if (!isConnected) {
      router.push('/')
    }
  }, [isConnected, router])

  // Shared decryption logic
  const decryptFile = async (file: FileMetadata): Promise<ArrayBuffer> => {
    if (!keyPair) {
      throw new Error('Encryption keys not found')
    }

    // Download from IPFS
    const encryptedBlob = await getFromIPFS(file.ipfs_hash)
    const encryptedData = await encryptedBlob.text()

    // Verify encryption metadata exists
    if (!file.encrypted_key || !file.iv) {
      throw new Error('Missing encryption metadata')
    }

    let decryptedData: ArrayBuffer | null = null
    let encryptedKeyToUse = file.encrypted_key
    const isOwner = file.user_id === user?.id

    console.log('🔍 Decryption attempt:', {
      isOwner,
      username: user?.username,
      hasSharedKeys: !!file.shared_keys && file.shared_keys.length > 0
    })

    // Try normal decryption first
    try {
      const encryptionResult = {
        encryptedData: encryptedData,
        encryptedKey: encryptedKeyToUse,
        iv: file.iv,
      }

      decryptedData = await decrypt(encryptionResult, keyPair.privateKey)
      if (decryptedData) {
        console.log('✅ Decryption successful with owner key')
      }
    } catch (primaryError) {
      console.warn('❌ Primary decryption failed:', primaryError)
      decryptedData = null
    }

    // Fallback: If primary decryption failed and there are shared keys, try them
    if (!decryptedData && file.shared_keys && file.shared_keys.length > 0 && user?.username) {
      console.log('🔄 Attempting fallback decryption with shared keys...')
      
      const sharedKey = file.shared_keys.find((k: any) => {
        const keyUsername = (k.username || '').toLowerCase()
        const currentUsername = (user.username || '').toLowerCase()
        return keyUsername === currentUsername
      })

      if (sharedKey && sharedKey.encrypted_aes_key) {
        console.log(`🔑 Found shared key for @${user.username}, retrying...`)
        
        try {
          const fallbackResult = {
            encryptedData: encryptedData,
            encryptedKey: sharedKey.encrypted_aes_key,
            iv: file.iv,
          }

          decryptedData = await decrypt(fallbackResult, keyPair.privateKey)
          if (decryptedData) {
            console.log('✅ Decryption successful with shared key!')
          }
        } catch (fallbackError) {
          console.error('❌ Fallback decryption also failed:', fallbackError)
        }
      } else {
        console.warn('⚠️ No matching shared key found for user')
      }
    }

    // Final check
    if (!decryptedData) {
      throw new Error('Decryption failed with all available keys')
    }

    return decryptedData
  }

  const handleView = async (file: FileMetadata) => {
    try {
      toast.loading('Decrypting for preview...', { id: 'view' })
      
      const decryptedData = await decryptFile(file)
      const blob = new Blob([decryptedData], { type: file.file_type })
      
      setPreviewFile(file)
      setPreviewBlob(blob)
      
      toast.success('File decrypted for preview', { id: 'view' })
    } catch (error: any) {
      console.error('❌ Preview error:', error)
      toast.error(error.message || 'Preview failed', { id: 'view' })
    }
  }

  const handleDownload = async (file: FileMetadata) => {
    try {
      toast.loading('Downloading and decrypting...', { id: 'download' })

      const decryptedData = await decryptFile(file)
      const blob = new Blob([decryptedData], { type: file.file_type })
      downloadFile(blob, file.file_name)

      // Update access count
      await updateFileAccessCount(file.id)

      toast.success('File downloaded successfully', { id: 'download' })
    } catch (error: any) {
      console.error('❌ Download error:', error)
      toast.error(error.message || 'Download failed', { id: 'download' })
    }
  }

  const handlePreviewDownload = () => {
    if (previewBlob && previewFile) {
      downloadFile(previewBlob, previewFile.file_name)
      updateFileAccessCount(previewFile.id)
      toast.success('File downloaded')
    }
  }

  const handleSearch = async (query: string) => {
    setIsSearching(true)
    setHasSearched(true)
    try {
      const queryLower = query.toLowerCase()
      
      // First try AI semantic search if embeddings exist
      const filesWithEmbeddings = files.filter(
        f => f.embedding_vector && f.embedding_vector.length > 0
      )
      
      let searchResults: FileMetadata[] = []
      
      if (filesWithEmbeddings.length > 0) {
        const queryEmbedding = await generateEmbeddings(query)
        
        const scored = filesWithEmbeddings
          .map(file => ({
            ...file,
            score: cosineSimilarity(queryEmbedding, file.embedding_vector!),
          }))
          .filter(f => f.score > 0.3)
          .sort((a, b) => b.score - a.score)
        
        searchResults = scored
      }
      
      // Fallback to basic text search
      if (searchResults.length === 0) {
        searchResults = files.filter(file => {
          const nameMatch = file.file_name.toLowerCase().includes(queryLower)
          const descMatch = file.description?.toLowerCase().includes(queryLower)
          const tagMatch = file.tags?.some(tag => tag.toLowerCase().includes(queryLower))
          return nameMatch || descMatch || tagMatch
        })
      }

      setResults(searchResults)
    } catch (error) {
      console.error('Search error:', error)
      // Fallback to basic search on error
      const queryLower = query.toLowerCase()
      const basicResults = files.filter(file => 
        file.file_name.toLowerCase().includes(queryLower) ||
        file.description?.toLowerCase().includes(queryLower) ||
        file.tags?.some(tag => tag.toLowerCase().includes(queryLower))
      )
      setResults(basicResults)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className="lg:pl-64">
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="pl-16 pr-6 py-4 lg:px-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                AI Search
              </h1>
              <p className="text-sm text-muted-foreground">
                Semantic search powered by AI
              </p>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <ConnectWallet />
            </div>
          </div>
        </header>

        <main className="p-6 max-w-5xl mx-auto">
          <SearchBar onSearch={handleSearch} isAISearch />

          <div className="mt-8">
            {isSearching ? (
              <div className="text-center py-12">Searching...</div>
            ) : results.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {results.map(file => (
                  <FileCard 
                    key={file.id} 
                    file={file}
                    currentUserId={user?.id}
                    onView={handleView}
                    onDownload={handleDownload}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {hasSearched 
                  ? "No files found matching your query. Try different keywords or tags."
                  : "Enter a search query to find files"
                }
              </div>
            )}
          </div>
        </main>
      </div>

      {/* File Preview Modal */}
      {previewFile && previewBlob && (
        <FilePreview
          file={previewFile}
          decryptedBlob={previewBlob}
          isOpen={!!previewFile}
          onClose={() => {
            setPreviewFile(null)
            setPreviewBlob(null)
          }}
          onDownload={handlePreviewDownload}
        />
      )}
    </div>
  )
}

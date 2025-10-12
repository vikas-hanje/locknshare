'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Key, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sidebar } from '@/components/Sidebar'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ConnectWallet } from '@/components/ConnectWallet'
import { UploadZone } from '@/components/UploadZone'
import { useStore } from '@/store/useStore'
import { useEncryption } from '@/hooks/useEncryption'
import { usePinataUpload } from '@/hooks/usePinataUpload'
import { useAnomalyMonitor } from '@/hooks/useAnomalyMonitor'
import { saveFileMetadata } from '@/lib/supabase'
import { extractTextFromFile, tokenizeText, prepareTextForEmbedding } from '@/lib/documentProcessor'
import { generateEmbeddings } from '@/lib/embeddingClient'
import toast from 'react-hot-toast'

export default function UploadPage() {
  const router = useRouter()
  const { isConnected, user, keyPair, setKeyPair, addFile } = useStore()
  const { generateKeys, encrypt, isEncrypting } = useEncryption()
  const { upload, isUploading, uploadProgress } = usePinataUpload()
  const { logActivity } = useAnomalyMonitor()
  const [totalProgress, setTotalProgress] = useState(0)

  useEffect(() => {
    if (!isConnected) {
      router.push('/')
      return
    }

    // Generate or restore keys if not exists
    if (!keyPair && user) {
      generateKeys(user.wallet_address).then((keys) => {
        if (keys) {
          setKeyPair(keys)
        }
      })
    }
  }, [isConnected, keyPair, user, router, generateKeys, setKeyPair])

  const handleUpload = async (
    file: File,
    metadata: { description?: string; tags?: string[]; sharedWith?: string[] }
  ) => {
    if (!user || !keyPair) {
      toast.error('Please connect your wallet first')
      return
    }

    try {
      setTotalProgress(10)
      
      // Encrypt file
      const encryptedResult = await encrypt(file, keyPair.publicKey)
      if (!encryptedResult) {
        throw new Error('Encryption failed')
      }
      setTotalProgress(40)

      // Create blob from encrypted data
      const encryptedBlob = new Blob([encryptedResult.encryptedData], {
        type: 'application/octet-stream',
      })

      // Upload to IPFS
      const ipfsResponse = await upload(
        encryptedBlob,
        `${file.name}.encrypted`,
        {
          encrypted: 'true',
          originalName: file.name,
          encryptedKey: encryptedResult.encryptedKey,
          iv: encryptedResult.iv,
        }
      )

      if (!ipfsResponse) {
        throw new Error('Upload to IPFS failed')
      }
      setTotalProgress(60)

      // Extract text content from file for embeddings
      console.log('Extracting text from file for embeddings...')
      const extractedText = await extractTextFromFile(file)
      console.log('Extracted text length:', extractedText.length)
      
      // Prepare text with metadata
      const preparedText = prepareTextForEmbedding(
        file.name,
        metadata.description || '',
        metadata.tags || [],
        extractedText
      )
      
      // Tokenize for better processing
      const textChunks = tokenizeText(preparedText, 512)
      console.log('Text split into', textChunks.length, 'chunks')
      
      setTotalProgress(70)

      // Generate embeddings using HuggingFace
      console.log('Generating embeddings via HuggingFace API...')
      let embedding: number[] = []
      
      try {
        embedding = textChunks.length > 1
          ? await generateEmbeddings(textChunks.join(' ')) // Join chunks for single embedding
          : await generateEmbeddings(preparedText)
        
        console.log('Embedding generated successfully:', embedding.length, 'dimensions')
      } catch (embeddingError: any) {
        console.error('Embedding generation failed:', embeddingError.message || embeddingError)
        // Show warning but continue with upload
        toast.error('Embedding generation failed: ' + (embeddingError.message || 'Unknown error'), {
          duration: 5000,
        })
        console.warn('Continuing upload without embeddings (search functionality will be limited)')
      }
      
      setTotalProgress(85)

      // Save metadata to Supabase (including encryption data and shared users)
      const fileMetadata = await saveFileMetadata({
        user_id: user.id,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        ipfs_hash: ipfsResponse.IpfsHash,
        encrypted: true,
        public_key_used: keyPair.publicKey,
        encrypted_key: encryptedResult.encryptedKey,
        iv: encryptedResult.iv,
        description: metadata.description,
        tags: metadata.tags,
        shared_with: metadata.sharedWith,
        embedding_vector: embedding.length > 0 ? embedding : undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        access_count: 0,
      } as any)

      if (!fileMetadata) {
        throw new Error('Failed to save file metadata')
      }

      setTotalProgress(100)

      // Add to store
      addFile(fileMetadata)

      // Log activity and run anomaly detection
      await logActivity('upload', {
        fileId: fileMetadata.id,
        fileName: file.name,
        success: true,
      })

      toast.success('File uploaded successfully!')
      
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Upload failed')
      setTotalProgress(0)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className="lg:pl-64">
        {/* Header */}
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="pl-16 pr-6 py-4 lg:px-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Upload File</h1>
              <p className="text-sm text-muted-foreground">
                Encrypted and stored on IPFS
              </p>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <ConnectWallet />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6 max-w-4xl mx-auto space-y-6">
          {/* Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">How it works</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Your file is encrypted client-side with RSA-2048</li>
                      <li>• Encrypted file is uploaded to IPFS via Pinata</li>
                      <li>• Only you can decrypt with your private key</li>
                      <li>• AI embeddings enable semantic search</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Key Status */}
          {keyPair && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Encryption Keys
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">RSA-2048</Badge>
                    <Badge variant="outline">Active</Badge>
                    <span className="text-sm text-muted-foreground ml-auto">
                      Keys ready for encryption
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Upload Zone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <UploadZone
              onUpload={handleUpload}
              isUploading={isEncrypting || isUploading}
              progress={totalProgress}
            />
          </motion.div>

        </main>
      </div>
    </div>
  )
}

import { useState, useCallback } from 'react'
import { uploadToPinata, getFromIPFS, unpinFromIPFS } from '@/lib/pinata'
import { PinataUploadResponse } from '@/types'
import toast from 'react-hot-toast'

export function usePinataUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDownloading, setIsDownloading] = useState(false)

  // Upload file to IPFS
  const upload = useCallback(
    async (
      file: Blob,
      fileName: string,
      metadata?: Record<string, any>
    ): Promise<PinataUploadResponse | null> => {
      setIsUploading(true)
      setUploadProgress(0)

      try {
        // Simulate progress (since axios doesn't provide upload progress easily)
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => Math.min(prev + 10, 90))
        }, 200)

        const response = await uploadToPinata(file, fileName, metadata)

        clearInterval(progressInterval)
        setUploadProgress(100)

        toast.success('File uploaded to IPFS successfully')
        return response
      } catch (error) {
        console.error('Error uploading to IPFS:', error)
        toast.error('Failed to upload file to IPFS')
        return null
      } finally {
        setIsUploading(false)
        setTimeout(() => setUploadProgress(0), 1000)
      }
    },
    []
  )

  // Download file from IPFS
  const download = useCallback(async (ipfsHash: string): Promise<Blob | null> => {
    setIsDownloading(true)
    try {
      const blob = await getFromIPFS(ipfsHash)
      toast.success('File downloaded from IPFS')
      return blob
    } catch (error) {
      console.error('Error downloading from IPFS:', error)
      toast.error('Failed to download file from IPFS')
      return null
    } finally {
      setIsDownloading(false)
    }
  }, [])

  // Unpin file from IPFS
  const unpin = useCallback(async (ipfsHash: string): Promise<boolean> => {
    try {
      const success = await unpinFromIPFS(ipfsHash)
      if (success) {
        toast.success('File unpinned from IPFS')
      }
      return success
    } catch (error) {
      console.error('Error unpinning from IPFS:', error)
      toast.error('Failed to unpin file from IPFS')
      return false
    }
  }, [])

  return {
    isUploading,
    uploadProgress,
    isDownloading,
    upload,
    download,
    unpin,
  }
}

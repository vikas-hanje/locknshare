'use client'

import { useState, useEffect } from 'react'
import { X, Download, ExternalLink } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FileMetadata } from '@/types'

interface FilePreviewProps {
  file: FileMetadata | null
  decryptedBlob: Blob | null
  isOpen: boolean
  onClose: () => void
  onDownload: () => void
}

export function FilePreview({ file, decryptedBlob, isOpen, onClose, onDownload }: FilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewType, setPreviewType] = useState<'image' | 'pdf' | 'video' | 'audio' | 'text' | 'unsupported'>('unsupported')

  useEffect(() => {
    if (!decryptedBlob || !file) {
      setPreviewUrl(null)
      return
    }

    // Create object URL for preview
    const url = URL.createObjectURL(decryptedBlob)
    setPreviewUrl(url)

    // Determine preview type
    if (file.file_type.startsWith('image/')) {
      setPreviewType('image')
    } else if (file.file_type === 'application/pdf') {
      setPreviewType('pdf')
    } else if (file.file_type.startsWith('video/')) {
      setPreviewType('video')
    } else if (file.file_type.startsWith('audio/')) {
      setPreviewType('audio')
    } else if (file.file_type.startsWith('text/') || file.file_type.includes('json')) {
      setPreviewType('text')
    } else {
      setPreviewType('unsupported')
    }

    // Cleanup
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [decryptedBlob, file])

  if (!file) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-card/50">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{file.file_name}</h3>
            <p className="text-xs text-muted-foreground">
              {(file.file_size / 1024 / 1024).toFixed(2)} MB • {file.file_type}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="overflow-auto max-h-[calc(90vh-80px)] bg-muted/20">
          {previewType === 'image' && previewUrl && (
            <div className="flex items-center justify-center p-4">
              <img
                src={previewUrl}
                alt={file.file_name}
                className="max-w-full h-auto max-h-[70vh] object-contain rounded"
              />
            </div>
          )}

          {previewType === 'pdf' && previewUrl && (
            <iframe
              src={previewUrl}
              className="w-full h-[70vh] border-0"
              title={file.file_name}
            />
          )}

          {previewType === 'video' && previewUrl && (
            <div className="flex items-center justify-center p-4">
              <video
                src={previewUrl}
                controls
                className="max-w-full max-h-[70vh] rounded"
              >
                Your browser does not support video playback.
              </video>
            </div>
          )}

          {previewType === 'audio' && previewUrl && (
            <div className="flex items-center justify-center p-8">
              <div className="w-full max-w-2xl">
                <audio
                  src={previewUrl}
                  controls
                  className="w-full"
                >
                  Your browser does not support audio playback.
                </audio>
              </div>
            </div>
          )}

          {previewType === 'text' && previewUrl && (
            <div className="p-6">
              <iframe
                src={previewUrl}
                className="w-full h-[60vh] border rounded bg-background"
                title={file.file_name}
              />
            </div>
          )}

          {previewType === 'unsupported' && (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <ExternalLink className="h-16 w-16 text-muted-foreground mb-4" />
              <h4 className="text-lg font-semibold mb-2">Preview not available</h4>
              <p className="text-muted-foreground mb-6 max-w-md">
                This file type ({file.file_type}) cannot be previewed in the browser.
                Please download it to view.
              </p>
              <Button onClick={onDownload} className="gap-2">
                <Download className="h-4 w-4" />
                Download File
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

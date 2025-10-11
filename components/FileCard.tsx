'use client'

import { FileMetadata } from '@/types'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Download, Eye, Trash2, Share2, Lock } from 'lucide-react'
import { formatBytes, formatDate, getFileExtension } from '@/lib/utils'
import { motion } from 'framer-motion'

interface FileCardProps {
  file: FileMetadata
  onDownload?: (file: FileMetadata) => void
  onView?: (file: FileMetadata) => void
  onDelete?: (file: FileMetadata) => void
  onShare?: (file: FileMetadata) => void
}

export function FileCard({ file, onDownload, onView, onDelete, onShare }: FileCardProps) {
  const fileExt = getFileExtension(file.file_name)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-lg truncate">{file.file_name}</h3>
                {file.encrypted && (
                  <Lock className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="secondary">{fileExt.toUpperCase()}</Badge>
                <Badge variant="outline">{formatBytes(file.file_size)}</Badge>
                <Badge variant="outline">{file.access_count} views</Badge>
              </div>
              {file.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {file.description}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {file.tags?.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>

          <div className="text-xs text-muted-foreground">
            Uploaded {formatDate(file.created_at)}
          </div>
        </CardContent>

        <CardFooter className="flex gap-2 border-t pt-4">
          {onView && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onView(file)}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              View
            </Button>
          )}
          {onDownload && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDownload(file)}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
          {onShare && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onShare(file)}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(file)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  )
}

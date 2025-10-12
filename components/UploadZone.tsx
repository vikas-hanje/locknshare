'use client'

import { useCallback, useState } from 'react'
import { Upload, File, X, Loader2, Lock, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { formatBytes } from '@/lib/utils'

interface UploadZoneProps {
  onUpload: (file: File, metadata: { description?: string; tags?: string[]; sharedWith?: string[] }) => Promise<void>
  isUploading: boolean
  progress: number
}

export function UploadZone({ onUpload, isUploading, progress }: UploadZoneProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [currentTag, setCurrentTag] = useState('')
  const [sharedWith, setSharedWith] = useState<string[]>([])
  const [currentUsername, setCurrentUsername] = useState('')
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleAddTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()])
      setCurrentTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleAddUsername = () => {
    let username = currentUsername.trim()
    
    // Add @ prefix if not present
    if (username && !username.startsWith('@')) {
      username = '@' + username
    }
    
    // Remove @ for checking and storing (we'll display with @)
    const usernameWithoutAt = username.substring(1)
    
    if (usernameWithoutAt && !sharedWith.includes(usernameWithoutAt)) {
      setSharedWith([...sharedWith, usernameWithoutAt])
      setCurrentUsername('')
    }
  }

  const handleRemoveUsername = (usernameToRemove: string) => {
    setSharedWith(sharedWith.filter(u => u !== usernameToRemove))
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    await onUpload(selectedFile, {
      description: description.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      sharedWith: sharedWith.length > 0 ? sharedWith : undefined,
    })

    // Reset form
    setSelectedFile(null)
    setDescription('')
    setTags([])
    setSharedWith([])
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          {!selectedFile ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
                transition-colors duration-200
                ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                hover:border-primary hover:bg-primary/5
              `}
            >
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileSelect}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-semibold mb-2">
                  Drop your file here or click to browse
                </p>
                <p className="text-sm text-muted-foreground">
                  Files will be encrypted before upload
                </p>
              </label>
            </div>
          ) : (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary">
                  <div className="flex items-center gap-3">
                    <File className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-semibold">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatBytes(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    placeholder="What's this file about?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="tags"
                      placeholder="Add tags..."
                      value={currentTag}
                      onChange={(e) => setCurrentTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    />
                    <Button type="button" onClick={handleAddTag} variant="outline">
                      Add
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          #{tag}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => handleRemoveTag(tag)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shared">Share with (optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="shared"
                      placeholder="@username"
                      value={currentUsername}
                      onChange={(e) => setCurrentUsername(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddUsername())}
                    />
                    <Button type="button" onClick={handleAddUsername} variant="outline">
                      <Users className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                  {sharedWith.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {sharedWith.map(username => (
                        <Badge key={username} variant="outline" className="gap-1">
                          @{username}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => handleRemoveUsername(username)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Only users with these usernames can access this file
                  </p>
                </div>

                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-primary" />
                        {progress < 50 ? 'Encrypting...' : 'Uploading to IPFS...'}
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                )}

                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="w-full"
                  size="lg"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Encrypt & Upload
                    </>
                  )}
                </Button>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

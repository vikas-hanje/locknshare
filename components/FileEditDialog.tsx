'use client'

import { useState } from 'react'
import { FileMetadata } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { X, Users, Tag } from 'lucide-react'
import { updateFileMetadata } from '@/lib/supabase'
import { encryptKeyForUsers } from '@/lib/sharedEncryption'
import toast from 'react-hot-toast'

interface FileEditDialogProps {
  file: FileMetadata
  isOpen: boolean
  onClose: () => void
  onUpdate: (fileId: string, updates: Partial<FileMetadata>) => void
}

export function FileEditDialog({ file, isOpen, onClose, onUpdate }: FileEditDialogProps) {
  const [tags, setTags] = useState<string[]>(file.tags || [])
  const [currentTag, setCurrentTag] = useState('')
  const [sharedWith, setSharedWith] = useState<string[]>(file.shared_with || [])
  const [currentUsername, setCurrentUsername] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleAddTag = () => {
    const tag = currentTag.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
      setCurrentTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove))
  }

  const handleAddUsername = () => {
    let username = currentUsername.trim()
    
    // Add @ prefix if not present
    if (username && !username.startsWith('@')) {
      username = '@' + username
    }
    
    // Remove @ for storing
    const usernameWithoutAt = username.substring(1)
    
    if (usernameWithoutAt && !sharedWith.includes(usernameWithoutAt)) {
      setSharedWith([...sharedWith, usernameWithoutAt])
      setCurrentUsername('')
    }
  }

  const handleRemoveUsername = (username: string) => {
    setSharedWith(sharedWith.filter(u => u !== username))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Check if shared users changed
      const originalShared = file.shared_with || []
      const newUsers = sharedWith.filter(u => !originalShared.includes(u))
      
      let updatedSharedKeys = file.shared_keys || []
      
      // If new users were added, encrypt the file key for them
      if (newUsers.length > 0 && file.encrypted_key) {
        toast.loading('Encrypting keys for new users...', { id: 'encrypt' })
        const newKeys = await encryptKeyForUsers(file.encrypted_key, newUsers)
        
        // Merge with existing shared keys
        updatedSharedKeys = [
          ...updatedSharedKeys.filter((k: any) => sharedWith.includes(k.username)),
          ...newKeys
        ]
        toast.success(`Encrypted keys for ${newKeys.length} new users`, { id: 'encrypt' })
      } else if (sharedWith.length < originalShared.length) {
        // Users were removed - filter out their keys
        updatedSharedKeys = updatedSharedKeys.filter((k: any) => sharedWith.includes(k.username))
      }

      // Update in database
      const success = await updateFileMetadata(file.id, {
        tags: tags.length > 0 ? tags : undefined,
        shared_with: sharedWith.length > 0 ? sharedWith : undefined,
        shared_keys: updatedSharedKeys.length > 0 ? updatedSharedKeys : undefined,
      })

      if (success) {
        // Update local state
        onUpdate(file.id, {
          tags,
          shared_with: sharedWith,
          shared_keys: updatedSharedKeys,
        })
        toast.success('File updated successfully')
        onClose()
      } else {
        throw new Error('Update failed')
      }
    } catch (error) {
      console.error('Error updating file:', error)
      toast.error('Failed to update file')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit File Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Name Display */}
          <div>
            <Label className="text-sm font-medium text-muted-foreground">File Name</Label>
            <p className="text-sm font-medium mt-1">{file.file_name}</p>
          </div>

          {/* Tags Section */}
          <div className="space-y-2">
            <Label htmlFor="tags" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Tags
            </Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                placeholder="Add tag..."
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddTag()
                  }
                }}
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
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Shared With Section */}
          <div className="space-y-2">
            <Label htmlFor="shared" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Share with Users
            </Label>
            <div className="flex gap-2">
              <Input
                id="shared"
                placeholder="@username"
                value={currentUsername}
                onChange={(e) => setCurrentUsername(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddUsername()
                  }
                }}
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
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

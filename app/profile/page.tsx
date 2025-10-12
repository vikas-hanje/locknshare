'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { User, Wallet, Settings, Edit2, Check, X, Upload as UploadIcon, Camera } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Sidebar } from '@/components/Sidebar'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ConnectWallet } from '@/components/ConnectWallet'
import { useStore } from '@/store/useStore'
import { updateUserUsername, updateUserProfileImage } from '@/lib/supabase'
import { truncateAddress } from '@/lib/utils'
import { usePinataUpload } from '@/hooks/usePinataUpload'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const router = useRouter()
  const { isConnected, user, walletAddress, ensName, setUser } = useStore()
  const [isEditingUsername, setIsEditingUsername] = useState(false)
  const [username, setUsername] = useState(user?.username || '')
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { upload } = usePinataUpload()

  useEffect(() => {
    if (!isConnected) {
      router.push('/')
    }
  }, [isConnected, router])

  useEffect(() => {
    setUsername(user?.username || '')
  }, [user?.username])

  const handleSaveUsername = async () => {
    if (!user) return

    try {
      toast.loading('Updating username...', { id: 'username' })
      const updatedUser = await updateUserUsername(user.id, username)
      
      if (updatedUser) {
        setUser(updatedUser)
        toast.success('Username updated successfully', { id: 'username' })
        setIsEditingUsername(false)
      } else {
        throw new Error('Failed to update username')
      }
    } catch (error) {
      console.error('Update username error:', error)
      toast.error('Failed to update username', { id: 'username' })
    }
  }

  const handleCancelEdit = () => {
    setUsername(user?.username || '')
    setIsEditingUsername(false)
  }

  const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    setIsUploadingImage(true)
    toast.loading('Uploading profile image...', { id: 'profile-image' })

    try {
      // Upload to IPFS via Pinata
      const ipfsResponse = await upload(file, `profile-${user.id}-${Date.now()}`, {
        type: 'profile-image',
        userId: user.id,
      })

      if (!ipfsResponse) {
        throw new Error('Failed to upload image to IPFS')
      }

      // Create IPFS URL
      const imageUrl = `https://gateway.pinata.cloud/ipfs/${ipfsResponse.IpfsHash}`

      // Update user profile in database
      const updatedUser = await updateUserProfileImage(user.id, imageUrl)
      
      if (updatedUser) {
        setUser(updatedUser)
        toast.success('Profile image updated successfully', { id: 'profile-image' })
      } else {
        throw new Error('Failed to update profile in database')
      }
    } catch (error: any) {
      console.error('Profile image upload error:', error)
      toast.error(error.message || 'Failed to upload profile image', { id: 'profile-image' })
    } finally {
      setIsUploadingImage(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className="lg:pl-64">
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="px-6 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Profile</h1>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <ConnectWallet />
            </div>
          </div>
        </header>

        <main className="p-6 max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Image Section */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    {user?.profile_image_url ? (
                      <AvatarImage src={user.profile_image_url} alt={user.username || 'User'} />
                    ) : (
                      <AvatarFallback className="text-2xl">
                        {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                    title="Upload profile image"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageUpload}
                    className="hidden"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium mb-1">{user?.username || 'Set your username'}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Click the camera icon to upload a profile picture
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Max size: 5MB • Formats: JPG, PNG, GIF
                  </p>
                </div>
              </div>
              
              <div className="border-t pt-4"></div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Username</label>
                  {!isEditingUsername ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingUsername(true)}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSaveUsername}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
                {isEditingUsername ? (
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    className="max-w-md"
                  />
                ) : (
                  <p className="text-muted-foreground">
                    {user?.username || 'No username set'}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Wallet Address</label>
                <p className="text-muted-foreground font-mono text-sm">{walletAddress}</p>
              </div>
              {ensName && (
                <div>
                  <label className="text-sm font-medium">ENS Name</label>
                  <p className="text-muted-foreground">{ensName}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Wallet, Settings, Edit2, Check, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sidebar } from '@/components/Sidebar'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ConnectWallet } from '@/components/ConnectWallet'
import { useStore } from '@/store/useStore'
import { updateUserUsername } from '@/lib/supabase'
import { truncateAddress } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const router = useRouter()
  const { isConnected, user, walletAddress, ensName, setUser } = useStore()
  const [isEditingUsername, setIsEditingUsername] = useState(false)
  const [username, setUsername] = useState(user?.username || '')

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
            <CardContent className="space-y-4">
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

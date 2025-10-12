'use client'

import { Wallet, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMetaMask } from '@/hooks/useMetaMask'
import { useStore } from '@/store/useStore'
import { truncateAddress } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function ConnectWallet() {
  const { connect, disconnect, isLoading } = useMetaMask()
  const { isConnected, walletAddress, ensName, user } = useStore()

  if (isConnected && walletAddress) {
    // Prioritize: username > ENS name > truncated wallet address
    const displayName = user?.username || ensName || truncateAddress(walletAddress)

    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary">
          <Avatar className="h-6 w-6">
            {user?.profile_image_url ? (
              <AvatarImage src={user.profile_image_url} alt={displayName} />
            ) : (
              <AvatarFallback className="text-xs">
                {user?.username ? user.username.charAt(0).toUpperCase() : '?'}
              </AvatarFallback>
            )}
          </Avatar>
          <span className="text-sm font-medium">
            {displayName}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={disconnect}
        >
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <Button
      onClick={connect}
      disabled={isLoading}
      className="gap-2"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <Wallet className="h-4 w-4" />
          Connect Wallet
        </>
      )}
    </Button>
  )
}

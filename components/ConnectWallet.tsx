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
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg bg-secondary max-w-[140px] sm:max-w-none">
          <Avatar className="h-6 w-6 flex-shrink-0">
            {user?.profile_image_url ? (
              <AvatarImage src={user.profile_image_url} alt={displayName} />
            ) : (
              <AvatarFallback className="text-xs">
                {user?.username ? user.username.charAt(0).toUpperCase() : '?'}
              </AvatarFallback>
            )}
          </Avatar>
          <span className="text-sm font-medium truncate hidden sm:inline">
            {displayName}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={disconnect}
          className="text-xs sm:text-sm"
        >
          <span className="hidden sm:inline">Disconnect</span>
          <span className="sm:hidden">Exit</span>
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

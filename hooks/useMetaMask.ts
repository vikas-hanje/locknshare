import { useState, useEffect, useCallback } from 'react'
import { BrowserProvider, JsonRpcSigner } from 'ethers'
import { useStore } from '@/store/useStore'
import { createOrUpdateUser, getUserByWallet, updateUserLastLogin } from '@/lib/supabase'
import toast from 'react-hot-toast'

declare global {
  interface Window {
    ethereum?: any
  }
}

export function useMetaMask() {
  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const {
    setUser,
    setWalletAddress,
    setEnsName,
    setIsConnected,
    logout: storeLogout,
  } = useStore()

  // Check if MetaMask is installed
  const isMetaMaskInstalled = useCallback(() => {
    return typeof window !== 'undefined' && Boolean(window.ethereum)
  }, [])

  // Initialize provider
  useEffect(() => {
    if (isMetaMaskInstalled()) {
      const web3Provider = new BrowserProvider(window.ethereum)
      setProvider(web3Provider)
    }
  }, [isMetaMaskInstalled])

  // Connect to MetaMask
  const connect = useCallback(async () => {
    if (!isMetaMaskInstalled()) {
      toast.error('Please install MetaMask to continue')
      return
    }

    // Clear disconnected flag when user manually connects
    localStorage.removeItem('wallet_disconnected')

    setIsLoading(true)
    try {
      const web3Provider = new BrowserProvider(window.ethereum)
      
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      })

      const address = accounts[0]
      const web3Signer = await web3Provider.getSigner()
      
      // Get ENS name if available
      let ensName = null
      try {
        ensName = await web3Provider.lookupAddress(address)
      } catch (error) {
        // ENS not available
      }

      // Create signature message
      const message = `Sign this message to authenticate with LockNShare\n\nWallet: ${address}\nTimestamp: ${Date.now()}`
      const signature = await web3Signer.signMessage(message)

      // Check if user exists in database
      let user = await getUserByWallet(address)
      
      if (!user) {
        // Create new user
        user = await createOrUpdateUser({
          wallet_address: address,
          ens_name: ensName || undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      } else {
        // Update last login
        await updateUserLastLogin(user.id)
      }

      if (user) {
        setProvider(web3Provider)
        setSigner(web3Signer)
        setUser(user)
        setWalletAddress(address)
        setEnsName(ensName)
        setIsConnected(true)
        toast.success(`Connected to ${ensName || address.slice(0, 6)}...${address.slice(-4)}`)
      }
    } catch (error: any) {
      console.error('Error connecting to MetaMask:', error)
      toast.error(error.message || 'Failed to connect to MetaMask')
    } finally {
      setIsLoading(false)
    }
  }, [isMetaMaskInstalled, setUser, setWalletAddress, setEnsName, setIsConnected])

  // Disconnect
  const disconnect = useCallback(() => {
    setProvider(null)
    setSigner(null)
    setUser(null)
    setWalletAddress(null)
    setEnsName(null)
    setIsConnected(false)
    
    // Set flag to prevent auto-reconnect
    localStorage.setItem('wallet_disconnected', 'true')
    
    toast.success('Wallet disconnected')
  }, [setProvider, setSigner, setUser, setWalletAddress, setEnsName, setIsConnected])

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect()
      } else {
        // Reconnect with new account
        connect()
      }
    }

    const handleChainChanged = () => {
      window.location.reload()
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [connect, disconnect])

  // Auto-connect if previously connected (only once on mount)
  useEffect(() => {
    const autoConnect = async () => {
      if (!isMetaMaskInstalled()) return
      
      // Check if user manually disconnected
      const wasDisconnected = localStorage.getItem('wallet_disconnected')
      if (wasDisconnected === 'true') {
        return
      }
      
      // Check if already connected in store
      const { isConnected } = useStore.getState()
      if (isConnected) return

      try {
        const accounts = await window.ethereum.request({
          method: 'eth_accounts',
        })

        if (accounts.length > 0) {
          // Silently reconnect without signing again
          const address = accounts[0]
          const web3Provider = new BrowserProvider(window.ethereum)
          const web3Signer = await web3Provider.getSigner()
          
          let ensName = null
          try {
            ensName = await web3Provider.lookupAddress(address)
          } catch (error) {
            // ENS not available
          }

          const user = await getUserByWallet(address)
          
          if (user) {
            setProvider(web3Provider)
            setSigner(web3Signer)
            setUser(user)
            setWalletAddress(address)
            setEnsName(ensName)
            setIsConnected(true)
          }
        }
      } catch (error) {
        console.error('Error auto-connecting:', error)
      }
    }

    autoConnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  return {
    provider,
    signer,
    isLoading,
    isMetaMaskInstalled: isMetaMaskInstalled(),
    connect,
    disconnect,
  }
}

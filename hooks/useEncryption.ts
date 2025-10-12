import { useState, useCallback } from 'react'
import {
  generateRSAKeyPair,
  encryptFile,
  decryptFile,
  encryptPrivateKey,
  decryptPrivateKey,
} from '@/lib/encryption'
import {
  saveKeysToCloud,
  retrieveKeysFromCloud,
  requestWalletSignature,
} from '@/lib/keyManagement'
import { RSAKeyPair, EncryptionResult } from '@/types'
import toast from 'react-hot-toast'

export function useEncryption() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isEncrypting, setIsEncrypting] = useState(false)
  const [isDecrypting, setIsDecrypting] = useState(false)

  // Generate new RSA key pair and store in localStorage
  const generateKeys = useCallback(async (walletAddress?: string): Promise<RSAKeyPair | null> => {
    setIsGenerating(true)
    try {
      // Check if keys already exist in localStorage for this wallet
      if (walletAddress) {
        const stored = localStorage.getItem(`encryption_keys_${walletAddress}`)
        if (stored) {
          const keys = JSON.parse(stored)
          console.log('Restored encryption keys from localStorage')
          return keys
        }
      }

      // Generate new keys
      const keyPair = await generateRSAKeyPair()
      
      // Store in localStorage if wallet address provided
      if (walletAddress) {
        localStorage.setItem(`encryption_keys_${walletAddress}`, JSON.stringify(keyPair))
        console.log('Stored encryption keys in localStorage')
      }
      
      toast.success('Encryption keys generated successfully')
      return keyPair
    } catch (error) {
      console.error('Error generating keys:', error)
      toast.error('Failed to generate encryption keys')
      return null
    } finally {
      setIsGenerating(false)
    }
  }, [])

  // Encrypt file
  const encrypt = useCallback(
    async (file: File, publicKey: string): Promise<EncryptionResult | null> => {
      setIsEncrypting(true)
      try {
        const arrayBuffer = await file.arrayBuffer()
        const result = await encryptFile(arrayBuffer, publicKey)
        return result
      } catch (error) {
        console.error('Error encrypting file:', error)
        toast.error('Failed to encrypt file')
        return null
      } finally {
        setIsEncrypting(false)
      }
    },
    []
  )

  // Decrypt file
  const decrypt = useCallback(
    async (
      encryptedResult: EncryptionResult,
      privateKey: string
    ): Promise<ArrayBuffer | null> => {
      setIsDecrypting(true)
      try {
        const decrypted = await decryptFile(encryptedResult, privateKey)
        return decrypted
      } catch (error) {
        console.error('Error decrypting file:', error)
        // Don't show toast here - let caller handle it
        return null
      } finally {
        setIsDecrypting(false)
      }
    },
    []
  )

  // Encrypt private key with password
  const securePrivateKey = useCallback(
    async (privateKey: string, password: string): Promise<string | null> => {
      try {
        const encrypted = await encryptPrivateKey(privateKey, password)
        return encrypted
      } catch (error) {
        console.error('Error securing private key:', error)
        toast.error('Failed to secure private key')
        return null
      }
    },
    []
  )

  // Decrypt private key with password
  const unlockPrivateKey = useCallback(
    async (encryptedKey: string, password: string): Promise<string | null> => {
      try {
        const decrypted = await decryptPrivateKey(encryptedKey, password)
        return decrypted
      } catch (error) {
        console.error('Error unlocking private key:', error)
        toast.error('Incorrect password or corrupted key')
        return null
      }
    },
    []
  )

  // Initialize keys with cloud sync (cross-device support)
  const initializeKeys = useCallback(
    async (userId: string, walletAddress: string): Promise<RSAKeyPair | null> => {
      setIsGenerating(true)
      try {
        // 1. Check localStorage first (fastest)
        const stored = localStorage.getItem(`encryption_keys_${walletAddress}`)
        if (stored) {
          const keys = JSON.parse(stored)
          console.log('✅ Restored keys from localStorage')
          return keys
        }

        // 2. Request wallet signature for cloud access
        toast.loading('Sign message to access your encryption keys...', { id: 'keys' })
        const signature = await requestWalletSignature(walletAddress)

        // 3. Try to retrieve from cloud
        const cloudKeys = await retrieveKeysFromCloud(userId, signature)
        if (cloudKeys) {
          // Save to localStorage for faster access next time
          localStorage.setItem(`encryption_keys_${walletAddress}`, JSON.stringify(cloudKeys))
          toast.success('Keys retrieved from cloud', { id: 'keys' })
          return cloudKeys
        }

        // 4. Generate new keys if none found
        toast.loading('Generating new encryption keys...', { id: 'keys' })
        const keyPair = await generateRSAKeyPair()

        // 5. Save to both cloud and localStorage
        localStorage.setItem(`encryption_keys_${walletAddress}`, JSON.stringify(keyPair))
        await saveKeysToCloud(userId, walletAddress, keyPair, signature)
        
        toast.success('Encryption keys generated and saved', { id: 'keys' })
        return keyPair
      } catch (error: any) {
        console.error('Error initializing keys:', error)
        if (error.message?.includes('User rejected')) {
          toast.error('Signature required to access encryption keys', { id: 'keys' })
        } else {
          toast.error('Failed to initialize encryption keys', { id: 'keys' })
        }
        return null
      } finally {
        setIsGenerating(false)
      }
    },
    []
  )

  return {
    isGenerating,
    isEncrypting,
    isDecrypting,
    generateKeys,
    initializeKeys,
    encrypt,
    decrypt,
    securePrivateKey,
    unlockPrivateKey,
  }
}

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
        // Import savePublicKeyToDatabase at the beginning to avoid circular dependency
        const { savePublicKeyToDatabase } = await import('@/lib/sharedEncryption')
        
        // 1. Check localStorage first (fastest)
        const stored = localStorage.getItem(`encryption_keys_${walletAddress}`)
        if (stored) {
          try {
            const keys = JSON.parse(stored)
            if (keys && keys.publicKey && keys.privateKey) {
              console.log('✅ Restored keys from localStorage')
              console.log('🔑 Public Key (first 50 chars):', keys.publicKey.substring(0, 50))
              
              // Ensure public key is in database for file sharing (critical for cross-device)
              await savePublicKeyToDatabase(userId, keys.publicKey)
              console.log('✅ Public key ensured in database for file sharing')
              
              return keys
            }
          } catch (parseError) {
            console.error('Failed to parse stored keys:', parseError)
            localStorage.removeItem(`encryption_keys_${walletAddress}`)
          }
        }

        // 2. Request wallet signature for cloud access
        console.log('📝 Requesting wallet signature for cloud key access...')
        toast.loading('Sign message to access your encryption keys...', { id: 'keys' })
        const signature = await requestWalletSignature(walletAddress)
        console.log('✅ Wallet signature obtained')

        // 3. Try to retrieve from cloud
        console.log('☁️ Retrieving keys from cloud...')
        const cloudKeys = await retrieveKeysFromCloud(userId, signature)
        if (cloudKeys && cloudKeys.publicKey && cloudKeys.privateKey) {
          // Save to localStorage for faster access next time
          localStorage.setItem(`encryption_keys_${walletAddress}`, JSON.stringify(cloudKeys))
          console.log('✅ Keys retrieved from cloud and saved to localStorage')
          console.log('🔑 Public Key (first 50 chars):', cloudKeys.publicKey.substring(0, 50))
          
          // Save public key to database for file sharing
          await savePublicKeyToDatabase(userId, cloudKeys.publicKey)
          console.log('✅ Public key saved to database for file sharing')
          
          toast.success('Keys synced from cloud ✓', { id: 'keys' })
          return cloudKeys
        }

        // 4. Generate new keys if none found
        console.log('⚡ Generating new encryption keys...')
        toast.loading('Generating new encryption keys...', { id: 'keys' })
        const keyPair = await generateRSAKeyPair()

        // 5. Save to both cloud and localStorage
        localStorage.setItem(`encryption_keys_${walletAddress}`, JSON.stringify(keyPair))
        console.log('💾 Saving keys to cloud...')
        await saveKeysToCloud(userId, walletAddress, keyPair, signature)
        
        // Save public key to database for file sharing
        await savePublicKeyToDatabase(userId, keyPair.publicKey)
        console.log('✅ Public key saved to database for file sharing')
        
        console.log('✅ New keys generated and saved')
        console.log('🔑 Public Key (first 50 chars):', keyPair.publicKey.substring(0, 50))
        toast.success('Encryption keys generated and saved ✓', { id: 'keys' })
        return keyPair
      } catch (error: any) {
        console.error('❌ Error initializing keys:', error)
        if (error.message?.includes('User rejected') || error.message?.includes('denied')) {
          toast.error('Signature required to access encryption keys', { id: 'keys' })
        } else {
          toast.error(`Failed to initialize keys: ${error.message}`, { id: 'keys' })
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

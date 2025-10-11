import { useState, useCallback } from 'react'
import {
  generateRSAKeyPair,
  encryptFile,
  decryptFile,
  encryptPrivateKey,
  decryptPrivateKey,
} from '@/lib/encryption'
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
        toast.error('Failed to decrypt file')
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

  return {
    isGenerating,
    isEncrypting,
    isDecrypting,
    generateKeys,
    encrypt,
    decrypt,
    securePrivateKey,
    unlockPrivateKey,
  }
}

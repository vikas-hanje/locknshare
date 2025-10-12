/**
 * Cross-Device Encryption Key Management
 * Stores encrypted keys in Supabase, encrypted with wallet signature
 */

import { supabase } from './supabase'
import { RSAKeyPair } from '@/types'

/**
 * Derive encryption key from wallet signature
 * This ensures only the wallet owner can decrypt their keys
 */
export async function deriveKeyFromSignature(signature: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const sigData = encoder.encode(signature)
  
  // Import signature as key material
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    sigData,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )

  // Derive AES key using PBKDF2
  const salt = encoder.encode('locknshare-key-encryption-salt-v1')
  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )

  return derivedKey
}

/**
 * Encrypt key pair with wallet signature
 */
export async function encryptKeysWithSignature(
  keyPair: RSAKeyPair,
  signature: string
): Promise<string> {
  try {
    const derivedKey = await deriveKeyFromSignature(signature)
    
    // Generate random IV
    const iv = window.crypto.getRandomValues(new Uint8Array(12))
    
    // Convert keys to JSON string
    const keysJson = JSON.stringify(keyPair)
    const encoder = new TextEncoder()
    const keysData = encoder.encode(keysJson)
    
    // Encrypt
    const encryptedData = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      derivedKey,
      keysData
    )
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength)
    combined.set(iv, 0)
    combined.set(new Uint8Array(encryptedData), iv.length)
    
    // Convert to base64
    return arrayBufferToBase64(combined.buffer)
  } catch (error) {
    console.error('Error encrypting keys:', error)
    throw new Error('Failed to encrypt keys')
  }
}

/**
 * Decrypt key pair with wallet signature
 */
export async function decryptKeysWithSignature(
  encryptedKeys: string,
  signature: string
): Promise<RSAKeyPair> {
  try {
    const derivedKey = await deriveKeyFromSignature(signature)
    
    // Decode base64
    const combined = base64ToArrayBuffer(encryptedKeys)
    const combinedArray = new Uint8Array(combined)
    
    // Split IV and encrypted data
    const iv = combinedArray.slice(0, 12)
    const encryptedData = combinedArray.slice(12)
    
    // Decrypt
    const decryptedData = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      derivedKey,
      encryptedData
    )
    
    // Convert back to key pair
    const decoder = new TextDecoder()
    const keysJson = decoder.decode(decryptedData)
    return JSON.parse(keysJson) as RSAKeyPair
  } catch (error) {
    console.error('Error decrypting keys:', error)
    throw new Error('Failed to decrypt keys')
  }
}

/**
 * Save encrypted keys to Supabase
 */
export async function saveKeysToCloud(
  userId: string,
  walletAddress: string,
  keyPair: RSAKeyPair,
  signature: string
): Promise<boolean> {
  try {
    // Encrypt keys with signature
    const encryptedKeys = await encryptKeysWithSignature(keyPair, signature)
    
    // Save to Supabase
    const { error } = await supabase
      .from('user_keys')
      .upsert({
        user_id: userId,
        wallet_address: walletAddress,
        encrypted_keys: encryptedKeys,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })
    
    if (error) throw error
    
    console.log('✅ Keys saved to cloud')
    return true
  } catch (error) {
    console.error('Error saving keys to cloud:', error)
    return false
  }
}

/**
 * Retrieve and decrypt keys from Supabase
 */
export async function retrieveKeysFromCloud(
  userId: string,
  signature: string
): Promise<RSAKeyPair | null> {
  try {
    // Fetch encrypted keys
    const { data, error } = await supabase
      .from('user_keys')
      .select('encrypted_keys')
      .eq('user_id', userId)
      .single()
    
    if (error || !data) {
      console.log('No keys found in cloud')
      return null
    }
    
    // Decrypt keys
    const keyPair = await decryptKeysWithSignature(data.encrypted_keys, signature)
    
    console.log('✅ Keys retrieved from cloud')
    return keyPair
  } catch (error) {
    console.error('Error retrieving keys from cloud:', error)
    return null
  }
}

/**
 * Request wallet signature for key encryption/decryption
 */
export async function requestWalletSignature(walletAddress: string): Promise<string> {
  if (!window.ethereum) {
    throw new Error('MetaMask not found')
  }

  try {
    const message = `Sign this message to encrypt/decrypt your LockNShare keys.\n\nWallet: ${walletAddress}\nTimestamp: ${Date.now()}`
    
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [message, walletAddress],
    })
    
    return signature as string
  } catch (error) {
    console.error('Error requesting signature:', error)
    throw new Error('Failed to get wallet signature')
  }
}

// Helper functions
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

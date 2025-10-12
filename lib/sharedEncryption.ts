/**
 * Shared File Encryption
 * Enables multiple users to decrypt the same file
 */

import { supabase } from './supabase'

interface EncryptedKeyForUser {
  username: string
  encrypted_aes_key: string
}

/**
 * Get public key for a username
 */
export async function getPublicKeyForUsername(username: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('public_key')
      .eq('username', username)
      .single()

    if (error || !data?.public_key) {
      console.error(`No public key found for @${username}`)
      return null
    }

    return data.public_key
  } catch (error) {
    console.error('Error fetching public key:', error)
    return null
  }
}

/**
 * Encrypt AES key for multiple users (for file sharing)
 * Returns array of encrypted keys, one for each user
 */
export async function encryptKeyForUsers(
  aesKeyBase64: string,
  usernames: string[]
): Promise<EncryptedKeyForUser[]> {
  const encryptedKeys: EncryptedKeyForUser[] = []

  for (const username of usernames) {
    try {
      // Get user's public key
      const publicKey = await getPublicKeyForUsername(username)
      if (!publicKey) {
        console.warn(`Skipping @${username} - no public key`)
        continue
      }

      // Import RSA public key
      const publicKeyBuffer = base64ToArrayBuffer(publicKey)
      const cryptoKey = await window.crypto.subtle.importKey(
        'spki',
        publicKeyBuffer,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        true,
        ['encrypt']
      )

      // Encrypt AES key with user's RSA public key
      const aesKeyBuffer = base64ToArrayBuffer(aesKeyBase64)
      const encryptedKey = await window.crypto.subtle.encrypt(
        {
          name: 'RSA-OAEP',
        },
        cryptoKey,
        aesKeyBuffer
      )

      encryptedKeys.push({
        username,
        encrypted_aes_key: arrayBufferToBase64(encryptedKey),
      })

      console.log(`✅ Encrypted key for @${username}`)
    } catch (error) {
      console.error(`Error encrypting key for @${username}:`, error)
    }
  }

  return encryptedKeys
}

/**
 * Save user's public key to database
 */
export async function savePublicKeyToDatabase(
  userId: string,
  publicKey: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ public_key: publicKey })
      .eq('id', userId)

    if (error) throw error
    console.log('✅ Public key saved to database')
    return true
  } catch (error) {
    console.error('Error saving public key:', error)
    return false
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

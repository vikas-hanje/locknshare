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
 * Decrypt owner's RSA-encrypted AES key with owner's private key (PKCS8 base64)
 */
async function decryptOwnerEncryptedAesKey(
  ownerEncryptedAesKeyBase64: string,
  ownerPrivateKeyBase64: string
): Promise<ArrayBuffer> {
  // Import owner's private key
  const privateKeyBuffer = base64ToArrayBuffer(ownerPrivateKeyBase64)
  const privateKey = await window.crypto.subtle.importKey(
    'pkcs8',
    privateKeyBuffer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['decrypt']
  )

  // Decrypt AES key
  const encryptedKeyBuffer = base64ToArrayBuffer(ownerEncryptedAesKeyBase64)
  const rawAesKeyBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'RSA-OAEP',
    },
    privateKey,
    encryptedKeyBuffer
  )

  return rawAesKeyBuffer
}

/**
 * Encrypt AES key for multiple users starting from the owner's encrypted AES key
 * This is used when we only have file.encrypted_key (encrypted with owner's public key)
 */
export async function encryptKeyForUsersFromOwnerEncrypted(
  ownerEncryptedAesKeyBase64: string,
  ownerPrivateKeyBase64: string,
  usernames: string[]
): Promise<EncryptedKeyForUser[]> {
  try {
    const rawAesKeyBuffer = await decryptOwnerEncryptedAesKey(
      ownerEncryptedAesKeyBase64,
      ownerPrivateKeyBase64
    )
    const rawAesKeyBase64 = arrayBufferToBase64(rawAesKeyBuffer)
    return await encryptKeyForUsers(rawAesKeyBase64, usernames)
  } catch (error) {
    console.error('Error preparing shared keys from owner-encrypted AES key:', error)
    return []
  }
}

/**
 * Get public key for a username
 */
export async function getPublicKeyForUsername(username: string): Promise<string | null> {
  try {
    const normalizedUsername = username.toLowerCase().trim()
    console.log(`🔍 Looking up public key for username: "${normalizedUsername}"`)
    
    const { data, error } = await supabase
      .from('users')
      .select('public_key, id, wallet_address')
      .eq('username', normalizedUsername)
      .single()

    if (error) {
      console.error(`❌ Database error fetching public key for @${normalizedUsername}:`, error)
      return null
    }

    if (!data?.public_key) {
      console.error(`❌ No public key found for @${normalizedUsername} (user exists but no key)`)
      console.error('User details:', { id: data?.id, wallet: data?.wallet_address })
      return null
    }

    console.log(`✅ Found public key for @${normalizedUsername}`)
    return data.public_key
  } catch (error) {
    console.error(`❌ Exception fetching public key for @${username}:`, error)
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
        console.warn(`⚠️ Skipping @${username} - no public key found`)
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
      
      console.log(`✅ Successfully encrypted key for @${username}`)
    } catch (error) {
      console.error(`❌ Error encrypting key for @${username}:`, error)
      // Skip this user and continue with others
    }
  }

  console.log(`🔐 Total encrypted keys created: ${encryptedKeys.length} out of ${usernames.length} users`)
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

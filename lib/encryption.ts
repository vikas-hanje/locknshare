import { RSAKeyPair, EncryptionResult, DecryptionResult } from '@/types'

/**
 * RSA Encryption utilities for in-browser file encryption
 * Uses Web Crypto API for secure cryptographic operations
 */

const ALGORITHM = {
  name: 'RSA-OAEP',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256',
}

const AES_ALGORITHM = {
  name: 'AES-GCM',
  length: 256,
}

/**
 * Generate RSA key pair for encryption/decryption
 */
export async function generateRSAKeyPair(): Promise<RSAKeyPair> {
  try {
    const keyPair = await window.crypto.subtle.generateKey(
      ALGORITHM,
      true,
      ['encrypt', 'decrypt']
    )

    const publicKey = await window.crypto.subtle.exportKey('spki', keyPair.publicKey)
    const privateKey = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey)

    return {
      publicKey: arrayBufferToBase64(publicKey),
      privateKey: arrayBufferToBase64(privateKey),
    }
  } catch (error) {
    console.error('Error generating RSA key pair:', error)
    throw new Error('Failed to generate RSA key pair')
  }
}

/**
 * Encrypt file data using hybrid encryption (AES + RSA)
 * Files are encrypted with AES, and the AES key is encrypted with RSA
 */
export async function encryptFile(
  fileData: ArrayBuffer,
  publicKeyBase64: string
): Promise<EncryptionResult> {
  try {
    // Generate random AES key for file encryption
    const aesKey = await window.crypto.subtle.generateKey(
      AES_ALGORITHM,
      true,
      ['encrypt', 'decrypt']
    )

    // Generate random IV
    const iv = window.crypto.getRandomValues(new Uint8Array(12))

    // Encrypt file data with AES
    const encryptedData = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      fileData
    )

    // Export AES key
    const exportedAesKey = await window.crypto.subtle.exportKey('raw', aesKey)

    // Import RSA public key
    const publicKeyBuffer = base64ToArrayBuffer(publicKeyBase64)
    const publicKey = await window.crypto.subtle.importKey(
      'spki',
      publicKeyBuffer,
      ALGORITHM,
      true,
      ['encrypt']
    )

    // Encrypt AES key with RSA
    const encryptedKey = await window.crypto.subtle.encrypt(
      ALGORITHM,
      publicKey,
      exportedAesKey
    )

    return {
      encryptedData: arrayBufferToBase64(encryptedData),
      encryptedKey: arrayBufferToBase64(encryptedKey),
      iv: arrayBufferToBase64(iv),
    }
  } catch (error) {
    console.error('Error encrypting file:', error)
    throw new Error('Failed to encrypt file')
  }
}

/**
 * Decrypt file data using RSA private key
 */
export async function decryptFile(
  encryptedResult: EncryptionResult,
  privateKeyBase64: string
): Promise<ArrayBuffer> {
  try {
    // Import RSA private key
    const privateKeyBuffer = base64ToArrayBuffer(privateKeyBase64)
    const privateKey = await window.crypto.subtle.importKey(
      'pkcs8',
      privateKeyBuffer,
      ALGORITHM,
      true,
      ['decrypt']
    )

    // Decrypt AES key with RSA
    const encryptedKeyBuffer = base64ToArrayBuffer(encryptedResult.encryptedKey)
    const aesKeyBuffer = await window.crypto.subtle.decrypt(
      ALGORITHM,
      privateKey,
      encryptedKeyBuffer
    )

    // Import AES key
    const aesKey = await window.crypto.subtle.importKey(
      'raw',
      aesKeyBuffer,
      AES_ALGORITHM,
      true,
      ['decrypt']
    )

    // Decrypt file data with AES
    const iv = base64ToArrayBuffer(encryptedResult.iv)
    const encryptedDataBuffer = base64ToArrayBuffer(encryptedResult.encryptedData)
    const decryptedData = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      encryptedDataBuffer
    )

    return decryptedData
  } catch (error) {
    console.error('Error decrypting file:', error)
    throw new Error('Failed to decrypt file')
  }
}

/**
 * Encrypt private key with password for secure storage
 */
export async function encryptPrivateKey(
  privateKeyBase64: string,
  password: string
): Promise<string> {
  try {
    const encoder = new TextEncoder()
    const passwordBuffer = encoder.encode(password)
    
    // Derive key from password
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    )

    const salt = window.crypto.getRandomValues(new Uint8Array(16))
    const key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt']
    )

    const iv = window.crypto.getRandomValues(new Uint8Array(12))
    const encoder2 = new TextEncoder()
    const privateKeyBuffer = encoder2.encode(privateKeyBase64)
    
    const encryptedKey = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      privateKeyBuffer
    )

    // Combine salt, iv, and encrypted key
    const combined = new Uint8Array(salt.length + iv.length + encryptedKey.byteLength)
    combined.set(salt, 0)
    combined.set(iv, salt.length)
    combined.set(new Uint8Array(encryptedKey), salt.length + iv.length)

    return arrayBufferToBase64(combined.buffer)
  } catch (error) {
    console.error('Error encrypting private key:', error)
    throw new Error('Failed to encrypt private key')
  }
}

/**
 * Decrypt private key with password
 */
export async function decryptPrivateKey(
  encryptedPrivateKey: string,
  password: string
): Promise<string> {
  try {
    const combined = base64ToArrayBuffer(encryptedPrivateKey)
    const combinedArray = new Uint8Array(combined)
    
    const salt = combinedArray.slice(0, 16)
    const iv = combinedArray.slice(16, 28)
    const encryptedKey = combinedArray.slice(28)

    const encoder = new TextEncoder()
    const passwordBuffer = encoder.encode(password)
    
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    )

    const key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['decrypt']
    )

    const decryptedKey = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedKey
    )

    const decoder = new TextDecoder()
    return decoder.decode(decryptedKey)
  } catch (error) {
    console.error('Error decrypting private key:', error)
    throw new Error('Failed to decrypt private key')
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

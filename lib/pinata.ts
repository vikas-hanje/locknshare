import axios from 'axios'
import { PinataUploadResponse } from '@/types'

const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY || ''
const PINATA_SECRET_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY || ''
const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || ''

const PINATA_BASE_URL = 'https://api.pinata.cloud'
const GATEWAY_URL = 'https://gateway.pinata.cloud/ipfs'

// For profile images, use your dedicated gateway with better CORS support
export const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY 
  || 'https://copper-impressed-booby-853.mypinata.cloud/ipfs'  // Default Pinata dedicated gateway

/**
 * Upload file to IPFS via Pinata
 */
export async function uploadToPinata(
  file: Blob,
  fileName: string,
  metadata?: Record<string, any>
): Promise<PinataUploadResponse> {
  try {
    const formData = new FormData()
    formData.append('file', file, fileName)

    if (metadata) {
      const pinataMetadata = JSON.stringify({
        name: fileName,
        keyvalues: metadata,
      })
      formData.append('pinataMetadata', pinataMetadata)
    }

    const pinataOptions = JSON.stringify({
      cidVersion: 1,
    })
    formData.append('pinataOptions', pinataOptions)

    const response = await axios.post(
      `${PINATA_BASE_URL}/pinning/pinFileToIPFS`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET_KEY,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    )

    return response.data
  } catch (error) {
    console.error('Error uploading to Pinata:', error)
    throw new Error('Failed to upload file to IPFS')
  }
}

/**
 * Upload JSON data to IPFS via Pinata
 */
export async function uploadJSONToPinata(
  jsonData: any,
  name: string
): Promise<PinataUploadResponse> {
  try {
    const response = await axios.post(
      `${PINATA_BASE_URL}/pinning/pinJSONToIPFS`,
      {
        pinataContent: jsonData,
        pinataMetadata: {
          name: name,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET_KEY,
        },
      }
    )

    return response.data
  } catch (error) {
    console.error('Error uploading JSON to Pinata:', error)
    throw new Error('Failed to upload JSON to IPFS')
  }
}

/**
 * Get file from IPFS via Pinata gateway
 */
export async function getFromIPFS(ipfsHash: string): Promise<Blob> {
  try {
    console.log('Fetching from IPFS:', ipfsHash)
    
    // Try multiple gateways for reliability with priority order
    const gateways = [
      { url: `${GATEWAY_URL}/${ipfsHash}`, name: 'Pinata Gateway', timeout: 15000 },
      { url: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`, name: 'Pinata Public', timeout: 15000 },
      { url: `https://ipfs.io/ipfs/${ipfsHash}`, name: 'IPFS.io', timeout: 20000 },
      { url: `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`, name: 'Cloudflare', timeout: 15000 },
    ]

    let lastError: any = null
    
    for (let i = 0; i < gateways.length; i++) {
      const { url, name, timeout } = gateways[i]
      try {
        console.log(`[${i + 1}/${gateways.length}] Trying ${name}...`)
        const response = await axios.get(url, {
          responseType: 'blob',
          timeout,
          headers: {
            'Accept': '*/*'
          }
        })

        console.log(`✅ Successfully fetched from ${name}`)
        return response.data
      } catch (err: any) {
        const errorMsg = err.code === 'ECONNABORTED' ? 'timeout' : err.message
        console.warn(`❌ ${name} failed (${errorMsg})`)
        lastError = err
        // Don't wait between retries, move to next gateway immediately
        continue
      }
    }

    throw lastError || new Error('All IPFS gateways failed')
  } catch (error: any) {
    console.error('Error fetching from IPFS:', error)
    throw new Error(`Failed to fetch file from IPFS: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Get JSON data from IPFS via Pinata gateway
 */
export async function getJSONFromIPFS(ipfsHash: string): Promise<any> {
  try {
    const response = await axios.get(`${GATEWAY_URL}/${ipfsHash}`)
    return response.data
  } catch (error) {
    console.error('Error fetching JSON from IPFS:', error)
    throw new Error('Failed to fetch JSON from IPFS')
  }
}

/**
 * Unpin file from IPFS
 */
export async function unpinFromIPFS(ipfsHash: string): Promise<boolean> {
  try {
    await axios.delete(`${PINATA_BASE_URL}/pinning/unpin/${ipfsHash}`, {
      headers: {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_KEY,
      },
    })
    return true
  } catch (error) {
    console.error('Error unpinning from IPFS:', error)
    return false
  }
}

/**
 * Get IPFS gateway URL for a hash
 */
export function getIPFSUrl(ipfsHash: string): string {
  return `${GATEWAY_URL}/${ipfsHash}`
}

/**
 * Test Pinata connection
 */
export async function testPinataConnection(): Promise<boolean> {
  try {
    const response = await axios.get(`${PINATA_BASE_URL}/data/testAuthentication`, {
      headers: {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_KEY,
      },
    })
    return response.data.message === 'Congratulations! You are communicating with the Pinata API!'
  } catch (error) {
    console.error('Error testing Pinata connection:', error)
    return false
  }
}

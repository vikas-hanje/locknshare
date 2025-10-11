import axios from 'axios'
import { PinataUploadResponse } from '@/types'

const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY || ''
const PINATA_SECRET_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY || ''
const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || ''

const PINATA_BASE_URL = 'https://api.pinata.cloud'
const GATEWAY_URL = 'https://gateway.pinata.cloud/ipfs'

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
    
    // Try multiple gateways for reliability
    const gateways = [
      `${GATEWAY_URL}/${ipfsHash}`,
      `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
      `https://ipfs.io/ipfs/${ipfsHash}`,
    ]

    let lastError: any = null
    
    for (const gateway of gateways) {
      try {
        console.log('Trying gateway:', gateway)
        const response = await axios.get(gateway, {
          responseType: 'blob',
          timeout: 30000, // 30 second timeout
        })

        console.log('Successfully fetched from IPFS')
        return response.data
      } catch (err) {
        console.warn('Gateway failed:', gateway, err)
        lastError = err
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

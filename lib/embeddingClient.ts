/**
 * Client-side wrapper for embedding generation
 * Calls the server-side API endpoint to generate embeddings
 */

/**
 * Generate embeddings by calling our API endpoint
 * This keeps the HuggingFace API key secure on the server
 */
export async function generateEmbeddings(text: string): Promise<number[]> {
  try {
    console.log('Calling embeddings API endpoint...')
    
    const response = await fetch('/api/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('Embeddings API response:', data.dimensions, 'dimensions')
    
    return data.embedding || []
  } catch (error: any) {
    console.error('Error generating embeddings:', error)
    return []
  }
}

/**
 * Generate embeddings for multiple text chunks
 * Useful for long documents
 */
export async function generateEmbeddingsForChunks(texts: string[]): Promise<number[]> {
  try {
    console.log(`Calling embeddings API for ${texts.length} chunks...`)
    
    const response = await fetch('/api/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ texts }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('Averaged embeddings generated:', data.dimensions, 'dimensions')
    
    return data.embedding || []
  } catch (error: any) {
    console.error('Error generating embeddings for chunks:', error)
    return []
  }
}

/**
 * Calculate cosine similarity between two embedding vectors
 * Re-exported from huggingface lib for convenience
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have same length')
  }
  
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  return denominator === 0 ? 0 : dotProduct / denominator
}

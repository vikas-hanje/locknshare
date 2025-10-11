/**
 * Hugging Face API Integration
 * Using all-MiniLM-L6-v2 model for sentence embeddings
 */

const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2'

interface EmbeddingResponse {
  embeddings: number[][]
  error?: string
}

/**
 * Generate embeddings using Hugging Face Inference API
 */
export async function generateEmbeddings(
  texts: string | string[]
): Promise<number[][] | null> {
  const apiKey = process.env.HUGGINGFACE_API_KEY

  if (!apiKey) {
    console.error('HUGGINGFACE_API_KEY not found in environment variables')
    return null
  }

  try {
    console.log('Generating embeddings for text(s):', Array.isArray(texts) ? texts.length : 1)

    const response = await fetch(HUGGINGFACE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: Array.isArray(texts) ? texts : texts,
        options: {
          wait_for_model: true,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('HuggingFace API error:', response.status, errorText)
      
      // Handle rate limiting
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.')
      }
      
      throw new Error(`HuggingFace API error: ${response.status}`)
    }

    const data = await response.json()
    
    // HuggingFace returns embeddings directly as array
    console.log('Embeddings generated successfully')
    return Array.isArray(data[0]) ? data : [data]
  } catch (error: any) {
    console.error('Error generating embeddings:', error)
    return null
  }
}

/**
 * Generate a single embedding vector
 * Averages multiple text chunks if needed
 */
export async function generateSingleEmbedding(
  text: string
): Promise<number[] | null> {
  const embeddings = await generateEmbeddings(text)
  
  if (!embeddings || embeddings.length === 0) {
    return null
  }
  
  // Return the first (and usually only) embedding
  return embeddings[0]
}

/**
 * Generate embeddings for multiple text chunks and average them
 * Useful for long documents split into chunks
 */
export async function generateAveragedEmbedding(
  textChunks: string[]
): Promise<number[] | null> {
  if (textChunks.length === 0) return null
  
  // For single chunk, just return its embedding
  if (textChunks.length === 1) {
    return generateSingleEmbedding(textChunks[0])
  }
  
  try {
    // Generate embeddings for all chunks
    const embeddings = await generateEmbeddings(textChunks)
    
    if (!embeddings || embeddings.length === 0) {
      return null
    }
    
    // Average all embeddings
    const embeddingSize = embeddings[0].length
    const averaged = new Array(embeddingSize).fill(0)
    
    for (const embedding of embeddings) {
      for (let i = 0; i < embeddingSize; i++) {
        averaged[i] += embedding[i]
      }
    }
    
    // Divide by number of embeddings to get average
    for (let i = 0; i < embeddingSize; i++) {
      averaged[i] /= embeddings.length
    }
    
    return averaged
  } catch (error) {
    console.error('Error generating averaged embedding:', error)
    return null
  }
}

/**
 * Calculate cosine similarity between two embedding vectors
 * Used for semantic search
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

/**
 * Test HuggingFace API connection
 */
export async function testHuggingFaceAPI(): Promise<boolean> {
  try {
    const result = await generateSingleEmbedding('test')
    return result !== null && Array.isArray(result) && result.length > 0
  } catch (error) {
    console.error('HuggingFace API test failed:', error)
    return false
  }
}

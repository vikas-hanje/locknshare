/**
 * Hugging Face API Integration
 * Using all-MiniLM-L6-v2 model for sentence embeddings
 * Now using the official @huggingface/inference library for better compatibility
 */

import { HfInference } from '@huggingface/inference'

const MODEL_NAME = 'sentence-transformers/all-MiniLM-L6-v2'

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
    const errorMsg = 'HUGGINGFACE_API_KEY not found in environment variables'
    console.error(errorMsg)
    throw new Error(errorMsg)
  }

  // Validate API key format
  if (!apiKey.startsWith('hf_')) {
    const errorMsg = 'Invalid HuggingFace API key format (should start with hf_)'
    console.error(errorMsg)
    throw new Error(errorMsg)
  }

  try {
    // Initialize HuggingFace Inference client
    const hf = new HfInference(apiKey)
    
    const isSingleInput = typeof texts === 'string'
    console.log('🔄 Generating embeddings for text(s):', isSingleInput ? 1 : (texts as string[]).length)
    console.log('📝 Text lengths:', isSingleInput ? [(texts as string).length] : (texts as string[]).map(t => t.length))
    
    // Use the official featureExtraction method
    if (isSingleInput) {
      console.log('Using featureExtraction for single text')
      const embedding = await hf.featureExtraction({
        model: MODEL_NAME,
        inputs: texts as string,
      })
      
      console.log('✅ Single embedding generated')
      console.log('✅ Embedding dimensions:', Array.isArray(embedding) ? embedding.length : 'unknown')
      
      // Return as 2D array for consistency
      return [embedding as number[]]
    } else {
      // For multiple texts, process each one
      console.log('Processing multiple texts...')
      const textsArray = texts as string[]
      const embeddings: number[][] = []
      
      for (let i = 0; i < textsArray.length; i++) {
        console.log(`Processing text ${i + 1}/${textsArray.length}...`)
        const embedding = await hf.featureExtraction({
          model: MODEL_NAME,
          inputs: textsArray[i],
        })
        embeddings.push(embedding as number[])
      }
      
      console.log('✅ All embeddings generated successfully')
      console.log('✅ Generated', embeddings.length, 'vectors')
      console.log('✅ Embedding dimensions:', embeddings[0]?.length || 0)
      return embeddings
    }
  } catch (error: any) {
    console.error('❌ Error generating embeddings:', error.message || error)
    
    // Provide more helpful error messages
    if (error.message && error.message.includes('401')) {
      throw new Error('Invalid or expired HuggingFace API key. Please check your credentials.')
    } else if (error.message && error.message.includes('429')) {
      throw new Error('Rate limit exceeded. Please try again in a moment.')
    } else if (error.message && error.message.includes('503')) {
      throw new Error('Model is loading. Please try again in a few seconds.')
    }
    
    // Re-throw to propagate the error with details
    throw error
  }
}

/**
 * Generate a single embedding vector
 * Averages multiple text chunks if needed
 */
export async function generateSingleEmbedding(
  text: string
): Promise<number[] | null> {
  try {
    const embeddings = await generateEmbeddings(text)
    
    if (!embeddings || embeddings.length === 0) {
      throw new Error('No embeddings generated')
    }
    
    // Return the first (and usually only) embedding
    return embeddings[0]
  } catch (error: any) {
    console.error('Error in generateSingleEmbedding:', error.message || error)
    throw error
  }
}

/**
 * Generate embeddings for multiple text chunks and average them
 * Useful for long documents split into chunks
 */
export async function generateAveragedEmbedding(
  textChunks: string[]
): Promise<number[] | null> {
  if (textChunks.length === 0) {
    throw new Error('No text chunks provided')
  }
  
  // For single chunk, just return its embedding
  if (textChunks.length === 1) {
    return generateSingleEmbedding(textChunks[0])
  }
  
  try {
    // Generate embeddings for all chunks
    const embeddings = await generateEmbeddings(textChunks)
    
    if (!embeddings || embeddings.length === 0) {
      throw new Error('No embeddings generated for chunks')
    }
    
    console.log(`Averaging ${embeddings.length} embeddings`)
    
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
    
    console.log(`Averaged embedding dimension: ${averaged.length}`)
    return averaged
  } catch (error: any) {
    console.error('Error generating averaged embedding:', error.message || error)
    throw error
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

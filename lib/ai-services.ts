import axios from 'axios'
import { EmbeddingResult, AnomalyRecord, SearchQuery } from '@/types'

const EMBEDDINGS_ENDPOINT = process.env.NEXT_PUBLIC_AI_EMBEDDINGS_ENDPOINT || '/api/embeddings'
const ANOMALY_ENDPOINT = process.env.NEXT_PUBLIC_AI_ANOMALY_ENDPOINT || '/api/anomaly'

/**
 * Generate embeddings for text content
 */
export async function generateEmbeddings(text: string): Promise<number[]> {
  try {
    const response = await axios.post(EMBEDDINGS_ENDPOINT, {
      text: text,
      model: 'text-embedding-ada-002', // or your preferred model
    })

    return response.data.embedding || []
  } catch (error) {
    console.error('Error generating embeddings:', error)
    // Return empty array as fallback
    return []
  }
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const response = await axios.post(EMBEDDINGS_ENDPOINT, {
      texts: texts,
      model: 'text-embedding-ada-002',
    })

    return response.data.embeddings || []
  } catch (error) {
    console.error('Error generating batch embeddings:', error)
    return []
  }
}

/**
 * Compute cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Semantic search using embeddings
 */
export async function semanticSearch(
  query: SearchQuery,
  fileEmbeddings: Array<{ id: string; embedding: number[]; metadata: any }>
): Promise<EmbeddingResult[]> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbeddings(query.query)

    if (!queryEmbedding.length) {
      return []
    }

    // Compute similarities and sort
    const results = fileEmbeddings
      .map(file => ({
        file_id: file.id,
        file_metadata: file.metadata,
        similarity_score: cosineSimilarity(queryEmbedding, file.embedding),
      }))
      .filter(result => result.similarity_score > 0.5) // Threshold
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, query.limit || 10)

    return results
  } catch (error) {
    console.error('Error performing semantic search:', error)
    return []
  }
}

/**
 * Check for anomalous activity
 */
export async function detectAnomalies(activityData: {
  user_id: string
  recent_ips: string[]
  login_times: string[]
  access_patterns: any[]
}): Promise<AnomalyRecord[]> {
  try {
    const response = await axios.post(ANOMALY_ENDPOINT, activityData)

    return response.data.anomalies || []
  } catch (error) {
    console.error('Error detecting anomalies:', error)
    return []
  }
}

/**
 * Calculate trust score based on user activity
 */
export async function calculateTrustScore(userId: string, activityData: any): Promise<number> {
  try {
    const response = await axios.post(`${ANOMALY_ENDPOINT}/trust-score`, {
      user_id: userId,
      activity: activityData,
    })

    return response.data.trust_score || 0
  } catch (error) {
    console.error('Error calculating trust score:', error)
    return 0
  }
}

/**
 * Analyze file content for sensitive data (optional)
 */
export async function analyzeSensitiveContent(fileContent: string): Promise<{
  is_sensitive: boolean
  detected_patterns: string[]
  confidence: number
}> {
  try {
    const response = await axios.post(`${ANOMALY_ENDPOINT}/analyze-content`, {
      content: fileContent,
    })

    return response.data
  } catch (error) {
    console.error('Error analyzing content:', error)
    return {
      is_sensitive: false,
      detected_patterns: [],
      confidence: 0,
    }
  }
}

/**
 * Get anomaly insights for dashboard
 */
export async function getAnomalyInsights(userId: string): Promise<{
  status: 'safe' | 'warning' | 'alert'
  message: string
  recent_anomalies: number
  trust_score: number
}> {
  try {
    const response = await axios.get(`${ANOMALY_ENDPOINT}/${userId}`)

    return response.data
  } catch (error) {
    console.error('Error fetching anomaly insights:', error)
    return {
      status: 'safe',
      message: 'Unable to fetch security status',
      recent_anomalies: 0,
      trust_score: 0,
    }
  }
}

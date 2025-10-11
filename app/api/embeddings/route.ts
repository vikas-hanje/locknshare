import { NextRequest, NextResponse } from 'next/server'

/**
 * Mock Embeddings API
 * Replace this with actual OpenAI or custom model later
 */
export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    // Generate mock embedding (1536 dimensions like OpenAI)
    const mockEmbedding = Array.from({ length: 1536 }, () => Math.random())

    return NextResponse.json({
      embedding: mockEmbedding,
      model: 'mock-embedding-model',
      text: text.substring(0, 50),
    })
  } catch (error) {
    console.error('Embeddings API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate embeddings' },
      { status: 500 }
    )
  }
}

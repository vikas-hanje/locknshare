import { NextRequest, NextResponse } from 'next/server'
import { generateSingleEmbedding, generateAveragedEmbedding } from '@/lib/huggingface'

/**
 * Embeddings API using HuggingFace all-MiniLM-L6-v2
 * Generates 384-dimensional embeddings for semantic search
 */
export async function POST(request: NextRequest) {
  try {
    const { text, texts } = await request.json()

    if (!text && !texts) {
      return NextResponse.json(
        { error: 'Text or texts array is required' },
        { status: 400 }
      )
    }

    let embedding: number[] | null = null

    // Handle multiple texts (average them)
    if (texts && Array.isArray(texts)) {
      console.log(`Generating averaged embedding for ${texts.length} text chunks`)
      embedding = await generateAveragedEmbedding(texts)
    } 
    // Handle single text
    else if (text) {
      console.log('Generating embedding for single text')
      embedding = await generateSingleEmbedding(text)
    }

    if (!embedding) {
      return NextResponse.json(
        { error: 'Failed to generate embeddings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      embedding: embedding,
      model: 'sentence-transformers/all-MiniLM-L6-v2',
      dimensions: embedding.length,
      text: text ? text.substring(0, 50) + '...' : `${texts.length} chunks`,
    })
  } catch (error: any) {
    console.error('Embeddings API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate embeddings' },
      { status: 500 }
    )
  }
}

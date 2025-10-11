/**
 * Document Processing and Tokenization
 * Extracts text from various file types and prepares for embedding
 */

/**
 * Extract text content from different file types
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type.toLowerCase()
  
  try {
    // Handle text files
    if (fileType.includes('text/') || fileType.includes('json')) {
      return await file.text()
    }
    
    // Handle PDF files
    if (fileType.includes('pdf')) {
      return await extractTextFromPDF(file)
    }
    
    // Handle document files (Word, etc.)
    if (fileType.includes('document') || fileType.includes('word')) {
      // For now, return filename and basic metadata
      // Full document parsing would require additional libraries
      return `Document: ${file.name}\nType: ${file.type}\nSize: ${file.size} bytes`
    }
    
    // For other file types, use filename and metadata
    return `File: ${file.name}\nType: ${file.type}\nSize: ${file.size} bytes`
  } catch (error) {
    console.error('Error extracting text from file:', error)
    // Fallback to basic metadata
    return `File: ${file.name}\nType: ${file.type}`
  }
}

/**
 * Extract text from PDF using browser's built-in capabilities
 * For production, consider using pdf-parse or pdfjs-dist
 */
async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Read PDF as text (basic extraction)
    const arrayBuffer = await file.arrayBuffer()
    const text = new TextDecoder().decode(arrayBuffer)
    
    // Extract readable text (basic regex-based extraction)
    // This is a simplified approach - for production use pdf.js
    const textMatch = text.match(/\/Contents\s*\((.*?)\)/gs)
    if (textMatch) {
      return textMatch
        .map(match => match.replace(/\/Contents\s*\(|\)/g, ''))
        .join(' ')
        .replace(/\\n/g, '\n')
        .trim()
    }
    
    // Fallback to filename
    return `PDF Document: ${file.name}`
  } catch (error) {
    console.error('Error parsing PDF:', error)
    return `PDF Document: ${file.name}`
  }
}

/**
 * Tokenize text into manageable chunks
 * Simple word-based tokenization for sending to HuggingFace
 */
export function tokenizeText(text: string, maxTokens: number = 512): string[] {
  // Clean the text
  const cleaned = text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s.,!?-]/g, '') // Remove special characters
    .trim()
  
  // Split into words
  const words = cleaned.split(/\s+/)
  
  // Create chunks of approximately maxTokens words
  const chunks: string[] = []
  const chunkSize = Math.floor(maxTokens * 0.75) // Account for special tokens
  
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ')
    if (chunk.trim()) {
      chunks.push(chunk)
    }
  }
  
  // If no chunks or text too short, return as single chunk
  if (chunks.length === 0) {
    return [cleaned.substring(0, maxTokens * 4)] // Approximate char limit
  }
  
  return chunks
}

/**
 * Combine text chunks with metadata for better embeddings
 */
export function prepareTextForEmbedding(
  fileName: string,
  description: string,
  tags: string[],
  extractedText: string
): string {
  const metadata = [
    `Filename: ${fileName}`,
    description ? `Description: ${description}` : '',
    tags.length > 0 ? `Tags: ${tags.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')
  
  // Combine metadata with extracted text
  const combined = `${metadata}\n\n${extractedText}`
  
  // Limit to reasonable length (HuggingFace models have token limits)
  const maxLength = 2000 // Characters
  return combined.length > maxLength 
    ? combined.substring(0, maxLength) + '...'
    : combined
}

/**
 * Calculate a simple hash for text (for caching/deduplication)
 */
export function hashText(text: string): string {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}

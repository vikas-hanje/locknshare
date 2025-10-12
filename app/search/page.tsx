'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { Sidebar } from '@/components/Sidebar'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ConnectWallet } from '@/components/ConnectWallet'
import { SearchBar } from '@/components/SearchBar'
import { FileCard } from '@/components/FileCard'
import { useStore } from '@/store/useStore'
import { FileMetadata } from '@/types'
import { generateEmbeddings, cosineSimilarity } from '@/lib/embeddingClient'

export default function SearchPage() {
  const router = useRouter()
  const { isConnected, files } = useStore()
  const [results, setResults] = useState<FileMetadata[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    if (!isConnected) {
      router.push('/')
    }
  }, [isConnected, router])

  const handleSearch = async (query: string) => {
    setIsSearching(true)
    setHasSearched(true)
    try {
      const queryLower = query.toLowerCase()
      
      // First try AI semantic search if embeddings exist
      const filesWithEmbeddings = files.filter(
        f => f.embedding_vector && f.embedding_vector.length > 0
      )
      
      let searchResults: FileMetadata[] = []
      
      if (filesWithEmbeddings.length > 0) {
        const queryEmbedding = await generateEmbeddings(query)
        
        const scored = filesWithEmbeddings
          .map(file => ({
            ...file,
            score: cosineSimilarity(queryEmbedding, file.embedding_vector!),
          }))
          .filter(f => f.score > 0.3)
          .sort((a, b) => b.score - a.score)
        
        searchResults = scored
      }
      
      // Fallback to basic text search
      if (searchResults.length === 0) {
        searchResults = files.filter(file => {
          const nameMatch = file.file_name.toLowerCase().includes(queryLower)
          const descMatch = file.description?.toLowerCase().includes(queryLower)
          const tagMatch = file.tags?.some(tag => tag.toLowerCase().includes(queryLower))
          return nameMatch || descMatch || tagMatch
        })
      }

      setResults(searchResults)
    } catch (error) {
      console.error('Search error:', error)
      // Fallback to basic search on error
      const queryLower = query.toLowerCase()
      const basicResults = files.filter(file => 
        file.file_name.toLowerCase().includes(queryLower) ||
        file.description?.toLowerCase().includes(queryLower) ||
        file.tags?.some(tag => tag.toLowerCase().includes(queryLower))
      )
      setResults(basicResults)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className="lg:pl-64">
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                AI Search
              </h1>
              <p className="text-sm text-muted-foreground">
                Semantic search powered by AI
              </p>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <ConnectWallet />
            </div>
          </div>
        </header>

        <main className="p-6 max-w-5xl mx-auto">
          <SearchBar onSearch={handleSearch} isAISearch />

          <div className="mt-8">
            {isSearching ? (
              <div className="text-center py-12">Searching...</div>
            ) : results.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {results.map(file => (
                  <FileCard key={file.id} file={file} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {hasSearched 
                  ? "No files found matching your query. Try different keywords or tags."
                  : "Enter a search query to find files"
                }
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

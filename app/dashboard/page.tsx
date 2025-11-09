'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Upload, FileText, TrendingUp, Shield, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sidebar } from '@/components/Sidebar'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ConnectWallet } from '@/components/ConnectWallet'
import { FileCard } from '@/components/FileCard'
import { AnomalyWidget } from '@/components/AnomalyWidget'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { useStore } from '@/store/useStore'
import { getUserFiles, getUserStats } from '@/lib/supabase'
import { formatBytes } from '@/lib/utils'
import Link from 'next/link'
import { useAnomalyMonitor } from '@/hooks/useAnomalyMonitor'

export default function DashboardPage() {
  const router = useRouter()
  const { isConnected, user, files, setFiles, setUserStats, userStats } = useStore()
  const [isLoading, setIsLoading] = useState(true)
  const { trustScore } = useAnomalyMonitor()

  useEffect(() => {
    if (!isConnected) {
      router.push('/')
      return
    }

    // Only fetch if we don't have data or user just logged in
    const fetchData = async () => {
      if (!user) return
      
      // Skip if we already have files and stats
      if (files.length > 0 && userStats) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const [userFiles, stats] = await Promise.all([
          getUserFiles(user.id),
          getUserStats(user.id),
        ])

        setFiles(userFiles)
        setUserStats(stats as any)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, user?.id]) // Only re-run if connection or user changes

  useEffect(() => {
    if (!files || files.length === 0) return
    
    // Calculate total storage from files
    if (files.length > 0) {
      const totalStorage = files.reduce((sum, file) => sum + file.file_size, 0)
      const updatedStats = {
        ...(userStats || {}),
        total_uploads: files.length,
        total_storage_used: totalStorage,
        total_files: files.length,
        total_storage: totalStorage,
      }
      setUserStats(updatedStats as any)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]) // setUserStats is stable, userStats is only read for initial values

  // Memoize recent files to prevent recalculation
  const recentFiles = useMemo(() => files.slice(0, 3), [files])

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className="lg:pl-64">
        {/* Header */}
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="pl-16 pr-6 py-4 lg:px-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Welcome back, {user?.username || 'User'}!
              </p>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <ConnectWallet />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Files</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {userStats?.total_uploads || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Encrypted & stored on IPFS
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatBytes(userStats?.total_storage_used || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Across all your files
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Trust Score</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${
                    trustScore >= 80 ? 'text-green-500' :
                    trustScore >= 60 ? 'text-yellow-500' :
                    trustScore >= 40 ? 'text-orange-500' :
                    'text-red-500'
                  }`}>
                    {trustScore}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {trustScore >= 80 ? 'All systems normal' :
                     trustScore >= 60 ? 'Minor security issues' :
                     trustScore >= 40 ? 'Security attention needed' :
                     'Critical security alert'}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-primary text-primary-foreground">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Quick Upload</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="secondary"
                    className="w-full"
                    asChild
                  >
                    <Link href="/upload">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload File
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Files */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Recent Files</CardTitle>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/files">
                        View All
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoading ? (
                    <LoadingSpinner message="Loading files..." />
                  ) : recentFiles.length > 0 ? (
                    recentFiles.map((file) => (
                      <FileCard
                        key={file.id}
                        file={file}
                        onView={() => router.push('/files')}
                      />
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">No files yet</p>
                      <Button asChild>
                        <Link href="/upload">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Your First File
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Security Widget */}
            <div className="space-y-6">
              <AnomalyWidget />

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/search">
                      <FileText className="h-4 w-4 mr-2" />
                      Search Files
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/security">
                      <Shield className="h-4 w-4 mr-2" />
                      View Security Log
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

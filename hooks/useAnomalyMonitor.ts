import { useState, useEffect, useCallback } from 'react'
import { AnomalyRecord } from '@/types'
import { getUserAnomalies, logActivity as logActivityToDb, resolveAnomaly as resolveAnomalyDb } from '@/lib/anomalyDetection'
import { AnomalyDetector } from '@/lib/anomalyDetection'
import { useStore } from '@/store/useStore'

export function useAnomalyMonitor() {
  const [anomalies, setAnomalies] = useState<AnomalyRecord[]>([])
  const [trustScore, setTrustScore] = useState(100)
  const [securityStatus, setSecurityStatus] = useState<'safe' | 'warning' | 'alert'>('safe')
  const [isLoading, setIsLoading] = useState(false)
  
  const { user } = useStore()

  // Fetch anomalies
  const fetchAnomalies = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const data = await getUserAnomalies(user.id)
      setAnomalies(data)
      
      // Calculate security status based on anomalies
      updateSecurityStatus(data)
    } catch (error) {
      console.error('Error fetching anomalies:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Update security status based on anomalies
  const updateSecurityStatus = (anomalyList: AnomalyRecord[]) => {
    const unresolved = anomalyList.filter(a => !a.resolved)
    
    if (unresolved.length === 0) {
      setSecurityStatus('safe')
      setTrustScore(100)
      return
    }

    // Check severity
    const hasCritical = unresolved.some(a => a.severity === 'critical')
    const hasHigh = unresolved.some(a => a.severity === 'high')
    const hasMedium = unresolved.some(a => a.severity === 'medium')

    if (hasCritical || unresolved.length > 5) {
      setSecurityStatus('alert')
      setTrustScore(Math.max(0, 100 - unresolved.length * 20))
    } else if (hasHigh || unresolved.length > 2) {
      setSecurityStatus('warning')
      setTrustScore(Math.max(40, 100 - unresolved.length * 10))
    } else {
      setSecurityStatus('safe')
      setTrustScore(Math.max(70, 100 - unresolved.length * 5))
    }
  }

  // Log activity and check for anomalies
  const logActivity = useCallback(
    async (
      activityType: 'upload' | 'download' | 'view' | 'share' | 'delete',
      metadata?: {
        fileId?: string
        fileName?: string
        success?: boolean
      }
    ) => {
      if (!user) return

      try {
        // Log the activity
        await logActivityToDb(user.id, activityType, metadata)
        console.log(`✅ Logged ${activityType} activity`)

        // Run anomaly detection (in background)
        setTimeout(async () => {
          try {
            const apiKey = process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY || 'dummy-key'
            console.log('🔍 Starting anomaly detection...')
            
            const detector = new AnomalyDetector(apiKey)
            const detectedAnomalies = await detector.analyzeActivity(user.id)
            
            console.log(`🛡️ Anomaly detection complete: ${detectedAnomalies.length} anomalies found`)
            
            // Refresh anomalies after detection
            await fetchAnomalies()
          } catch (error) {
            console.error('❌ Error running anomaly detection:', error)
          }
        }, 2000) // Delay 2 seconds to ensure activity is saved
      } catch (error) {
        console.error('Error logging activity:', error)
      }
    },
    [user, fetchAnomalies]
  )

  // Run anomaly detection manually
  const runDetection = useCallback(async () => {
    if (!user) return

    try {
      const apiKey = process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY
      if (!apiKey) {
        console.error('HuggingFace API key not found')
        return
      }

      console.log('🔍 Running anomaly detection...')
      const detector = new AnomalyDetector(apiKey)
      await detector.analyzeActivity(user.id)
      
      // Refresh anomalies
      await fetchAnomalies()
    } catch (error) {
      console.error('Error running anomaly detection:', error)
    }
  }, [user, fetchAnomalies])

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchAnomalies()

      // Refresh every 5 minutes
      const interval = setInterval(() => {
        fetchAnomalies()
      }, 5 * 60 * 1000)

      return () => clearInterval(interval)
    }
  }, [user, fetchAnomalies])

  // Resolve an anomaly
  const resolveAnomaly = useCallback(async (anomalyId: string) => {
    console.log('🔄 Resolving anomaly:', anomalyId)
    const success = await resolveAnomalyDb(anomalyId)
    if (!success) {
      throw new Error('Failed to resolve anomaly in database')
    }
    console.log('✅ Anomaly resolved, refreshing list...')
    await fetchAnomalies()
  }, [fetchAnomalies])

  return {
    anomalies,
    trustScore,
    securityStatus,
    isLoading,
    fetchAnomalies,
    logActivity,
    runDetection,
    resolveAnomaly,
  }
}

import { useState, useEffect, useCallback } from 'react'
import { AnomalyRecord } from '@/types'
import { getUserAnomalies, createAccessLog } from '@/lib/supabase'
import { detectAnomalies, getAnomalyInsights } from '@/lib/ai-services'
import { useStore } from '@/store/useStore'

export function useAnomalyMonitor() {
  const [anomalies, setAnomalies] = useState<AnomalyRecord[]>([])
  const [trustScore, setTrustScore] = useState(0)
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
    } catch (error) {
      console.error('Error fetching anomalies:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Fetch anomaly insights
  const fetchInsights = useCallback(async () => {
    if (!user) return

    try {
      const insights = await getAnomalyInsights(user.id)
      setTrustScore(insights.trust_score)
      setSecurityStatus(insights.status)
    } catch (error) {
      console.error('Error fetching insights:', error)
    }
  }, [user])

  // Log activity and check for anomalies
  const logActivity = useCallback(
    async (activityType: 'upload' | 'download' | 'view' | 'share', fileId?: string) => {
      if (!user) return

      try {
        // Get user's IP (in production, do this server-side)
        let ipAddress = 'Unknown'
        try {
          const response = await fetch('https://api.ipify.org?format=json')
          const data = await response.json()
          ipAddress = data.ip
        } catch (error) {
          console.error('Error fetching IP:', error)
        }

        // Create access log
        await createAccessLog({
          user_id: user.id,
          file_id: fileId,
          access_type: activityType,
          ip_address: ipAddress,
          timestamp: new Date().toISOString(),
          success: true,
        })

        // Refresh anomalies
        await fetchAnomalies()
      } catch (error) {
        console.error('Error logging activity:', error)
      }
    },
    [user, fetchAnomalies]
  )

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchAnomalies()
      fetchInsights()

      // Refresh every 5 minutes
      const interval = setInterval(() => {
        fetchAnomalies()
        fetchInsights()
      }, 5 * 60 * 1000)

      return () => clearInterval(interval)
    }
  }, [user, fetchAnomalies, fetchInsights])

  return {
    anomalies,
    trustScore,
    securityStatus,
    isLoading,
    fetchAnomalies,
    logActivity,
  }
}

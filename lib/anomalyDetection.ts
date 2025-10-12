/**
 * Anomaly Detection System
 * Rule-Based + AI-Powered (HuggingFace)
 */

import { HfInference } from '@huggingface/inference'
import { supabase } from './supabase'
import { AnomalyRecord, AccessLog } from '@/types'

// Detection thresholds and rules
export const ANOMALY_RULES = {
  maxFailedLogins: 5,           // Alert after 5 failed attempts in 1 hour
  maxDownloadsPerHour: 20,      // Unusual if > 20 downloads/hour
  maxUploadsPerHour: 15,        // Unusual if > 15 uploads/hour
  maxDistanceKm: 500,           // Alert if login from >500km away
  unusualHoursStart: 23,        // After 11 PM
  unusualHoursEnd: 6,           // Before 6 AM
  maxConsecutiveDownloads: 10,  // Rapid downloads without delay
  minActivityGapMinutes: 1,     // Minimum time between activities
}

interface ActivitySummary {
  totalActivities: number
  loginCount: number
  uploadCount: number
  downloadCount: number
  deleteCount: number
  uniqueIpCount: number
  failedLoginCount: number
  timeRange: string
  locations: string[]
}

interface LocationData {
  ip: string
  country?: string
  city?: string
  lat?: number
  lng?: number
  timestamp: Date
}

/**
 * Main Anomaly Detector Class
 */
export class AnomalyDetector {
  private hf: HfInference
  
  constructor(apiKey: string) {
    this.hf = new HfInference(apiKey)
  }

  /**
   * Analyze user activity and detect anomalies
   */
  async analyzeActivity(userId: string): Promise<AnomalyRecord[]> {
    const anomalies: AnomalyRecord[] = []
    
    console.log(`🔍 Analyzing activity for user: ${userId}`)
    
    try {
      // Get recent activity (last 24 hours)
      const activities = await this.getRecentActivities(userId, 24)
      
      if (activities.length === 0) {
        console.log('No recent activities to analyze')
        return []
      }

      // Rule 1: Failed login attempts
      const failedLoginAnomaly = await this.checkFailedLogins(userId, activities)
      if (failedLoginAnomaly) anomalies.push(failedLoginAnomaly)

      // Rule 2: Download rate
      const downloadRateAnomaly = await this.checkDownloadRate(userId, activities)
      if (downloadRateAnomaly) anomalies.push(downloadRateAnomaly)

      // Rule 3: Upload rate
      const uploadRateAnomaly = await this.checkUploadRate(userId, activities)
      if (uploadRateAnomaly) anomalies.push(uploadRateAnomaly)

      // Rule 4: Unusual access times
      const unusualTimeAnomaly = await this.checkUnusualAccessTime(userId, activities)
      if (unusualTimeAnomaly) anomalies.push(unusualTimeAnomaly)

      // Rule 5: IP location changes
      const locationAnomaly = await this.checkLocationChanges(userId)
      if (locationAnomaly) anomalies.push(locationAnomaly)

      // Rule 6: Rapid consecutive activities
      const rapidActivityAnomaly = await this.checkRapidActivity(userId, activities)
      if (rapidActivityAnomaly) anomalies.push(rapidActivityAnomaly)

      // AI Analysis: Use HuggingFace to detect suspicious patterns
      if (activities.length >= 3) {
        const aiAnomaly = await this.analyzeWithAI(userId, activities)
        if (aiAnomaly) anomalies.push(aiAnomaly)
      }

      // Save anomalies to database
      if (anomalies.length > 0) {
        console.log(`⚠️ Detected ${anomalies.length} anomalies`)
        await this.saveAnomalies(anomalies)
      } else {
        console.log('✅ No anomalies detected')
      }

      return anomalies
    } catch (error) {
      console.error('Error analyzing activity:', error)
      return []
    }
  }

  /**
   * Rule 1: Check for multiple failed login attempts
   */
  private async checkFailedLogins(
    userId: string,
    activities: AccessLog[]
  ): Promise<AnomalyRecord | null> {
    const failedLogins = activities.filter(
      a => a.access_type === 'login' && !a.success
    )

    if (failedLogins.length >= ANOMALY_RULES.maxFailedLogins) {
      const severity = failedLogins.length > 10 ? 'critical' : 'high'
      
      return {
        id: crypto.randomUUID(),
        user_id: userId,
        anomaly_type: 'multiple_failed_attempts',
        severity,
        description: `${failedLogins.length} failed login attempts in the last hour`,
        detected_at: new Date().toISOString(),
        resolved: false,
        metadata: {
          count: failedLogins.length,
          ips: [...new Set(failedLogins.map(f => f.ip_address))],
        },
      }
    }

    return null
  }

  /**
   * Rule 2: Check for excessive download rate
   */
  private async checkDownloadRate(
    userId: string,
    activities: AccessLog[]
  ): Promise<AnomalyRecord | null> {
    const downloads = activities.filter(a => a.access_type === 'download')

    if (downloads.length > ANOMALY_RULES.maxDownloadsPerHour) {
      return {
        id: crypto.randomUUID(),
        user_id: userId,
        anomaly_type: 'unusual_activity',
        severity: 'medium',
        description: `Unusual download rate: ${downloads.length} files in the last hour`,
        detected_at: new Date().toISOString(),
        resolved: false,
        metadata: {
          downloadCount: downloads.length,
          threshold: ANOMALY_RULES.maxDownloadsPerHour,
        },
      }
    }

    return null
  }

  /**
   * Rule 3: Check for excessive upload rate
   */
  private async checkUploadRate(
    userId: string,
    activities: AccessLog[]
  ): Promise<AnomalyRecord | null> {
    const uploads = activities.filter(a => a.access_type === 'upload')

    if (uploads.length > ANOMALY_RULES.maxUploadsPerHour) {
      return {
        id: crypto.randomUUID(),
        user_id: userId,
        anomaly_type: 'unusual_activity',
        severity: 'medium',
        description: `Unusual upload rate: ${uploads.length} files in the last hour`,
        detected_at: new Date().toISOString(),
        resolved: false,
        metadata: {
          uploadCount: uploads.length,
          threshold: ANOMALY_RULES.maxUploadsPerHour,
        },
      }
    }

    return null
  }

  /**
   * Rule 4: Check for access during unusual hours
   */
  private async checkUnusualAccessTime(
    userId: string,
    activities: AccessLog[]
  ): Promise<AnomalyRecord | null> {
    const unusualHourActivities = activities.filter(a => {
      const hour = new Date(a.timestamp).getHours()
      return hour >= ANOMALY_RULES.unusualHoursStart || hour < ANOMALY_RULES.unusualHoursEnd
    })

    if (unusualHourActivities.length >= 5) {
      return {
        id: crypto.randomUUID(),
        user_id: userId,
        anomaly_type: 'unusual_activity',
        severity: 'low',
        description: `${unusualHourActivities.length} activities during unusual hours (11 PM - 6 AM)`,
        detected_at: new Date().toISOString(),
        resolved: false,
        metadata: {
          count: unusualHourActivities.length,
        },
      }
    }

    return null
  }

  /**
   * Rule 5: Check for IP location changes
   */
  private async checkLocationChanges(userId: string): Promise<AnomalyRecord | null> {
    const locations = await this.getRecentLocations(userId, 2)

    if (locations.length === 2 && locations[0].lat && locations[1].lat) {
      const distance = this.calculateDistance(
        { lat: locations[0].lat!, lng: locations[0].lng! },
        { lat: locations[1].lat!, lng: locations[1].lng! }
      )

      if (distance > ANOMALY_RULES.maxDistanceKm) {
        const severity = distance > 1000 ? 'critical' : 'high'
        
        return {
          id: crypto.randomUUID(),
          user_id: userId,
          anomaly_type: 'ip_mismatch',
          severity,
          description: `Login from ${Math.round(distance)}km away from previous location (${locations[0].city || 'Unknown'} → ${locations[1].city || 'Unknown'})`,
          detected_at: new Date().toISOString(),
          resolved: false,
          metadata: {
            distance: Math.round(distance),
            previousLocation: locations[0].city,
            currentLocation: locations[1].city,
          },
        }
      }
    }

    return null
  }

  /**
   * Rule 6: Check for rapid consecutive activities
   */
  private async checkRapidActivity(
    userId: string,
    activities: AccessLog[]
  ): Promise<AnomalyRecord | null> {
    // Sort by timestamp
    const sorted = [...activities].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    let rapidCount = 0
    for (let i = 1; i < sorted.length; i++) {
      const timeDiff =
        (new Date(sorted[i].timestamp).getTime() -
          new Date(sorted[i - 1].timestamp).getTime()) /
        1000 / 60 // minutes

      if (timeDiff < ANOMALY_RULES.minActivityGapMinutes) {
        rapidCount++
      }
    }

    if (rapidCount > ANOMALY_RULES.maxConsecutiveDownloads) {
      return {
        id: crypto.randomUUID(),
        user_id: userId,
        anomaly_type: 'unusual_activity',
        severity: 'medium',
        description: `Rapid consecutive activities detected: ${rapidCount} actions within seconds of each other`,
        detected_at: new Date().toISOString(),
        resolved: false,
        metadata: {
          rapidCount,
        },
      }
    }

    return null
  }

  /**
   * AI Analysis: Use HuggingFace to detect suspicious patterns
   */
  private async analyzeWithAI(
    userId: string,
    activities: AccessLog[]
  ): Promise<AnomalyRecord | null> {
    try {
      const summary = this.summarizeActivities(activities)
      
      console.log('🤖 Running AI analysis on activity summary...')

      // Use zero-shot classification to detect anomalies
      const result: any = await this.hf.zeroShotClassification({
        model: 'facebook/bart-large-mnli',
        inputs: summary,
        parameters: {
          candidate_labels: [
            'normal user activity',
            'suspicious behavior',
            'potential security threat',
            'data exfiltration attempt',
          ],
        },
      })

      // HuggingFace returns array of labels sorted by score
      const labels = Array.isArray(result) ? result : (result.labels || [])
      const scores = Array.isArray(result) ? [] : (result.scores || [])
      
      const topLabel = labels[0] || 'normal user activity'
      const confidence = scores[0] || 0

      console.log(`AI Analysis Result: ${topLabel} (confidence: ${(confidence * 100).toFixed(1)}%)`)

      // If suspicious and confidence is high enough
      if (topLabel !== 'normal user activity' && confidence > 0.5) {
        const severity = confidence > 0.8 ? 'high' : 'medium'

        return {
          id: crypto.randomUUID(),
          user_id: userId,
          anomaly_type: 'suspicious_login',
          severity,
          description: `AI detected: ${topLabel} (confidence: ${(confidence * 100).toFixed(1)}%)`,
          detected_at: new Date().toISOString(),
          resolved: false,
          metadata: {
            aiLabel: topLabel,
            confidence,
            summary,
          },
        }
      }
    } catch (error) {
      console.error('AI analysis error:', error)
      // Don't throw, just skip AI analysis
    }

    return null
  }

  /**
   * Create a human-readable summary of activities
   */
  private summarizeActivities(activities: AccessLog[]): string {
    const uploadCount = activities.filter(a => a.access_type === 'upload').length
    const downloadCount = activities.filter(a => a.access_type === 'download').length
    const viewCount = activities.filter(a => a.access_type === 'view').length
    const shareCount = activities.filter(a => a.access_type === 'share').length
    const uniqueIps = new Set(activities.map(a => a.ip_address)).size

    const timeSpan = this.getTimeSpan(activities)

    return `User performed ${activities.length} actions in ${timeSpan}: ${uploadCount} uploads, ${downloadCount} downloads, ${viewCount} views, ${shareCount} shares. Activity from ${uniqueIps} different IP addresses.`
  }

  /**
   * Get time span of activities
   */
  private getTimeSpan(activities: AccessLog[]): string {
    if (activities.length === 0) return '0 minutes'

    const timestamps = activities.map(a => new Date(a.timestamp).getTime())
    const min = Math.min(...timestamps)
    const max = Math.max(...timestamps)
    const diffMinutes = Math.round((max - min) / 1000 / 60)

    if (diffMinutes < 60) return `${diffMinutes} minutes`
    if (diffMinutes < 1440) return `${Math.round(diffMinutes / 60)} hours`
    return `${Math.round(diffMinutes / 1440)} days`
  }

  /**
   * Get recent activities from database
   */
  private async getRecentActivities(
    userId: string,
    hours: number
  ): Promise<AccessLog[]> {
    const since = new Date(Date.now() - hours * 3600000).toISOString()

    const { data, error } = await supabase
      .from('access_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', since)
      .order('timestamp', { ascending: false })

    if (error) {
      console.error('Error fetching activities:', error)
      return []
    }

    return data || []
  }

  /**
   * Get recent unique locations
   */
  private async getRecentLocations(
    userId: string,
    limit: number
  ): Promise<LocationData[]> {
    const { data, error } = await supabase
      .from('access_logs')
      .select('ip_address, geolocation, timestamp')
      .eq('user_id', userId)
      .not('geolocation', 'is', null)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error || !data) return []

    return data.map(d => ({
      ip: d.ip_address,
      ...JSON.parse(d.geolocation || '{}'),
      timestamp: new Date(d.timestamp),
    }))
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(
    loc1: { lat: number; lng: number },
    loc2: { lat: number; lng: number }
  ): number {
    const R = 6371 // Earth's radius in km
    const dLat = this.toRad(loc2.lat - loc1.lat)
    const dLon = this.toRad(loc2.lng - loc1.lng)

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(loc1.lat)) *
        Math.cos(this.toRad(loc2.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180
  }

  /**
   * Save anomalies to database
   */
  private async saveAnomalies(anomalies: AnomalyRecord[]): Promise<void> {
    const { error } = await supabase.from('anomaly_records').insert(anomalies)

    if (error) {
      console.error('Error saving anomalies:', error)
    } else {
      console.log(`✅ Saved ${anomalies.length} anomalies to database`)
    }
  }
}

/**
 * Log user activity
 */
export async function logActivity(
  userId: string,
  activityType: 'login' | 'upload' | 'download' | 'delete' | 'view' | 'share',
  metadata?: {
    fileId?: string
    fileName?: string
    success?: boolean
    errorMessage?: string
  }
): Promise<void> {
  try {
    // Get IP and user agent
    const ipAddress = await getUserIp()
    const userAgent = navigator.userAgent

    // Get geolocation (optional, can be slow)
    let geolocation = null
    if (activityType === 'login') {
      geolocation = await getIpGeolocation(ipAddress)
    }

    const logEntry = {
      user_id: userId,
      access_type: activityType,
      ip_address: ipAddress,
      user_agent: userAgent,
      geolocation: geolocation ? JSON.stringify(geolocation) : null,
      timestamp: new Date().toISOString(),
      success: metadata?.success !== false,
      metadata: metadata ? JSON.stringify(metadata) : null,
    }

    await supabase.from('access_logs').insert(logEntry)

    console.log(`📝 Logged ${activityType} activity for user ${userId}`)
  } catch (error) {
    console.error('Error logging activity:', error)
  }
}

/**
 * Get user's IP address
 */
export async function getUserIp(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json')
    const data = await response.json()
    return data.ip
  } catch (error) {
    console.error('Error getting IP:', error)
    return 'unknown'
  }
}

/**
 * Get IP geolocation (free API)
 */
export async function getIpGeolocation(ipAddress: string): Promise<any> {
  try {
    // Using ipapi.co (free tier: 1000 requests/day)
    const response = await fetch(`https://ipapi.co/${ipAddress}/json/`)
    const data = await response.json()

    return {
      country: data.country_name,
      city: data.city,
      lat: data.latitude,
      lng: data.longitude,
      region: data.region,
    }
  } catch (error) {
    console.error('Geolocation error:', error)
    return null
  }
}

/**
 * Get active anomalies for a user
 */
export async function getUserAnomalies(userId: string): Promise<AnomalyRecord[]> {
  const { data, error } = await supabase
    .from('anomaly_records')
    .select('*')
    .eq('user_id', userId)
    .eq('resolved', false)
    .order('detected_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Error fetching anomalies:', error)
    return []
  }

  return data || []
}

/**
 * Mark anomaly as resolved
 */
export async function resolveAnomaly(anomalyId: string): Promise<boolean> {
  const { error } = await supabase
    .from('anomaly_records')
    .update({ resolved: true })
    .eq('id', anomalyId)

  if (error) {
    console.error('Error resolving anomaly:', error)
    return false
  }

  return true
}

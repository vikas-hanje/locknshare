# Anomaly Detection Implementation Guide

## Overview

Anomaly detection in your LockNShare app will monitor user activities and identify suspicious patterns that could indicate security threats, unauthorized access, or account compromise.

## What is Anomaly Detection?

**Anomaly detection** is the identification of unusual patterns that don't conform to expected behavior. In your file-sharing app, this includes:

- **Unusual login locations** (IP geolocation changes)
- **Multiple failed authentication attempts**
- **Rapid file downloads** (potential data exfiltration)
- **Abnormal upload patterns** (unusual file sizes or frequencies)
- **Access at unusual times** (outside normal user hours)
- **Device/browser changes**

---

## Implementation Strategy

### Option 1: Rule-Based Detection (Simple & Free)

**Best for:** Quick implementation, no AI costs, deterministic results

#### How It Works:
Define rules based on thresholds and patterns:

```typescript
// Example rules
const ANOMALY_RULES = {
  maxFailedLogins: 5,           // Alert after 5 failed attempts
  maxDownloadsPerHour: 20,      // Unusual if > 20 downloads/hour
  maxDistanceKm: 500,           // Alert if login from >500km away
  unusualHoursStart: 23,        // After 11 PM
  unusualHoursEnd: 6,           // Before 6 AM
}
```

#### Implementation Steps:

**1. Track User Activities**
```typescript
// lib/anomalyDetection.ts
interface UserActivity {
  userId: string
  activityType: 'login' | 'upload' | 'download' | 'delete'
  timestamp: Date
  ipAddress: string
  userAgent: string
  location?: { country: string; city: string; lat: number; lng: number }
  metadata?: Record<string, any>
}

// Store in Supabase access_logs table
export async function logActivity(activity: UserActivity) {
  await supabase.from('access_logs').insert({
    user_id: activity.userId,
    access_type: activity.activityType,
    ip_address: activity.ipAddress,
    user_agent: activity.userAgent,
    timestamp: activity.timestamp.toISOString(),
    // Add geolocation if available
  })
}
```

**2. Check for Anomalies**
```typescript
export async function detectAnomalies(userId: string): Promise<AnomalyRecord[]> {
  const anomalies: AnomalyRecord[] = []
  
  // Check 1: Failed login attempts
  const failedLogins = await getFailedLoginCount(userId, '1 hour')
  if (failedLogins > ANOMALY_RULES.maxFailedLogins) {
    anomalies.push({
      id: generateId(),
      user_id: userId,
      anomaly_type: 'multiple_failed_attempts',
      severity: failedLogins > 10 ? 'high' : 'medium',
      description: `${failedLogins} failed login attempts in the last hour`,
      detected_at: new Date().toISOString(),
      resolved: false,
    })
  }
  
  // Check 2: IP location change
  const locations = await getRecentLocations(userId, 2)
  if (locations.length === 2) {
    const distance = calculateDistance(locations[0], locations[1])
    if (distance > ANOMALY_RULES.maxDistanceKm) {
      anomalies.push({
        id: generateId(),
        user_id: userId,
        anomaly_type: 'ip_mismatch',
        severity: distance > 1000 ? 'critical' : 'high',
        description: `Login from ${distance}km away from previous location`,
        detected_at: new Date().toISOString(),
        resolved: false,
      })
    }
  }
  
  // Check 3: Download rate
  const downloadCount = await getActivityCount(userId, 'download', '1 hour')
  if (downloadCount > ANOMALY_RULES.maxDownloadsPerHour) {
    anomalies.push({
      id: generateId(),
      user_id: userId,
      anomaly_type: 'unusual_activity',
      severity: 'medium',
      description: `Unusual download rate: ${downloadCount} files in 1 hour`,
      detected_at: new Date().toISOString(),
      resolved: false,
    })
  }
  
  // Store anomalies
  if (anomalies.length > 0) {
    await supabase.from('anomaly_records').insert(anomalies)
  }
  
  return anomalies
}
```

**3. Get IP Geolocation (Free API)**
```typescript
// Use ipapi.co (free tier: 1000 requests/day)
export async function getIpGeolocation(ipAddress: string) {
  try {
    const response = await fetch(`https://ipapi.co/${ipAddress}/json/`)
    const data = await response.json()
    
    return {
      country: data.country_name,
      city: data.city,
      lat: data.latitude,
      lng: data.longitude,
    }
  } catch (error) {
    console.error('Geolocation error:', error)
    return null
  }
}
```

**4. Calculate Distance Between Locations**
```typescript
// Haversine formula
export function calculateDistance(
  loc1: { lat: number; lng: number },
  loc2: { lat: number; lng: number }
): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(loc2.lat - loc1.lat)
  const dLon = toRad(loc2.lng - loc1.lng)
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(loc1.lat)) *
      Math.cos(toRad(loc2.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}
```

---

### Option 2: ML-Based Detection (Advanced)

**Best for:** More accurate detection, adapts to user behavior

#### Using Isolation Forest Algorithm

**Isolation Forest** is perfect for anomaly detection because:
- Works well with small datasets
- Unsupervised (no labeled training data needed)
- Fast and efficient
- Open source and free

#### Implementation with TensorFlow.js (Free)

**1. Install Dependencies**
```bash
npm install @tensorflow/tfjs
```

**2. Create Feature Vectors**
```typescript
// Extract features from user activity
interface ActivityFeatures {
  hourOfDay: number            // 0-23
  dayOfWeek: number            // 0-6
  filesAccessedPerHour: number
  uniqueIpCount: number        // IPs used in last 24h
  distanceFromUsualLocation: number
  fileSize: number             // For uploads
  timeSinceLastActivity: number // Minutes
}

export function extractFeatures(
  activity: UserActivity,
  userHistory: UserActivity[]
): number[] {
  const date = new Date(activity.timestamp)
  
  return [
    date.getHours(),                    // Hour of day
    date.getDay(),                      // Day of week
    calculateFilesPerHour(userHistory), // Activity rate
    getUniqueIpCount(userHistory),      // IP diversity
    getDistanceFromUsual(activity, userHistory), // Location
    activity.metadata?.fileSize || 0,   // File size
    getTimeSinceLastActivity(userHistory), // Time gap
  ]
}
```

**3. Train Simple Isolation Forest (Alternative: Use Python API)**

Since TensorFlow.js doesn't have Isolation Forest built-in, you have two options:

**Option A: Use a Python Backend (Recommended)**
```python
# anomaly_api.py
from flask import Flask, request, jsonify
from sklearn.ensemble import IsolationForest
import numpy as np

app = Flask(__name__)
model = IsolationForest(contamination=0.1)

@app.route('/detect', methods=['POST'])
def detect_anomaly():
    features = request.json['features']
    prediction = model.predict([features])
    
    # -1 = anomaly, 1 = normal
    is_anomaly = prediction[0] == -1
    
    return jsonify({
        'is_anomaly': is_anomaly,
        'score': float(model.score_samples([features])[0])
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

Deploy this on **Heroku** or **Railway** (both have free tiers).

**Option B: Use Simple Statistical Methods in JS**
```typescript
// lib/anomalyDetection.ts
export class SimpleAnomalyDetector {
  private mean: number[]
  private stdDev: number[]
  private threshold = 3 // Z-score threshold
  
  train(historicalData: number[][]) {
    // Calculate mean and std deviation for each feature
    this.mean = calculateMean(historicalData)
    this.stdDev = calculateStdDev(historicalData, this.mean)
  }
  
  predict(features: number[]): boolean {
    // Calculate Z-score for each feature
    const zScores = features.map((val, i) => 
      Math.abs((val - this.mean[i]) / this.stdDev[i])
    )
    
    // If any feature is > 3 std devs away, it's an anomaly
    return zScores.some(z => z > this.threshold)
  }
}
```

---

### Option 3: Use Free AI APIs

#### 1. **HuggingFace Transformers** (You're already using it!)

Use a **zero-shot classification** model to detect anomalous patterns:

```typescript
import { HfInference } from '@huggingface/inference'

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY)

export async function detectAnomalyWithAI(activityDescription: string) {
  const result = await hf.zeroShotClassification({
    model: 'facebook/bart-large-mnli',
    inputs: activityDescription,
    parameters: {
      candidate_labels: [
        'normal activity',
        'suspicious behavior',
        'security threat',
        'data breach attempt'
      ],
    },
  })
  
  // If highest score is for suspicious/threat labels
  const topLabel = result.labels[0]
  const isSuspicious = topLabel !== 'normal activity'
  
  return {
    isAnomaly: isSuspicious,
    confidence: result.scores[0],
    reason: topLabel,
  }
}

// Usage:
const description = `User logged in from India at 2 AM, downloaded 50 files in 10 minutes`
const detection = await detectAnomalyWithAI(description)
```

#### 2. **Anomaly.io API** (Free tier available)

Alternative service specifically for anomaly detection.

---

## Recommended Approach for Your App

**Start with Rule-Based (Option 1) + Enhance Later**

### Phase 1: Basic Rules (Week 1)
```typescript
// Implement these checks:
✅ Failed login attempts (> 5 in 1 hour)
✅ IP location changes (> 500km)
✅ Download rate (> 20 files/hour)
✅ Unusual access times (11 PM - 6 AM)
```

### Phase 2: Geolocation (Week 2)
```typescript
✅ Add ipapi.co integration
✅ Track user's usual locations
✅ Alert on unexpected locations
```

### Phase 3: AI Enhancement (Week 3-4)
```typescript
✅ Add HuggingFace zero-shot classification
✅ Generate activity summaries
✅ Use AI to explain anomalies to users
```

---

## Complete Implementation Example

```typescript
// lib/anomalyDetection.ts
import { HfInference } from '@huggingface/inference'
import { supabase } from './supabase'
import { AnomalyRecord } from '@/types'

export class AnomalyDetector {
  private hf: HfInference
  
  constructor(apiKey: string) {
    this.hf = new HfInference(apiKey)
  }
  
  async analyzeActivity(userId: string): Promise<AnomalyRecord[]> {
    const anomalies: AnomalyRecord[] = []
    
    // Get recent activity
    const activities = await this.getRecentActivities(userId, 24) // Last 24 hours
    
    // Rule 1: Failed logins
    const failedLogins = activities.filter(
      a => a.access_type === 'login' && !a.success
    ).length
    
    if (failedLogins >= 5) {
      anomalies.push(this.createAnomaly(
        userId,
        'multiple_failed_attempts',
        failedLogins > 10 ? 'critical' : 'high',
        `${failedLogins} failed login attempts detected`
      ))
    }
    
    // Rule 2: Location changes
    const locations = await this.getUniqueLocations(userId, 2)
    if (locations.length >= 2) {
      const distance = this.calculateDistance(locations[0], locations[1])
      if (distance > 500) {
        anomalies.push(this.createAnomaly(
          userId,
          'ip_mismatch',
          'high',
          `Login from ${Math.round(distance)}km away`
        ))
      }
    }
    
    // Rule 3: Download rate
    const downloads = activities.filter(a => a.access_type === 'download').length
    if (downloads > 20) {
      anomalies.push(this.createAnomaly(
        userId,
        'unusual_activity',
        'medium',
        `High download rate: ${downloads} files in 24h`
      ))
    }
    
    // AI Analysis (optional enhancement)
    if (activities.length > 0) {
      const aiResult = await this.analyzeWithAI(activities)
      if (aiResult.isAnomaly) {
        anomalies.push(this.createAnomaly(
          userId,
          'unusual_activity',
          'medium',
          `AI detected: ${aiResult.reason}`
        ))
      }
    }
    
    // Save to database
    if (anomalies.length > 0) {
      await supabase.from('anomaly_records').insert(anomalies)
    }
    
    return anomalies
  }
  
  private async analyzeWithAI(activities: any[]) {
    const summary = this.summarizeActivities(activities)
    
    const result = await this.hf.zeroShotClassification({
      model: 'facebook/bart-large-mnli',
      inputs: summary,
      parameters: {
        candidate_labels: ['normal', 'suspicious', 'malicious'],
      },
    })
    
    return {
      isAnomaly: result.labels[0] !== 'normal',
      reason: result.labels[0],
      confidence: result.scores[0],
    }
  }
  
  private summarizeActivities(activities: any[]): string {
    const loginCount = activities.filter(a => a.access_type === 'login').length
    const uploadCount = activities.filter(a => a.access_type === 'upload').length
    const downloadCount = activities.filter(a => a.access_type === 'download').length
    const uniqueIps = new Set(activities.map(a => a.ip_address)).size
    
    return `User activity: ${loginCount} logins, ${uploadCount} uploads, ${downloadCount} downloads from ${uniqueIps} different IPs`
  }
  
  private createAnomaly(
    userId: string,
    type: string,
    severity: string,
    description: string
  ): AnomalyRecord {
    return {
      id: crypto.randomUUID(),
      user_id: userId,
      anomaly_type: type as any,
      severity: severity as any,
      description,
      detected_at: new Date().toISOString(),
      resolved: false,
    }
  }
  
  // Helper methods...
  private async getRecentActivities(userId: string, hours: number) {
    const { data } = await supabase
      .from('access_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', new Date(Date.now() - hours * 3600000).toISOString())
    
    return data || []
  }
  
  private calculateDistance(loc1: any, loc2: any): number {
    // Haversine formula implementation
    // ... (from earlier example)
    return 0 // placeholder
  }
}
```

---

## Integration with Your App

### 1. Add to Upload Hook
```typescript
// hooks/usePinataUpload.ts
export function usePinataUpload() {
  const upload = async (file: File, name: string, metadata: any) => {
    // ... existing upload code ...
    
    // After successful upload
    await logActivity({
      userId: user.id,
      activityType: 'upload',
      timestamp: new Date(),
      ipAddress: await getUserIp(),
      userAgent: navigator.userAgent,
    })
    
    // Check for anomalies
    const detector = new AnomalyDetector(process.env.HUGGINGFACE_API_KEY!)
    await detector.analyzeActivity(user.id)
  }
}
```

### 2. Show Alerts in UI
```typescript
// components/AnomalyWidget.tsx - Update existing widget
export function AnomalyWidget() {
  const [anomalies, setAnomalies] = useState<AnomalyRecord[]>([])
  
  useEffect(() => {
    async function fetchAnomalies() {
      const { data } = await supabase
        .from('anomaly_records')
        .select('*')
        .eq('user_id', user.id)
        .eq('resolved', false)
        .order('detected_at', { ascending: false })
      
      setAnomalies(data || [])
    }
    
    fetchAnomalies()
  }, [user])
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Alerts</CardTitle>
      </CardHeader>
      <CardContent>
        {anomalies.length > 0 ? (
          anomalies.map(a => (
            <div key={a.id} className="alert">
              <AlertCircle />
              {a.description}
            </div>
          ))
        ) : (
          <p>No security alerts</p>
        )}
      </CardContent>
    </Card>
  )
}
```

---

## Cost Comparison

| Approach | Setup Time | Cost | Accuracy |
|----------|------------|------|----------|
| **Rule-Based** | 1-2 days | $0 | 70-80% |
| **Statistical** | 3-5 days | $0 | 75-85% |
| **HuggingFace AI** | 2-3 days | $0 (free tier) | 80-90% |
| **Python ML** | 5-7 days | ~$5-10/month hosting | 85-95% |

---

## Recommendation

**Start with Rule-Based + HuggingFace:**

1. ✅ **Week 1:** Implement basic rules (failed logins, download rate)
2. ✅ **Week 2:** Add IP geolocation tracking
3. ✅ **Week 3:** Integrate HuggingFace for AI analysis
4. ✅ **Week 4:** Fine-tune thresholds based on real data

This gives you:
- Immediate value with simple rules
- Free AI-powered insights
- No additional infrastructure costs
- Easy to expand later

---

## Next Steps

1. **Run the Supabase migration** to ensure anomaly_records table exists
2. **Implement basic activity logging** in your upload/download flows
3. **Create the AnomalyDetector class** from the example
4. **Test with simulated activities**
5. **Deploy and monitor**

Let me know which approach you'd like to implement first!

# How to Test Anomaly Detection System

## Prerequisites
1. ✅ Run database migrations (access_logs and anomaly_records tables)
2. ✅ Restart dev server (`npm run dev`)
3. ✅ Have HuggingFace API key configured

---

## Testing Methods

### Method 1: Automatic Testing (Easiest)

The anomaly detection runs automatically whenever you perform activities. Here's how to trigger anomalies:

#### Test 1: Excessive Upload Rate
**Triggers:** Upload rate anomaly (15+ uploads/hour)

**Steps:**
1. Go to `/upload` page
2. Upload 16 files in quick succession (within 10 minutes)
3. Wait 2-3 seconds after the last upload
4. Go to `/dashboard`
5. Check "Security Status" widget

**Expected Result:**
- ⚠️ Anomaly: "Unusual upload rate: 16 files in the last hour"
- Severity: MEDIUM
- Trust Score: Reduced to ~85%

---

#### Test 2: Rapid Activity
**Triggers:** Rapid consecutive activities (10+ actions within seconds)

**Steps:**
1. Upload 5-6 files very quickly (< 5 seconds between each)
2. Immediately download 5-6 files
3. Go to `/dashboard`

**Expected Result:**
- ⚠️ Anomaly: "Rapid consecutive activities detected"
- Severity: MEDIUM

---

#### Test 3: Unusual Access Time
**Triggers:** Activity during off-hours (11 PM - 6 AM)

**Steps:**
1. Use the app between 11 PM and 6 AM
2. Perform 5+ activities (upload, download, search)
3. Check `/dashboard`

**Expected Result:**
- ⚠️ Anomaly: "X activities during unusual hours (11 PM - 6 AM)"
- Severity: LOW

---

#### Test 4: AI Pattern Detection
**Triggers:** AI-detected suspicious patterns

**Steps:**
1. Perform varied rapid activities:
   - Upload 3 files quickly
   - Download 8 files in a row
   - Search multiple times
   - Upload 2 more files
2. Wait 3-4 seconds (AI analysis takes time)
3. Check `/dashboard`

**Expected Result:**
- 🤖 AI may flag as "suspicious behavior" if pattern seems unusual
- Severity: MEDIUM or HIGH (depending on confidence)

---

### Method 2: Manual Testing (via Browser Console)

#### Step 1: Open Dashboard
```
Go to http://localhost:3000/dashboard
```

#### Step 2: Open Browser Console
```
Press F12 or Right-click → Inspect → Console
```

#### Step 3: Manually Create Test Activities

**Log bulk uploads:**
```javascript
// Simulate 20 uploads in quick succession
for (let i = 0; i < 20; i++) {
  fetch('/api/activity-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'your-user-id',
      activityType: 'upload',
      success: true
    })
  })
}
```

**Trigger detection manually:**
```javascript
// After logging activities, trigger detection
const response = await fetch('/api/detect-anomalies', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 'your-user-id' })
})
```

---

### Method 3: Database Direct Testing

#### Option A: Insert Test Activities

**In Supabase SQL Editor:**
```sql
-- Insert 25 download activities in the last hour
INSERT INTO access_logs (user_id, access_type, ip_address, timestamp, success)
SELECT 
  'your-user-id-here',
  'download',
  '192.168.1.' || floor(random() * 255)::int,
  NOW() - (random() * interval '1 hour'),
  true
FROM generate_series(1, 25);

-- Check anomaly detection would trigger
SELECT COUNT(*) FROM access_logs 
WHERE user_id = 'your-user-id-here' 
AND access_type = 'download'
AND timestamp >= NOW() - interval '1 hour';
-- Should return 25+ (triggers at 20)
```

---

#### Option B: Insert Test Anomalies Directly

```sql
-- Manually insert test anomaly
INSERT INTO anomaly_records (
  user_id,
  anomaly_type,
  severity,
  description,
  detected_at,
  resolved,
  metadata
) VALUES (
  'your-user-id-here',
  'unusual_activity',
  'high',
  'Test anomaly: Rapid file access detected',
  NOW(),
  false,
  '{"test": true}'::jsonb
);

-- View in dashboard immediately
```

---

## Expected Dashboard Display

### When NO Anomalies:
```
🟢 All Clear
0 unresolved alert(s)
Trust Score: 100%
"No security alerts
Your account activity looks normal"
```

### When LOW Severity Anomalies:
```
🟢 All Clear (minor issues)
1 unresolved alert(s)
Trust Score: 95%

[LOW] unusual_activity
"5 activities during unusual hours (11 PM - 6 AM)"
```

### When MEDIUM Severity Anomalies:
```
🟡 Minor Issues
2 unresolved alert(s)
Trust Score: 80%

[MEDIUM] unusual_activity
"Unusual upload rate: 16 files in the last hour"

[MEDIUM] unusual_activity
"Rapid consecutive activities detected: 12 actions within seconds"
```

### When HIGH/CRITICAL Anomalies:
```
🔴 Attention Required
3 unresolved alert(s)
Trust Score: 40%

[CRITICAL] ip_mismatch
"Login from 2400km away from previous location"

[HIGH] suspicious_login
"AI detected: suspicious behavior (confidence: 85%)"

[MEDIUM] unusual_activity
"Unusual download rate: 25 files in 1 hour"
```

---

## Verification Steps

### 1. Check Activity Logs
```sql
-- View recent activities
SELECT * FROM access_logs 
WHERE user_id = 'your-user-id'
ORDER BY timestamp DESC
LIMIT 20;
```

### 2. Check Anomaly Records
```sql
-- View detected anomalies
SELECT 
  anomaly_type,
  severity,
  description,
  detected_at,
  resolved
FROM anomaly_records
WHERE user_id = 'your-user-id'
ORDER BY detected_at DESC;
```

### 3. Check Detection Functions
```sql
-- Get activity summary
SELECT * FROM get_user_recent_activities('your-user-id', 24);

-- Get anomaly summary
SELECT * FROM get_user_anomaly_summary('your-user-id');
```

---

## Real-World Scenarios

### Scenario 1: Normal User Behavior
**Activities:**
- Login from home
- Upload 3 documents
- Download 2 files
- Search for "reports"

**Expected:** No anomalies, Trust Score: 100%

---

### Scenario 2: Bulk Data Transfer
**Activities:**
- Upload 18 files in 15 minutes (batch upload)

**Expected:** 
- Anomaly: "Unusual upload rate"
- Severity: MEDIUM
- Trust Score: ~85%
- This is expected behavior, can be marked as resolved

---

### Scenario 3: Data Exfiltration Attempt
**Activities:**
- Login at 2:00 AM
- Download 30 files in 5 minutes
- All downloads within seconds of each other

**Expected:**
- Anomaly 1: "Unusual access time" (LOW)
- Anomaly 2: "Excessive download rate" (MEDIUM)
- Anomaly 3: "Rapid consecutive activities" (MEDIUM)
- Anomaly 4: AI may detect "data exfiltration attempt" (MEDIUM/HIGH)
- Trust Score: ~30%
- Status: 🔴 ALERT

---

## Debugging Tips

### If No Anomalies Appear:

**1. Check if activities are being logged:**
```sql
SELECT COUNT(*) FROM access_logs WHERE user_id = 'your-user-id';
```
- Should have entries after uploads/downloads

**2. Check if detection ran:**
```javascript
// In browser console
console.log('Check detection logs')
```
- Look for "🔍 Analyzing activity for user..." in console

**3. Check HuggingFace API:**
```javascript
// Test API key
const test = await fetch('/api/embeddings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'test' })
})
console.log(await test.json())
```

**4. Manually trigger detection:**
```typescript
// If you have access to the hook
const { runDetection } = useAnomalyMonitor()
await runDetection()
```

---

## Adjusting Detection Sensitivity

Edit `lib/anomalyDetection.ts`:

```typescript
export const ANOMALY_RULES = {
  // Make MORE sensitive (catches more):
  maxFailedLogins: 3,          // Was: 5
  maxDownloadsPerHour: 10,     // Was: 20
  maxUploadsPerHour: 8,        // Was: 15
  
  // Make LESS sensitive (catches less):
  maxFailedLogins: 10,         // Was: 5
  maxDownloadsPerHour: 50,     // Was: 20
  maxUploadsPerHour: 30,       // Was: 15
}
```

Restart dev server after changes.

---

## Performance Testing

### Test AI Analysis Speed:
```
1. Upload 5 files
2. Time from last upload to anomaly detection
3. Should complete in 2-4 seconds
```

### Test Dashboard Load:
```
1. Create 10 anomalies
2. Navigate to /dashboard
3. Should load in < 500ms
```

---

## Summary

### Easiest Test (Recommended):
1. Upload 16 files quickly
2. Wait 3 seconds
3. Check dashboard
4. Should see "Unusual upload rate" anomaly

### Most Realistic Test:
1. Use app normally for 5 minutes
2. Then rapidly download 10+ files
3. Check dashboard
4. Should see download rate anomaly

### Most Dramatic Test:
1. Upload 20 files at 2 AM
2. Download all of them rapidly
3. Check dashboard
4. Should see multiple anomalies with ALERT status

---

## Need Help?

- **No anomalies?** → Upload 20 files quickly
- **Not showing on dashboard?** → Hard refresh (Ctrl+Shift+R)
- **Trust score not changing?** → Check anomaly_records table in Supabase
- **AI not working?** → Check HuggingFace API key in .env.local

**Remember:** Detection runs **automatically** after each activity with a 1-second delay!

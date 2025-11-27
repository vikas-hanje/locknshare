# Anomaly Detection System Analysis & Fixes

## Issues Found

### 1. **No Trust Score Updates**
**Problem:** The anomaly detection system creates anomaly records with severity levels, but **nowhere in the code are trust scores actually updated** based on these detections.

**Current Situation:**
- Anomalies are detected and saved to database with severity: `low`, `medium`, `high`, `critical`
- But user trust scores in the `users` table are **never modified**
- The trust score remains at initial value (typically 100)

**Impact:** The trust scoring system is completely non-functional

---

### 2. **AI Confidence Scores Always 35-40%**
**Problem:** This is actually **correct** for normal activity, but the interpretation is confusing.

**Why This Happens:**
Zero-shot classification distributes confidence across 4 labels:
```javascript
candidate_labels: [
  'normal user activity',       // ~35-40% for normal
  'suspicious behavior',         // ~20-25%
  'potential security threat',   // ~20-25%
  'data exfiltration attempt',   // ~10-15%
]
```

For normal activity, the model is **uncertain** which specific threat it might be, so it distributes probability. A 35-40% confidence for "normal user activity" is actually **expected and correct**.

**The Real Issue:** The threshold logic is wrong:
- Current: `if (topLabel !== 'normal user activity' && confidence > 0.5)`
- Problem: For normal activity with 35% confidence, this works
- Problem: For "suspicious behavior" with 25% confidence, it doesn't trigger (25% < 50%)

---

## Required Fixes

### Fix 1: Implement Trust Score Updates

Need to add a function that updates user trust scores when anomalies are detected:

```typescript
// In anomalyDetection.ts or new file
export async function updateUserTrustScore(
  userId: string,
  severity: 'low' | 'medium' | 'high' | 'critical'
): Promise<void> {
  const impactMap = {
    low: -10,
    medium: -25,
    high: -50,
    critical: -100
  }
  
  const impact = impactMap[severity]
  
  // Get current trust score
  const { data: user } = await supabase
    .from('users')
    .select('trust_score')
    .eq('id', userId)
    .single()
  
  const currentScore = user?.trust_score || 100
  const newScore = Math.max(0, Math.min(100, currentScore + impact))
  
  // Update trust score
  await supabase
    .from('users')
    .update({ trust_score: newScore })
    .eq('id', userId)
    
  console.log(`🎯 Updated trust score: ${currentScore} → ${newScore} (${impact})`)
}
```

**Call this after saving anomalies:**
```typescript
// After saving anomalies
for (const anomaly of anomalies) {
  await updateUserTrustScore(userId, anomaly.severity)
}
```

---

### Fix 2: Improve AI Confidence Logic

**Option A: Use Relative Scores (Recommended)**
```typescript
// Compare top label confidence vs second-best
const topLabel = labels[0]
const topScore = scores[0]
const secondScore = scores[1] || 0
const relativeDiff = topScore - secondScore

// Trigger if non-normal AND significantly higher than alternatives
if (topLabel !== 'normal user activity' && relativeDiff > 0.1) {
  // This means the suspicious label is at least 10% more likely
  const severity = topScore > 0.35 ? 'high' : 'medium'
  // Create anomaly...
}
```

**Option B: Use Threshold Based on Label**
```typescript
const thresholds = {
  'normal user activity': 0.3,        // OK if >30%
  'suspicious behavior': 0.25,         // Alert if >25%
  'potential security threat': 0.25,   // Alert if >25%
  'data exfiltration attempt': 0.20    // Alert if >20%
}

if (topLabel !== 'normal user activity' && topScore > thresholds[topLabel]) {
  // Create anomaly
}
```

**Option C: Look at Combined Threat Score**
```typescript
const normalScore = scores[labels.indexOf('normal user activity')] || 0
const threatScore = 1 - normalScore // Everything else

if (threatScore > 0.6) { // More than 60% chance it's NOT normal
  const severity = threatScore > 0.8 ? 'high' : 'medium'
  // Create anomaly
}
```

---

### Fix 3: Add Positive Trust Score Events

Currently only negative impacts exist. Add positive reinforcement:

```typescript
// After successful normal upload/download
export async function incrementTrustScore(userId: string): Promise<void> {
  const { data: user } = await supabase
    .from('users')
    .select('trust_score')
    .eq('id', userId)
    .single()
  
  const currentScore = user?.trust_score || 100
  const newScore = Math.min(100, currentScore + 1) // Max 100
  
  await supabase
    .from('users')
    .update({ trust_score: newScore })
    .eq('id', userId)
}
```

---

## Severity-to-Impact Mapping (Recommended)

| Severity | Detection Trigger | Trust Impact | Recovery Time |
|----------|------------------|--------------|---------------|
| **Low** | Off-hours access (5+ times) | -10 | ~10 normal actions |
| **Medium** | Excessive downloads (>20/hr), uploads (>15/hr) | -25 | ~25 normal actions |
| **High** | Failed logins (5-10), new location + AI suspicious | -50 | ~50 normal actions |
| **Critical** | Failed logins (>10), AI high-confidence threat | -100 | Account locked, manual review |

---

## AI Confidence Interpretation Guide

### What the Scores Mean

**Normal Activity (Typical: 30-45%)**
```
35% normal user activity
25% suspicious behavior
22% potential security threat
18% data exfiltration attempt
```
✅ This is NORMAL! Model is saying "probably normal, but not certain"

**Mildly Suspicious (25-35% suspicious)**
```
30% suspicious behavior
28% normal user activity
24% potential security threat
18% data exfiltration attempt
```
⚠️ Borderline - might trigger if difference is significant

**Clearly Suspicious (>40% threat)**
```
45% potential security threat
25% suspicious behavior
20% normal user activity
10% data exfiltration attempt
```
🚨 Strong signal - definitely trigger alert

---

## Implementation Priority

1. **HIGH: Add trust score update function** - Currently broken
2. **MEDIUM: Fix AI confidence logic** - Use Option C (combined threat score)
3. **LOW: Add positive reinforcement** - Nice to have

---

## Testing Recommendations

### Test Scenario 1: Normal Activity
```
Expected: No anomalies, trust score +1 per action, stays at 100
AI Scores: ~35% normal, others ~20-25%
```

### Test Scenario 2: Rapid Downloads
```
Expected: Medium anomaly, trust score -25
Trigger: >20 downloads in 1 hour
```

### Test Scenario 3: Failed Logins
```
Expected:
- 5-10 fails: High anomaly, -50 trust
- >10 fails: Critical anomaly, -100 trust
```

### Test Scenario 4: AI Detection
```
Expected: Alert if combined threat score >60%
Example: 25% suspicious + 22% threat + 18% exfil = 65%
```

---

## Code Locations to Update

1. `lib/anomalyDetection.ts` - Lines 350-449 (AI analysis)
2. `lib/anomalyDetection.ts` - Add trust score functions
3. Wherever anomalies are saved - Call trust update
4. After successful file operations - Call positive increment

---

**Bottom Line:** The anomaly detection DETECTS correctly, but doesn't DO anything with the detections. Trust scores never change!

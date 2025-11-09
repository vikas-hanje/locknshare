# Security Features Testing Guide

Complete guide to test all security features in LockNShare.

---

## 🛡️ Security Features Overview

LockNShare includes multiple security layers:
1. **Anomaly Detection** - AI-powered threat monitoring
2. **Access Logging** - Complete audit trail
3. **Geolocation Tracking** - IP-based location monitoring
4. **Trust Scoring** - Real-time security score
5. **Failed Login Detection** - Brute-force protection
6. **Cross-Device Key Sync** - Secure key management

---

## 📋 Testing Checklist

### ✅ Prerequisites
- [ ] MetaMask installed and configured
- [ ] Multiple browser profiles or devices for multi-user testing
- [ ] Access to Supabase dashboard for database verification
- [ ] DevTools console open for debugging

---

## 1. 🔍 Anomaly Detection Testing

### Test 1A: Unusual Upload Rate
**Trigger**: Upload many files quickly

```bash
Steps:
1. Connect wallet at /dashboard
2. Go to /upload
3. Upload 16+ files within 10 minutes
   - Use small files (images, PDFs)
   - Upload rapidly without delays
4. Wait 3-5 seconds for detection
5. Go to /security

Expected Result:
✅ Anomaly alert appears
✅ Type: "unusual_upload_rate" or "rapid_activity"
✅ Severity: medium or high
✅ Trust score reduced (below 100%)
✅ Description shows file count and time frame
```

**Database Verification**:
```sql
-- Check in Supabase SQL Editor
SELECT * FROM anomaly_records 
WHERE user_id = 'your-user-id'
ORDER BY detected_at DESC
LIMIT 5;
```

---

### Test 1B: Unusual Download Rate
**Trigger**: Download many files quickly

```bash
Steps:
1. Upload 10+ files first
2. Go to /files
3. Rapidly download 10+ files (< 5 minutes)
4. Wait 3-5 seconds
5. Check /security

Expected Result:
✅ Anomaly: "unusual_download_rate"
✅ Severity: medium
✅ Trust score drops
```

---

### Test 1C: Failed Login Attempts
**Trigger**: Multiple failed wallet signatures

```bash
Steps:
1. Disconnect wallet
2. Connect wallet button
3. When MetaMask prompt appears, click "Cancel"
4. Repeat 5+ times rapidly
5. Check /security

Expected Result:
✅ Anomaly: "multiple_failed_logins"
✅ Severity: high or critical
✅ Trust score significantly reduced
✅ Warning displayed on dashboard
```

**Note**: This is hard to test since MetaMask prevents automated rejections. Alternative: Manually check database with test data.

---

### Test 1D: Unusual Access Time
**Trigger**: Activity during unusual hours

```bash
Steps:
1. Change your system time to 2:00 AM
2. Log in and upload files
3. Change back to normal time
4. Check /security

Expected Result:
✅ Anomaly: "unusual_access_time"
✅ Severity: low or medium
✅ Time displayed in description

OR manually insert test data:
```

```sql
-- Insert test anomaly
INSERT INTO anomaly_records (user_id, anomaly_type, severity, description)
VALUES (
  'your-user-id',
  'unusual_access_time',
  'low',
  'Activity detected at 3:47 AM, outside normal hours (6 AM - 11 PM)'
);
```

---

### Test 1E: Geolocation Change
**Trigger**: Login from different IP/location

```bash
Steps (Requires VPN or different network):
1. Log in from home network (IP 1)
2. Note location in console logs
3. Disconnect and switch to VPN or mobile hotspot (IP 2)
4. Log in again from new IP
5. Check /security

Expected Result:
✅ Anomaly: "location_change" or "ip_mismatch"
✅ Severity: medium
✅ Shows both locations
✅ Distance calculated

Fallback Test (Without VPN):
1. Check access_logs table for IP addresses
2. Manually insert anomaly with location data
```

---

## 2. 📊 Access Logging Testing

### Test 2A: Login Activity
```bash
Steps:
1. Disconnect wallet
2. Connect wallet (approve signature)
3. Open Supabase Dashboard
4. Query access_logs table

Expected Result:
✅ New record with access_type = 'login'
✅ ip_address populated
✅ user_agent contains browser info
✅ geolocation JSON includes city, country
✅ timestamp is current
✅ success = true
```

**SQL Query**:
```sql
SELECT 
  access_type,
  ip_address,
  geolocation->>'city' as city,
  geolocation->>'country' as country,
  timestamp,
  success
FROM access_logs
WHERE user_id = 'your-user-id'
ORDER BY timestamp DESC
LIMIT 10;
```

---

### Test 2B: File Upload Activity
```bash
Steps:
1. Go to /upload
2. Upload a file
3. Check access_logs

Expected Result:
✅ Record with access_type = 'upload'
✅ metadata JSONB includes file details
✅ Logged correctly
```

---

### Test 2C: File Download Activity
```bash
Steps:
1. Download a file from /files
2. Check access_logs

Expected Result:
✅ Record with access_type = 'download'
✅ File ID in metadata
✅ Success = true
```

---

### Test 2D: Failed Activities
```bash
Steps:
1. Try to download a file you don't have access to
2. Or simulate decryption failure
3. Check access_logs

Expected Result:
✅ Record with success = false
✅ Error message in metadata
```

---

## 3. 🌍 Geolocation Tracking

### Test 3A: Geolocation on Login
```bash
Steps:
1. Open DevTools Console (F12)
2. Connect wallet
3. Look for geolocation logs

Expected Console Output:
📝 Logged login activity for user abc123
✅ Geolocation fetched: Mumbai, India
(or your actual city/country)

Expected Database:
{
  "city": "Mumbai",
  "country": "India",
  "lat": 19.0760,
  "lng": 72.8777,
  "region": "Maharashtra"
}
```

---

### Test 3B: Multiple IP Tracking
```bash
Steps:
1. Log activities from different locations
2. Query access_logs for geolocation data

SQL Query:
SELECT DISTINCT
  geolocation->>'city' as city,
  geolocation->>'country' as country,
  COUNT(*) as login_count
FROM access_logs
WHERE user_id = 'your-user-id'
  AND access_type = 'login'
GROUP BY geolocation->>'city', geolocation->>'country';
```

---

## 4. 📈 Trust Score Testing

### Test 4A: Initial Trust Score
```bash
Steps:
1. Create new account
2. Go to /security
3. Check trust score

Expected Result:
✅ Trust Score = 100%
✅ Status = "All Clear" (green)
✅ No anomalies
```

---

### Test 4B: Trust Score Reduction
```bash
Steps:
1. Trigger anomaly (upload 16+ files rapidly)
2. Wait for detection
3. Check /security page

Expected Result:
✅ Trust score < 100% (e.g., 85%)
✅ Status changes to "Minor Issues" (yellow)
✅ Anomaly count increases
```

**Trust Score Formula**:
```
Base Score = 100
- High severity anomaly: -15 points
- Medium severity: -10 points
- Low severity: -5 points

Minimum score: 0
```

---

### Test 4C: Trust Score Recovery
```bash
Steps:
1. Resolve anomalies manually in database
2. Refresh /security page

SQL to resolve:
UPDATE anomaly_records
SET resolved = true, resolved_at = NOW()
WHERE user_id = 'your-user-id'
  AND resolved = false;

Expected Result:
✅ Trust score increases
✅ Unresolved count = 0
✅ Status back to "All Clear"
```

---

## 5. 🔐 Cross-Device Key Sync Testing

### Test 5A: Key Generation
```bash
Steps:
1. First-time login on Device A
2. Check browser console

Expected Console:
⚡ Generating new encryption keys...
💾 Saving keys to cloud...
✅ New keys generated and saved
🔑 Public Key (first 50 chars): MIIBIjANBg...
```

**Database Check**:
```sql
SELECT * FROM user_keys
WHERE user_id = 'your-user-id';

-- Should have 1 row with encrypted_private_key
```

---

### Test 5B: Key Retrieval on New Device
```bash
Steps:
1. Open app on Device B (different browser/computer)
2. Connect same wallet
3. Approve signature request
4. Check console

Expected Console:
📝 Requesting wallet signature for cloud key access...
✅ Wallet signature obtained
☁️ Retrieving keys from cloud...
✅ Keys retrieved from cloud and saved to localStorage
🔑 Public Key (first 50 chars): MIIBIjANBg...
```

---

### Test 5C: Cross-Device File Access
```bash
Steps:
1. Device A: Upload encrypted file
2. Device B: Log in with same wallet
3. Device B: Download the file

Expected Result:
✅ Keys sync automatically
✅ File decrypts successfully
✅ No "key not found" errors
```

---

## 6. 🚨 Comprehensive Security Test Scenario

### Full Security Workflow Test

```bash
Day 1 - Setup:
1. Create account on Device A
2. Upload 5 files
3. Share 2 files with another user
4. Verify trust score = 100%

Day 2 - Normal Activity:
1. Log in from same IP
2. Download 2 files
3. Upload 1 file
4. Trust score remains 100%
5. Access logs show all activity

Day 3 - Suspicious Activity:
1. Log in from VPN (different IP)
   → Anomaly: location_change
2. Upload 20 files in 5 minutes
   → Anomaly: unusual_upload_rate
3. Cancel login 3 times
   → Anomaly: failed_logins
4. Check /security:
   → Trust score drops to ~70%
   → 3 unresolved anomalies
   → Status: "Attention Required" (red)

Day 4 - Recovery:
1. Review anomalies
2. Mark as resolved (if legitimate)
3. Normal activity for a day
4. Trust score gradually recovers
```

---

## 7. 🐛 Debugging Tips

### Enable Detailed Logging

```javascript
// In browser console
localStorage.setItem('debug', 'locknshare:*')

// Refresh page to see detailed logs
```

### Check Database Directly

```sql
-- All anomalies for user
SELECT * FROM anomaly_records
WHERE user_id = 'your-user-id'
ORDER BY detected_at DESC;

-- All access logs
SELECT * FROM access_logs
WHERE user_id = 'your-user-id'
ORDER BY timestamp DESC
LIMIT 20;

-- User's encryption keys
SELECT * FROM user_keys
WHERE user_id = 'your-user-id';
```

---

## 8. 📊 Expected Results Summary

| Feature | Success Indicator | Where to Verify |
|---------|------------------|-----------------|
| Anomaly Detection | Alert shows on /security | Database + UI |
| Access Logging | All activities logged | `access_logs` table |
| Geolocation | City/country captured | `access_logs.geolocation` |
| Trust Score | Updates based on anomalies | /security page |
| Failed Logins | Counted and alerted | `anomaly_records` |
| Key Sync | Works across devices | Console logs + file decryption |

---

## 9. 🎯 Quick Test Checklist

**5-Minute Security Test**:
- [ ] Upload 16 files quickly → Check for anomaly
- [ ] Check /security page → Verify trust score
- [ ] Review access logs in Supabase
- [ ] Download a file → Verify logging
- [ ] Check console for geolocation logs

**Complete Security Audit** (30 minutes):
- [ ] Test all 6 anomaly types
- [ ] Verify all access logging types
- [ ] Test cross-device key sync
- [ ] Validate geolocation on multiple IPs
- [ ] Test trust score calculation
- [ ] Verify database integrity

---

## 10. 📞 Troubleshooting

### Issue: No anomalies detected
**Solution**:
- Check if activity thresholds are met
- Verify anomaly detection code is running
- Check browser console for errors
- Manually insert test data

### Issue: Geolocation not working
**Solution**:
- Check IP API rate limits
- Verify network allows external API calls
- Check console for CORS errors
- Try different geolocation service

### Issue: Keys not syncing
**Solution**:
- Verify user_keys table exists
- Check wallet signature is approved
- Clear localStorage and reconnect
- Verify Supabase permissions

---

## ✅ Success Criteria

Your security features are working correctly if:

1. ✅ Anomalies detected for unusual patterns
2. ✅ All user activities logged in database
3. ✅ Geolocation captured for logins
4. ✅ Trust score updates dynamically
5. ✅ Security page shows real-time alerts
6. ✅ Cross-device encryption works
7. ✅ Access logs include all required fields
8. ✅ Failed attempts trigger alerts

---

**Last Updated**: January 2025  
**Testing Environment**: Development (localhost:3000)

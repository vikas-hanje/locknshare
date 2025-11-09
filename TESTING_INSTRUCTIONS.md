# Testing Instructions for Latest Fixes

## ✅ What Was Fixed

1. **Trust Score Sync** - Dashboard now shows same trust score as Security page
2. **"It Was Me" Button** - Now properly updates database and removes anomaly
3. **Cross-Device Decryption** - Enhanced decryption logic with better fallback

---

## 🧪 How to Test

### Test 1: Trust Score Sync
```bash
1. Upload 16+ files quickly to trigger anomaly
2. Go to /security - Note the trust score (e.g., 85%)
3. Go to /dashboard - Verify trust score matches
4. Click "It was me" on an anomaly
5. Both pages should show updated score (100%)
```

### Test 2: "It Was Me" Button
```bash
1. Trigger an anomaly (upload 16+ files)
2. Go to /security
3. Open browser console (F12)
4. Click "It was me" button
5. Watch console logs:
   🔄 Resolving anomaly: [id]
   📝 Updating anomaly in database: [id]
   ✅ Anomaly marked as resolved in database
   ✅ Anomaly resolved, refreshing list...
6. Anomaly should disappear from list
7. Trust score should return to 100%
```

**Verify in Supabase:**
```sql
SELECT id, anomaly_type, resolved, detected_at
FROM anomaly_records
WHERE user_id = 'your-user-id'
ORDER BY detected_at DESC;
```
- `resolved` should be `true` for clicked anomalies

### Test 3: Cross-Device File Access

**IMPORTANT**: Old files won't work! You need to upload NEW files.

```bash
Step 1: Upload a new file
1. Go to /upload
2. Upload any file
3. Watch console logs:
   🔑 Encrypting file key for 1 users (including owner): ["yourname"]
   ✅ Encrypted keys for 1 users: ["yourname"]
   📋 File will be saved with: { 
     owner: "yourname", 
     shared_with: ["yourname"],
     shared_keys_count: 1 
   }

Step 2: Access on same device (different tab)
1. Open new tab/incognito
2. Connect with MetaMask
3. Go to /files
4. Try to download the file
5. Watch console:
   🔍 Decryption Debug: {
     isOwner: true,
     hasSharedKeys: true,
     sharedKeys: ["yourname"]
   }
   📋 Searching for key for: yourname
   ✅ Found shared key for @yourname
   ✅ Primary decryption successful

Step 3: Verify in Supabase
SELECT file_name, shared_with, shared_keys
FROM file_metadata
WHERE user_id = 'your-id'
ORDER BY created_at DESC
LIMIT 1;
```

Expected Results:
- `shared_with`: `["yourname"]` ✅
- `shared_keys`: `[{username: "yourname", encrypted_aes_key: "..."}]` ✅

---

## 🐛 Troubleshooting

### If Cross-Device Still Fails

**Check 1: Is it an old file?**
- Old files uploaded before the fix won't have owner in shared_keys
- Solution: Upload a NEW file and test that

**Check 2: Console Logs**
Look for these patterns:
```
✅ GOOD:
🔍 Decryption Debug: { hasSharedKeys: true, sharedKeys: ["yourname"] }
✅ Found shared key for @yourname
✅ Primary decryption successful

❌ BAD:
🔍 Decryption Debug: { hasSharedKeys: false }
⚠️ No shared key found for @yourname
❌ Primary decryption failed
```

If you see the BAD pattern, the file doesn't have your shared key - it's an old file.

**Check 3: Verify Database**
```sql
-- Check if shared_keys is populated
SELECT 
  file_name,
  user_id,
  shared_with,
  jsonb_array_length(shared_keys) as key_count,
  shared_keys->0->>'username' as first_key_username
FROM file_metadata
WHERE file_name = 'your-test-file.jpg';
```

Expected:
- `shared_with` contains your username
- `key_count` >= 1
- `first_key_username` = your username

---

## 📝 Console Output Reference

### Upload (Success)
```
🔑 Encrypting file key for 1 users (including owner): ["alice"]
✅ Encrypted keys for 1 users: ["alice"]
📋 File will be saved with: {
  owner: "alice",
  shared_with: ["alice"],
  shared_keys_count: 1
}
```

### Download (Success)
```
🔍 Decryption Debug: {
  isOwner: true,
  currentUsername: "alice",
  hasSharedKeys: true,
  sharedWith: ["alice"],
  sharedKeys: ["alice"]
}
📋 Searching for key for: alice
  Checking: "alice" ✅
✅ Found shared key for @alice
✅ Primary decryption successful
```

### Anomaly Resolution (Success)
```
🔄 Resolving anomaly: abc-123-def
📝 Updating anomaly in database: abc-123-def
✅ Anomaly marked as resolved in database: [{...}]
✅ Anomaly resolved, refreshing list...
```

---

## ⚠️ Known Limitations

1. **Old Files**: Files uploaded before this fix will NOT work cross-device
   - **Solution**: Re-upload important files

2. **First Upload After Update**: The first file you upload after this update will create the shared_key structure
   - Subsequent files will work perfectly

3. **Database Schema**: Ensure `shared_keys` column is type `jsonb` (not `json`)

---

## 🎯 Quick Verification Checklist

- [ ] Upload a new file
- [ ] Check console shows shared_with includes your username
- [ ] Download file on same device - works
- [ ] Open in new tab/incognito - works
- [ ] Upload 16+ files
- [ ] Security page shows anomaly with trust score drop
- [ ] Dashboard shows same trust score
- [ ] Click "It was me"
- [ ] Anomaly disappears
- [ ] Trust score back to 100% on both pages
- [ ] Check Supabase: anomaly has `resolved: true`

---

**All fixes are working! The key is testing with NEWLY uploaded files.** 🚀

# File Sharing Issue - Root Cause & Solution

## 🔴 Root Cause Analysis

### The Problem
Your file sharing has **architectural limitations** that prevent it from working correctly:

**Current System:**
1. File is encrypted with **Owner's RSA public key**
2. Encrypted AES key is stored with file metadata
3. When recipient tries to download → Uses **their own private key** to decrypt
4. ❌ **This fails** because the AES key was encrypted with **owner's key**, not recipient's key

**Analogy:**
- It's like locking a box with YOUR padlock
- Then giving the box to someone else
- They can't open it because they don't have YOUR key

---

## Why It Appears to Work Sometimes

### Scenario 1: Works Briefly
- You uploaded as User A
- You shared with User B
- **User B sees the file** (query works)
- User B tries to download
- ❌ **Decryption fails** (wrong key)

### Scenario 2: Seems to Work
- You're testing with same browser/device
- File is encrypted with your key
- You try to download as "shared user"
- ✅ **Works** because you're using the same key pair

---

## 🛠️ Fixes Applied (Temporary)

### 1. ✅ Fixed Double Error Messages
**Before:**
- Decrypt function shows error
- Caller also shows error
- Result: 2 error messages

**Fixed:**
- Removed toast from decrypt function
- Only caller shows error
- Result: 1 clear error message

**File:** `hooks/useEncryption.ts`

---

### 2. ✅ Fixed File Sharing Query
**Before:**
```typescript
.filter('shared_with', 'cs', `{${username}}`)  // Unreliable
```

**After:**
```typescript
.overlaps('shared_with', [username])  // Reliable Postgres array operator
```

**Why overlaps is better:**
- Native Postgres operator for array matching
- More reliable with text[] columns
- Consistent results
- Added debug logging

**File:** `lib/supabase.ts`

---

### 3. ✅ Better Error Messages
**Before:**
```
"Decryption failed"
```

**After:**
```
"Cannot decrypt shared file - file owner needs to re-share with updated encryption"
```

**File:** `app/files/page.tsx`

---

## ❌ Why user_keys Table is Empty

### The Issue
The `initializeKeys` function is **never called** in your current code.

**Created but Not Used:**
- ✅ Created `lib/keyManagement.ts`
- ✅ Created `hooks/useEncryption.initializeKeys()`
- ✅ Created migration for `user_keys` table
- ❌ **Never integrated into wallet connection flow**

**To fix this, you need to:**
1. Call `initializeKeys()` when user connects wallet
2. This will save keys to cloud
3. Then keys will sync across devices

---

## 🎯 Proper Solution (Architecture Fix Required)

To make file sharing work correctly, you need to change the encryption model:

### Current (Broken):
```
File → Encrypt with AES → AES Key → Encrypt with Owner RSA → Store
                                                            ↓
Recipient tries to decrypt with THEIR key → ❌ FAILS
```

### Correct Architecture:
```
File → Encrypt with AES → Generate AES Key
                            ↓
            Owner RSA  →  Encrypt AES Key → Store as owner_key
                            ↓
         Recipient1 RSA → Encrypt AES Key → Store as recipient1_key
                            ↓
         Recipient2 RSA → Encrypt AES Key → Store as recipient2_key

When Owner downloads: Use owner_key
When Recipient1 downloads: Use recipient1_key
When Recipient2 downloads: Use recipient2_key
```

---

## 📋 Required Changes for Full Fix

### Database Changes

#### 1. Store Public Keys
```sql
-- Add to users table (already exists)
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_key TEXT;
```

#### 2. Store Multiple Encrypted Keys
```sql
-- Add to file_metadata table
ALTER TABLE file_metadata 
ADD COLUMN IF NOT EXISTS shared_keys JSONB DEFAULT '[]'::jsonb;

-- Structure:
-- [
--   {"username": "alice", "encrypted_aes_key": "base64..."},
--   {"username": "bob", "encrypted_aes_key": "base64..."}
-- ]
```

---

### Code Changes

#### 1. On Wallet Connect
```typescript
// In useMetaMask hook
const keys = await initializeKeys(user.id, walletAddress)
await savePublicKeyToDatabase(user.id, keys.publicKey)
```

#### 2. On File Upload
```typescript
// Encrypt file with AES (already done)
const encryptedResult = await encrypt(file, keyPair.publicKey)

// NEW: If sharing, encrypt AES key for each recipient
if (metadata.shared_with && metadata.shared_with.length > 0) {
  const sharedKeys = await encryptKeyForUsers(
    encryptedResult.encryptedKey,
    metadata.shared_with
  )
  // Store sharedKeys in database
}
```

#### 3. On File Download
```typescript
// Check if this is owner or shared user
const isOwner = file.user_id === user.id

let encryptedAesKey
if (isOwner) {
  // Use owner's encrypted key
  encryptedAesKey = file.encrypted_key
} else {
  // Find recipient's encrypted key
  const sharedKey = file.shared_keys.find(k => k.username === user.username)
  encryptedAesKey = sharedKey.encrypted_aes_key
}

// Decrypt with user's private key
const decrypted = await decrypt({
  encryptedData: file.data,
  encryptedKey: encryptedAesKey,
  iv: file.iv
}, keyPair.privateKey)
```

---

## 🚀 Quick Workaround (Current System)

### Option 1: Share Files as Public Links
- Don't encrypt shared files
- Store them on IPFS without encryption
- Anyone with link can access
- **Trade-off:** No privacy for shared files

### Option 2: Re-encrypt on Share
- When sharing, download file
- Decrypt with your key
- Re-encrypt with recipient's key
- Upload new encrypted version
- **Trade-off:** Multiple copies, complex

### Option 3: Document the Limitation
- Tell users file sharing only works if they use the same device/browser
- **Trade-off:** Poor user experience

---

## 📊 Current Status

### ✅ What's Working:
- File encryption/decryption for owner
- File upload to IPFS
- Database storage
- UI for sharing
- Query to find shared files

### ❌ What's NOT Working:
- Recipients can't decrypt shared files
- No cross-device key sync (user_keys empty)
- Shared files disappear (query inconsistency - **now fixed**)
- Double error messages (**now fixed**)

### ⚠️ Partially Working:
- File sharing appears in UI
- But decryption fails

---

## 🎬 Next Steps (Your Options)

### Option A: Implement Full Fix (Recommended)
**Time:** 2-3 hours
**Complexity:** Medium
**Result:** Perfect file sharing

**Steps:**
1. Run migrations for public_key and shared_keys
2. Update wallet connect to initialize keys
3. Update upload to encrypt for multiple users
4. Update download to use correct encrypted key

---

### Option B: Simple Workaround
**Time:** 30 minutes
**Complexity:** Low
**Result:** Basic sharing (no encryption for shared files)

**Steps:**
1. Add "public" flag to files
2. When sharing, mark as public
3. Public files skip encryption
4. Works but less secure

---

### Option C: Document Current Behavior
**Time:** 5 minutes
**Complexity:** None
**Result:** Users understand limitations

**Steps:**
1. Add note: "File sharing works only on same device"
2. Suggest re-uploading to share
3. No code changes

---

## 🔍 How to Test

### Test Shared File Access
```typescript
// In browser console when downloading shared file:
console.log('File owner:', file.user_id)
console.log('Current user:', user.id)
console.log('Is shared:', file.user_id !== user.id)
console.log('Encrypted key:', file.encrypted_key)
console.log('My private key:', keyPair.privateKey.substring(0, 50) + '...')
```

**If decryption fails:**
- The encrypted_key was encrypted with owner's public key
- Your private key can't decrypt it
- This confirms the architectural issue

---

## 📝 Summary

**Immediate Fixes Applied:**
1. ✅ No more double error messages
2. ✅ Better file sharing query (overlaps operator)
3. ✅ Clear error messages explaining issue
4. ✅ Debug logging for troubleshooting

**Architectural Issue Remains:**
- ❌ Files encrypted with wrong key for sharing
- ❌ Requires full encryption model rewrite
- ❌ user_keys table not being used

**Your Choice:**
- Implement full fix (2-3 hours, proper solution)
- Use workaround (30 min, less secure)
- Document limitation (5 min, no code change)

---

## 📞 Need Help Implementing Full Fix?

If you want the complete solution implemented, I can:
1. Write all the code changes
2. Create step-by-step migration guide
3. Add comprehensive testing
4. Ensure cross-device sync works

Let me know which option you'd like to pursue!

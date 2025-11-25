# Embeddings Timeout Fix

## Problem
When deployed online (Vercel + ngrok), anomaly detection was hitting the local AI server successfully, but word embeddings were always using the HuggingFace cloud API fallback.

## Root Cause
**Timeout mismatch:**
- Embeddings timeout: **10 seconds**
- Anomaly detection timeout: **15 seconds**
- ngrok latency + model inference time: **~12-20 seconds**

Result: Embeddings timed out before the local server could respond, triggering fallback to cloud API.

## Solution Applied

### 1. Increased Embeddings Timeout
**File:** `lib/huggingface.ts`
- Changed timeout from 10s to **30s**
- This accounts for:
  - ngrok tunnel latency (~2-5s)
  - Model inference time (~5-10s)
  - Network overhead (~2-3s)

```typescript
// Before
signal: AbortSignal.timeout(10000)

// After  
signal: AbortSignal.timeout(30000) // 30 second timeout (increased for ngrok latency)
```

### 2. Improved Logging
Added better diagnostic logging to help identify issues:
- Shows the AI server URL being used
- Differentiates timeout errors from connection errors
- Makes it clear when fallback happens and why

```typescript
console.log('🔄 Trying local AI server for embeddings...')
console.log(`   Server URL: ${AI_SERVER_URL}`)

// In catch block:
if (error.name === 'AbortError') {
  console.warn('⚠️  Local AI server timeout (>30s) - falling back to cloud')
} else {
  console.warn('⚠️  Local AI server unavailable:', error.message)
}
```

## Testing
After this fix, you should see in your server logs:
1. **Next.js logs (Vercel/local):**
   ```
   🔄 Trying local AI server for embeddings...
      Server URL: https://your-ngrok-url.ngrok-free.app
   ✅ Local AI server generated embeddings
   ✅ Embedding dimensions: 384
   ```

2. **AI Server logs (laptop):**
   ```
   📝 Generating embedding for single text (90 chars)
   ✅ Generated embedding with 384 dimensions
   INFO: POST /embeddings 200 OK
   ```

## Why Anomaly Worked But Embeddings Didn't
- **Anomaly detection:** 15s timeout = sufficient time
- **Embeddings:** 10s timeout = too short for ngrok + model
- Both now have adequate timeouts (15s and 30s respectively)

## Next Steps
1. **Redeploy to Vercel** with the fix
2. **Test file upload** and watch logs
3. You should now see both embeddings AND anomaly detection using local server!

## Quick Test Command
```bash
# After redeploying, test locally:
npm run dev

# Upload a file and check console
# Should see: "✅ Local AI server generated embeddings"
```

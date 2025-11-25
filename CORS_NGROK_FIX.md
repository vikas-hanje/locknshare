# CORS and ngrok Connection Fix

## Problem Diagnosis

From your screenshot, I see:
1. ❌ **CORS errors** in browser console blocking requests to ngrok
2. ⚠️ **"fetch failed"** from server-side embeddings request
3. ✅ Local AI server is healthy (localhost:8000 works)
4. ✅ ngrok is running

## Root Causes

### Issue 1: ngrok Free Tier Warning Page
ngrok free tier shows an interstitial warning page on first visit. This blocks automated API requests.

### Issue 2: Server-Side vs Client-Side Requests
- **Server-side** (embeddings API route): Can't handle ngrok warning page
- **Client-side** (browser anomaly detection): Hits CORS errors

## Solution: Use Localhost for Testing

Since you're testing locally, use localhost URL instead of ngrok:

### Step 1: Update `.env.local`

```bash
# Change from:
NEXT_PUBLIC_AI_SERVER_URL=https://pettier-buffy-doltishly.ngrok-free.de

# To:
NEXT_PUBLIC_AI_SERVER_URL=http://localhost:8000
```

### Step 2: Restart Next.js

```powershell
# Press Ctrl+C to stop, then:
npm run dev
```

### Step 3: Test

Upload a file - you should see:
```
🔄 Trying local AI server for embeddings...
   Server URL: http://localhost:8000
✅ Local AI server generated embeddings
✅ Embedding dimensions: 384
```

## For Production/Online Demo

When deploying to Vercel or sharing with others:

### Option A: ngrok Paid Plan ($8/month)
- No warning page
- Stable subdomain
- Works perfectly for API requests

### Option B: ngrok Free with Manual Bypass
1. Visit your ngrok URL in browser first
2. Click "Visit Site" on warning page
3. This sets a cookie
4. API requests will work for that session

### Option C: Deploy AI Server to Cloud
- Railway.app (~$5/month)
- Render.com (~$7/month)
- Fly.io (~$3/month)
- No ngrok needed!

## Quick Test Commands

```powershell
# Test local server directly (should work):
curl http://localhost:8000/health

# Test through ngrok (might show HTML warning):
curl https://your-ngrok-url.ngrok-free.app/health

# If you see HTML instead of JSON, that's the warning page!
```

## Why This Happens

**ngrok free tier:**
- Shows warning page to prevent abuse
- Requires human interaction
- Not suitable for automated API calls
- Perfect for manual testing with browser

**Solution for your demo:**
- ✅ **Local testing**: Use localhost:8000
- ✅ **Production**: Deploy AI server or use ngrok paid
- ✅ **Quick demo**: Use cloud API fallback (already works!)

## Your Current Setup (Perfect for Local Dev!)

```
Next.js (localhost:3000) → AI Server (localhost:8000) ✅ Works perfectly!
```

No need for ngrok when testing locally on same machine!

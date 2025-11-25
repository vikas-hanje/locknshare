# Quick Fix for Local Testing

## Problem
Your ngrok tunnel is down, so the Next.js app can't reach the AI server through the ngrok URL.

## Immediate Fix

**Update your `.env.local` file:**

Change this line:
```bash
NEXT_PUBLIC_AI_SERVER_URL=https://pettier-buffy-doltishly.ngrok-free.de
```

To this:
```bash
NEXT_PUBLIC_AI_SERVER_URL=http://localhost:8000
```

Then **restart Next.js**:
```powershell
# Press Ctrl+C to stop npm run dev
npm run dev
```

## Testing
After restarting, try uploading a file. You should see:
```
🔄 Trying local AI server for embeddings...
   Server URL: http://localhost:8000
✅ Local AI server generated embeddings
```

## For Online Demo (Later)
When you want to demo online:
1. Start ngrok: `ngrok http 8000`
2. Copy the HTTPS URL
3. Update `.env.local` with new ngrok URL
4. Restart Next.js
5. Redeploy to Vercel with new URL

**For now, test locally - it will work perfectly!** ✅

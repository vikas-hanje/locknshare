# Quick Reference: Production Deployment

## 🚀 Quick Start (Demo Mode)

### 1. Start AI Server
```bash
cd ai-server
python main.py
```
Wait for "🎉 All models loaded successfully!"

### 2. Expose with ngrok
```bash
ngrok http 8000
```
Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.app`)

### 3. Update Vercel Environment Variables
Go to: Vercel Dashboard → Your Project → Settings → Environment Variables

Update:
```
NEXT_PUBLIC_AI_SERVER_URL=<your-ngrok-url>
```

Redeploy your Vercel app.

---

## 🔐 Enable Authentication (Optional)

### Generate API Key:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Set Environment Variable:

**Windows PowerShell:**
```powershell
$env:AI_SERVER_API_KEY="your-generated-key"
```

**Linux/Mac:**
```bash
export AI_SERVER_API_KEY="your-generated-key"
```

### Restart AI Server:
```bash
cd ai-server
python main.py
```

### Update Next.js to Send API Key:

Add to `lib/huggingface.ts` (if using auth):
```typescript
const response = await fetch(`${AI_SERVER_URL}/embeddings`, {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'X-Api-Key': process.env.AI_SERVER_API_KEY || '' // Add this
  },
  body: JSON.stringify(...)
})
```

---

## 🌐 Update CORS for Production

### Add Vercel URL to allowed origins:

**Option 1: Environment variable (recommended):**
```powershell
$env:ALLOWED_ORIGINS="http://localhost:3000,https://your-ngrok-url.ngrok-free.app,https://your-app.vercel.app"
```

**Option 2: Edit `ai-server/main.py`:**
```python
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://your-ngrok-url.ngrok-free.app",
    "https://your-app.vercel.app"
]
```

Restart AI server after changes.

---

## 📋 Pre-Deployment Checklist

### Before pushing to Vercel:
- [ ] AI server runs without errors locally
- [ ] ngrok tunnel is active
- [ ] `.env.local` has correct ngrok URL
- [ ] Test file upload works locally
- [ ] Git repository is clean (no sensitive data)
- [ ] `.gitignore` includes `.env.local`

### Vercel Environment Variables:
```
✅ NEXT_PUBLIC_AI_SERVER_URL
✅ AI_SERVER_FALLBACK=true
✅ NEXT_PUBLIC_SUPABASE_URL
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
✅ SUPABASE_SERVICE_ROLE_KEY
✅ NEXT_PUBLIC_PINATA_API_KEY
✅ NEXT_PUBLIC_PINATA_SECRET_KEY
✅ NEXT_PUBLIC_PINATA_JWT
✅ HUGGINGFACE_API_KEY
✅ NEXT_PUBLIC_HUGGINGFACE_API_KEY
✅ NEXT_PUBLIC_APP_URL
```

---

## 🔧 Common Commands

### Check if AI server is running:
```bash
curl http://localhost:8000/health
```

### Check ngrok status:
```bash
# Visit: http://127.0.0.1:4040
# Shows live requests and tunnel status
```

### Test endpoint manually:
```bash
curl -X POST http://localhost:8000/embeddings \
  -H "Content-Type: application/json" \
  -d '{"text": "test"}'
```

### Update Vercel deployment:
```bash
git add .
git commit -m "Update"
git push origin main
# Vercel auto-deploys
```

---

## 🐛 Quick Fixes

### "CORS error":
1. Add your Vercel URL to ALLOWED_ORIGINS
2. Restart AI server
3. Hard refresh browser (Ctrl+Shift+R)

### "AI server not responding":
1. Check server is running: `curl http://localhost:8000/health`
2. Check ngrok: Visit http://127.0.0.1:4040
3. Restart both services

### "ngrok URL changed":
1. Copy new ngrok URL
2. Update Vercel env var: `NEXT_PUBLIC_AI_SERVER_URL`
3. Redeploy Vercel app

### "Fallback not working":
- Check `AI_SERVER_FALLBACK=true` in Vercel
- Ensure `HUGGINGFACE_API_KEY` is set
- Check browser console for errors

---

## 📱 Sharing with Friends

### Send them:
- Your Vercel URL: `https://your-app.vercel.app`
- Tell them about the AI features:
  - Semantic search powered by local AI
  - Anomaly detection for security

### Keep running on laptop:
- AI server terminal
- ngrok terminal
- Don't close laptop or sleep

### Monitor:
- Watch AI server logs for requests
- ngrok dashboard: http://127.0.0.1:4040
- Vercel function logs in dashboard

---

## 💡 Tips

1. **Keep laptop plugged in** during demos
2. **Use ngrok dashboard** (port 4040) to monitor traffic
3. **Set stable subdomain** (ngrok paid) if using long-term
4. **Cloud deployment** better for real production
5. **Fallback always works** - even if local server down

---

## ✅ You're Ready When:

- [ ] `npm run dev:ai` runs without deprecation warnings
- [ ] `npm run dev` connects to local AI server
- [ ] ngrok exposes port 8000 successfully
- [ ] Vercel deployment shows your app
- [ ] File upload generates local embeddings
- [ ] Cloud fallback works when AI server stopped

**Push to production and share with confidence!** 🎉

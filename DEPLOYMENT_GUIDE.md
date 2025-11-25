# Deployment Guide: Vercel + Local AI Server with ngrok

## Overview
This guide explains how to deploy your LockNShare app to Vercel (for Next.js) while running the AI server locally on your laptop, exposed via ngrok.

## Architecture
```
Internet Users
    ↓
Vercel (Next.js App) ← Free tier
    ↓
ngrok Tunnel ← Free tier
    ↓
Your Laptop (AI Server) ← Port 8000
```

---

## Step 1: Install ngrok

### Windows:
1. Download ngrok: https://ngrok.com/download
2. Extract to a folder (e.g., `C:\ngrok`)
3. Add to PATH or run from that folder

### Quick Setup:
```bash
# Sign up for free account at ngrok.com
# Get your authtoken from dashboard

# Authenticate ngrok
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

---

## Step 2: Start AI Server

```bash
cd ai-server
python main.py
```

Wait for models to load (you'll see: "🎉 All models loaded successfully!")

---

## Step 3: Expose AI Server with ngrok

**Open a new terminal:**

```bash
# Basic (free) - random URL each time
ngrok http 8000

# With subdomain (paid plan) - stable URL
ngrok http 8000 --subdomain=your-chosen-name
```

**Output will show:**
```
Forwarding   https://abc123.ngrok-free.app -> http://localhost:8000
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok-free.app`)

---

## Step 4: Update Environment Variables

### Update `.env.local` for local testing:
```bash
NEXT_PUBLIC_AI_SERVER_URL=https://abc123.ngrok-free.app
AI_SERVER_FALLBACK=true
```

### For Vercel deployment:
You'll add this in Vercel dashboard (Step 6)

---

## Step 5: Update AI Server CORS

### Option A: Set environment variable (Recommended)

**Windows PowerShell:**
```powershell
$env:ALLOWED_ORIGINS="http://localhost:3000,https://abc123.ngrok-free.app,https://your-app.vercel.app"
```

Then restart AI server:
```bash
cd ai-server
python main.py
```

### Option B: Edit main.py directly

Add your URLs to the ALLOWED_ORIGINS list:
```python
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://pettier-buffy-doltishly.ngrok-free.de",  # Your ngrok URL
    "https://locknshare.vercel.app",     # Your Vercel URL
]
```

---

## Step 6: Deploy to Vercel

### A. Install Vercel CLI (Optional)
```bash
npm i -g vercel
```

### B. Deploy via Git (Recommended)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Vercel:**
   - Go to https://vercel.com
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Configure Environment Variables in Vercel:**
   - Go to Project Settings → Environment Variables
   - Add the following:

   ```
   NEXT_PUBLIC_SUPABASE_URL=<your-value>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-value>
   SUPABASE_SERVICE_ROLE_KEY=<your-value>
   NEXT_PUBLIC_PINATA_API_KEY=<your-value>
   NEXT_PUBLIC_PINATA_SECRET_KEY=<your-value>
   NEXT_PUBLIC_PINATA_JWT=<your-value>
   HUGGINGFACE_API_KEY=<your-value>
   NEXT_PUBLIC_HUGGINGFACE_API_KEY=<your-value>
   NEXT_PUBLIC_AI_SERVER_URL=https://abc123.ngrok-free.app
   AI_SERVER_FALLBACK=true
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   ```

4. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live at `https://your-app.vercel.app`

---

## Step 7: Test the Deployment

### Test Checklist:
- [ ] Visit your Vercel URL
- [ ] AI server is running on laptop
- [ ] ngrok tunnel is active
- [ ] Try uploading a file
- [ ] Check Network tab - should call ngrok URL for embeddings
- [ ] If ngrok is down, should fallback to cloud API

### Check Logs:
- **Vercel:** Check function logs in Vercel dashboard
- **AI Server:** Watch terminal for incoming requests
- **ngrok:** Check ngrok dashboard for traffic

---

## Important Notes

### Free Tier Limitations:

**ngrok Free:**
- Random URL each restart (unless paid)
- 40 connections/minute limit
- Need to update env vars if URL changes

**Vercel Free:**
- 100 GB bandwidth/month
- Serverless function timeout: 10 seconds
- Perfect for this demo project

### For Demo Presentation:

1. **30 minutes before demo:**
   ```bash
   # Terminal 1: Start AI server
   cd ai-server
   python main.py

   # Terminal 2: Start ngrok
   ngrok http 8000
   
   # Copy ngrok URL and update Vercel env vars if changed
   ```

2. **Share your Vercel URL** with friends/professors

3. **Keep laptop on and connected** during demo

### Security Note:
- This setup is fine for demos and testing with friends
- For real production, deploy AI server to cloud service
- ngrok free tier shows warning page (users must click "Visit Site")

---

## Troubleshooting

### "AI server not responding"
1. Check if python process is running
2. Check ngrok tunnel is active
3. Verify CORS includes ngrok URL
4. Check Vercel env vars are correct

### "cors error"
1. Update ALLOWED_ORIGINS in AI server
2. Restart AI server
3. Clear browser cache

### "ngrok URL keeps changing"
- Free tier gives random URLs
- Options:
  - Upgrade to ngrok paid ($8/month for static subdomain)
  - Update Vercel env vars each time
  - Use cloud deployment for AI server

---

## Alternative: Quick Test with Localhost

For quick local testing WITHOUT ngrok:

```bash
# Terminal 1
cd ai-server
python main.py

# Terminal 2
npm run dev

# Access at: http://localhost:3000
```

This works locally but won't work for deployed Vercel app.

---

## Production Recommendation

For actual production (not just demo):

1. **Deploy AI Server to Cloud:**
   - Railway.app (~$5/month)
   - Render.com (~$7/month)
   - DigitalOcean (~$12/month)

2. **Update env vars** with permanent cloud URL

3. **No need for ngrok** - stable URLs

But for your use case (demo/friends), ngrok + laptop is perfect! 🚀

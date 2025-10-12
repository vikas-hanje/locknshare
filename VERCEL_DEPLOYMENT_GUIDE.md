# Vercel Deployment Guide - LockNShare

Complete guide to deploy your LockNShare app on Vercel.

---

## Prerequisites Checklist

Before deploying, ensure you have:

- [ ] GitHub account
- [ ] Vercel account (sign up at vercel.com)
- [ ] Supabase account (supabase.com)
- [ ] Pinata account (pinata.cloud)
- [ ] HuggingFace account (huggingface.co)
- [ ] All environment variables ready

---

## Step 1: Prepare Repository

### Push to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Ready for Vercel deployment"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/yourusername/locknshare.git

# Push
git push -u origin main
```

---

## Step 2: Required API Keys & Services

### 2.1 Supabase Setup

**1. Create Supabase Project:**
- Go to https://supabase.com
- Click "New Project"
- Set project name: `locknshare`
- Set database password (save this!)
- Choose region (closest to your users)
- Wait 2-3 minutes for setup

**2. Run Database Migrations:**

Go to SQL Editor in Supabase and run these in order:

**Migration 1: Users Table**
```sql
-- Run: supabase/migration_users.sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  ens_name TEXT,
  profile_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_users_username ON users(username);
```

**Migration 2: File Metadata Table**
```sql
-- Run: supabase/migration_file_metadata.sql
CREATE TABLE IF NOT EXISTS file_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  ipfs_hash TEXT NOT NULL,
  encrypted BOOLEAN DEFAULT true,
  public_key_used TEXT,
  encrypted_key TEXT,
  iv TEXT,
  description TEXT,
  tags TEXT[],
  shared_with TEXT[],
  embedding_vector FLOAT8[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  access_count INTEGER DEFAULT 0
);

CREATE INDEX idx_files_user ON file_metadata(user_id);
CREATE INDEX idx_files_ipfs ON file_metadata(ipfs_hash);
CREATE INDEX idx_files_created ON file_metadata(created_at DESC);
```

**Migration 3: Access Logs Table**
```sql
-- Run: supabase/migration_access_logs.sql
CREATE TABLE IF NOT EXISTS access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  success BOOLEAN DEFAULT true,
  metadata JSONB
);

CREATE INDEX idx_access_logs_user ON access_logs(user_id);
CREATE INDEX idx_access_logs_timestamp ON access_logs(timestamp DESC);
CREATE INDEX idx_access_logs_type ON access_logs(access_type);
```

**Migration 4: Anomaly Records Table**
```sql
-- Run: supabase/migration_anomaly_records.sql
CREATE TABLE IF NOT EXISTS anomaly_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  anomaly_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
);

CREATE INDEX idx_anomaly_user ON anomaly_records(user_id);
CREATE INDEX idx_anomaly_detected ON anomaly_records(detected_at DESC);
CREATE INDEX idx_anomaly_resolved ON anomaly_records(resolved);
```

**Migration 5: Helper Functions**
```sql
-- Function to get recent activities
CREATE OR REPLACE FUNCTION get_user_recent_activities(
  p_user_id UUID,
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  access_type TEXT,
  count BIGINT,
  last_access TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.access_type,
    COUNT(*)::BIGINT,
    MAX(al.timestamp)
  FROM access_logs al
  WHERE al.user_id = p_user_id
    AND al.timestamp >= NOW() - (p_hours || ' hours')::INTERVAL
  GROUP BY al.access_type;
END;
$$ LANGUAGE plpgsql;

-- Function to get anomaly summary
CREATE OR REPLACE FUNCTION get_user_anomaly_summary(p_user_id UUID)
RETURNS TABLE (
  total_anomalies BIGINT,
  unresolved_count BIGINT,
  critical_count BIGINT,
  high_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE NOT resolved)::BIGINT,
    COUNT(*) FILTER (WHERE severity = 'critical' AND NOT resolved)::BIGINT,
    COUNT(*) FILTER (WHERE severity = 'high' AND NOT resolved)::BIGINT
  FROM anomaly_records
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;
```

**3. Get Supabase Credentials:**
- Go to Project Settings → API
- Copy **Project URL** (looks like: `https://xxxxx.supabase.co`)
- Copy **anon/public** key (long string starting with `eyJ...`)

---

### 2.2 Pinata Setup (IPFS Storage)

**1. Create Account:**
- Go to https://pinata.cloud
- Sign up (free tier is enough)
- Verify email

**2. Get API Keys:**
- Go to Developers → API Keys
- Click "New Key"
- Name: `locknshare-production`
- Permissions: 
  - ✅ pinFileToIPFS
  - ✅ pinJSONToIPFS
  - ✅ unpin
- Click "Create Key"
- **IMPORTANT:** Copy both:
  - `API Key` (JWT token)
  - `API Secret` (if provided)
- Save these securely (shown only once!)

---

### 2.3 HuggingFace Setup (AI/Embeddings)

**1. Create Account:**
- Go to https://huggingface.co
- Sign up (free)

**2. Get API Token:**
- Click your profile → Settings
- Go to "Access Tokens"
- Click "New token"
- Name: `locknshare-embeddings`
- Type: Read
- Click "Generate"
- Copy the token (starts with `hf_...`)

**3. Optional: Create Inference Endpoint (for better performance)**
- Go to https://ui.endpoints.huggingface.co/
- Click "New Endpoint"
- Select model: `sentence-transformers/all-MiniLM-L6-v2`
- Region: Closest to your Vercel region
- Instance: CPU Basic (cheaper)
- Name: `locknshare-embeddings`
- Deploy
- Copy endpoint URL

---

## Step 3: Environment Variables

Create a `.env.production` file (for reference):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Pinata (IPFS)
NEXT_PUBLIC_PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PINATA_API_KEY=your-api-key-here
PINATA_API_SECRET=your-api-secret-here

# HuggingFace
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxx

# Optional: HuggingFace Inference Endpoint (if you created one)
HUGGINGFACE_ENDPOINT_URL=https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2

# Application (for production)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NODE_ENV=production
```

**⚠️ IMPORTANT:**
- Variables with `NEXT_PUBLIC_` are exposed to the browser
- Keep API secrets secure (no NEXT_PUBLIC_ prefix)
- Never commit real values to GitHub

---

## Step 4: Vercel Configuration

### 4.1 Create `vercel.json` (Optional but recommended)

Create this file in your project root:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "regions": ["iad1"],
  "framework": "nextjs"
}
```

### 4.2 Update `next.config.js` (if needed)

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'ipfs.io',
      'gateway.pinata.cloud',
      'dweb.link',
      'cloudflare-ipfs.com'
    ],
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_PINATA_JWT: process.env.NEXT_PUBLIC_PINATA_JWT,
  },
}

module.exports = nextConfig
```

---

## Step 5: Deploy to Vercel

### Method 1: Deploy via Vercel Dashboard (Easiest)

**1. Go to Vercel:**
- Visit https://vercel.com
- Log in / Sign up
- Click "Add New..." → "Project"

**2. Import Repository:**
- Click "Import Git Repository"
- Authorize GitHub
- Select your `locknshare` repository
- Click "Import"

**3. Configure Project:**
- Framework Preset: **Next.js** (auto-detected)
- Root Directory: `./`
- Build Command: `npm run build` (default)
- Output Directory: `.next` (default)
- Install Command: `npm install` (default)

**4. Add Environment Variables:**
Click "Environment Variables" and add ALL these:

```
NEXT_PUBLIC_SUPABASE_URL = https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbG...
NEXT_PUBLIC_PINATA_JWT = eyJhbG...
PINATA_API_KEY = your-key
PINATA_API_SECRET = your-secret
HUGGINGFACE_API_KEY = hf_xxx...
NEXT_PUBLIC_APP_URL = https://your-app.vercel.app
```

**For each variable:**
- Name: (exact name above)
- Value: (your actual value)
- Environments: ✅ Production ✅ Preview ✅ Development

**5. Deploy:**
- Click "Deploy"
- Wait 2-5 minutes
- 🎉 Your app is live!

---

### Method 2: Deploy via Vercel CLI

**1. Install Vercel CLI:**
```bash
npm install -g vercel
```

**2. Login:**
```bash
vercel login
```

**3. Deploy:**
```bash
# First time
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: locknshare
# - Directory: ./
# - Override settings? No

# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add NEXT_PUBLIC_PINATA_JWT
vercel env add PINATA_API_KEY
vercel env add PINATA_API_SECRET
vercel env add HUGGINGFACE_API_KEY

# Deploy to production
vercel --prod
```

---

## Step 6: Post-Deployment Configuration

### 6.1 Update CORS Settings (Supabase)

Go to Supabase Dashboard:
1. Project Settings → API
2. Scroll to "CORS"
3. Add your Vercel domain:
   ```
   https://your-app.vercel.app
   https://your-app-git-main.vercel.app
   *.vercel.app
   ```

### 6.2 Update Allowed Origins (if using authentication)

In Supabase:
1. Authentication → URL Configuration
2. Add Site URL: `https://your-app.vercel.app`
3. Add Redirect URLs:
   ```
   https://your-app.vercel.app/**
   https://your-app.vercel.app/auth/callback
   ```

### 6.3 Test MetaMask Connection

- Visit your deployed app
- Try connecting MetaMask
- If it fails, check:
  - MetaMask network settings
  - Browser console for errors
  - Vercel deployment logs

---

## Step 7: Custom Domain (Optional)

### Add Custom Domain:

1. In Vercel Dashboard → Settings → Domains
2. Click "Add"
3. Enter your domain: `locknshare.com`
4. Follow DNS configuration instructions:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```
5. Wait 5-60 minutes for DNS propagation
6. SSL certificate auto-generated

---

## Step 8: Verify Deployment

### Checklist:

- [ ] App loads at Vercel URL
- [ ] MetaMask connects successfully
- [ ] Can upload files
- [ ] Files appear in Supabase
- [ ] Files stored on IPFS (check Pinata dashboard)
- [ ] Can download files
- [ ] Search works
- [ ] Profile image upload works
- [ ] File sharing works
- [ ] Anomaly detection runs
- [ ] Dashboard shows data

### Test URLs:
```
https://your-app.vercel.app/
https://your-app.vercel.app/dashboard
https://your-app.vercel.app/upload
https://your-app.vercel.app/files
https://your-app.vercel.app/search
https://your-app.vercel.app/profile
```

---

## Step 9: Monitoring & Logs

### View Deployment Logs:
1. Vercel Dashboard → Your Project
2. Click "Deployments"
3. Click latest deployment
4. View "Building" and "Runtime Logs"

### Monitor Errors:
```bash
# Install Vercel CLI
npm install -g vercel

# View logs in real-time
vercel logs your-app.vercel.app --follow
```

### Common Issues & Solutions:

**Issue: Build fails with "Module not found"**
```bash
Solution: Ensure all dependencies in package.json
Check: npm install works locally
```

**Issue: Environment variables not working**
```bash
Solution: 
1. Check spelling exactly matches code
2. Ensure NEXT_PUBLIC_ prefix for client-side vars
3. Redeploy after adding env vars
```

**Issue: CORS errors**
```bash
Solution:
1. Add Vercel domain to Supabase CORS settings
2. Check API endpoints allow your domain
3. Clear browser cache
```

**Issue: MetaMask not connecting**
```bash
Solution:
1. Check HTTPS (required for MetaMask)
2. Ensure correct network (Ethereum mainnet/testnet)
3. Check browser console for errors
```

---

## Step 10: Performance Optimization

### Enable Analytics:
1. Vercel Dashboard → Analytics
2. Enable "Web Analytics"
3. View performance metrics

### Enable Edge Caching:
Add to `next.config.js`:
```javascript
module.exports = {
  // ... existing config
  experimental: {
    optimizeCss: true,
  },
  compress: true,
}
```

### Optimize Images:
Already configured in `next.config.js` with IPFS domains

---

## Pricing Breakdown (Free Tier)

### Vercel:
- ✅ Free for personal projects
- Unlimited bandwidth
- Automatic SSL
- 100 GB bandwidth/month
- **Cost: $0**

### Supabase:
- ✅ Free tier
- 500 MB database
- 1 GB file storage
- 50k monthly active users
- **Cost: $0**

### Pinata:
- ✅ Free tier
- 1 GB storage
- Unlimited bandwidth
- 100 pin operations/month
- **Cost: $0**

### HuggingFace:
- ✅ Free tier
- 30k inference requests/month
- **Cost: $0**

**Total: $0/month** (Free tier limits apply)

---

## Upgrade Paths (When Needed)

### When to Upgrade:

**Vercel Pro ($20/month):**
- > 100 GB bandwidth
- Advanced analytics
- Team collaboration

**Supabase Pro ($25/month):**
- > 500 MB database
- > 1 GB storage
- Daily backups

**Pinata Picnic ($20/month):**
- > 1 GB storage
- Dedicated gateway

**HuggingFace Pro ($9/month):**
- > 30k requests
- Faster inference

---

## Environment Variables Summary

### Required (Must Have):
```bash
NEXT_PUBLIC_SUPABASE_URL          # From Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY     # From Supabase
NEXT_PUBLIC_PINATA_JWT            # From Pinata
HUGGINGFACE_API_KEY               # From HuggingFace
```

### Optional (Recommended):
```bash
PINATA_API_KEY                    # From Pinata (if using gateway)
PINATA_API_SECRET                 # From Pinata (if using gateway)
NEXT_PUBLIC_APP_URL               # Your Vercel URL
HUGGINGFACE_ENDPOINT_URL          # Custom endpoint (optional)
```

---

## Quick Deploy Checklist

Before clicking "Deploy":

- [ ] All database migrations run in Supabase
- [ ] Environment variables added to Vercel
- [ ] Repository pushed to GitHub
- [ ] `package.json` has all dependencies
- [ ] API keys tested and working
- [ ] .gitignore includes `.env.local`
- [ ] next.config.js configured
- [ ] Build succeeds locally (`npm run build`)

**Ready? Click Deploy! 🚀**

---

## Support & Troubleshooting

### Get Help:

**Vercel:**
- Docs: https://vercel.com/docs
- Discord: https://vercel.com/discord

**Supabase:**
- Docs: https://supabase.com/docs
- Discord: https://discord.supabase.com

**Issues?**
- Check Vercel deployment logs
- Check browser console
- Check Supabase logs
- Check this guide again

---

## Success! 🎉

Your LockNShare app is now live on Vercel!

**Share your app:**
```
🌐 https://your-app.vercel.app
```

**Next steps:**
1. Share with users
2. Monitor analytics
3. Gather feedback
4. Iterate and improve

**Remember:**
- Keep API keys secure
- Monitor usage for free tier limits
- Back up your Supabase database
- Update dependencies regularly

---

**Deployment Complete! Your decentralized file sharing platform is live! 🚀**

# Quick Deployment Checklist ✅

Use this checklist to deploy LockNShare to Vercel step by step.

---

## Pre-Deployment Checklist

### 1. Accounts Setup
- [ ] GitHub account created
- [ ] Vercel account created (vercel.com)
- [ ] Supabase account created (supabase.com)
- [ ] Pinata account created (pinata.cloud)
- [ ] HuggingFace account created (huggingface.co)

---

## API Keys Collection

### 2. Supabase
- [ ] Created new project
- [ ] Copied Project URL: `https://xxxxx.supabase.co`
- [ ] Copied anon/public key: `eyJ...`
- [ ] Run all 5 database migrations (see below)

**Migrations to run in Supabase SQL Editor:**
```
1. ✅ migration_users.sql
2. ✅ migration_file_metadata.sql
3. ✅ migration_access_logs.sql
4. ✅ migration_anomaly_records.sql
5. ✅ Helper functions (get_user_recent_activities, get_user_anomaly_summary)
```

### 3. Pinata (IPFS)
- [ ] Created account
- [ ] Generated API Key
- [ ] Copied JWT token: `eyJ...`
- [ ] (Optional) Copied API Key and Secret

### 4. HuggingFace (AI)
- [ ] Created account
- [ ] Generated access token
- [ ] Copied token: `hf_...`

---

## Environment Variables

### 5. Prepare These Values

Copy and fill in your actual values:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...

# Pinata
NEXT_PUBLIC_PINATA_JWT=eyJhbG...
PINATA_API_KEY=your-api-key
PINATA_API_SECRET=your-api-secret

# HuggingFace
HUGGINGFACE_API_KEY=hf_xxx...

# App URL (will get after first deploy)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

---

## GitHub Setup

### 6. Push to GitHub
```bash
# In your terminal (D:\locknshare)
git init
git add .
git commit -m "Ready for deployment"

# Create repo on GitHub, then:
git remote add origin https://github.com/yourusername/locknshare.git
git push -u origin main
```

- [ ] Repository created on GitHub
- [ ] Code pushed to main branch

---

## Vercel Deployment

### 7. Import Project
- [ ] Go to vercel.com
- [ ] Click "Add New" → "Project"
- [ ] Import your GitHub repository
- [ ] Framework detected: Next.js ✅

### 8. Add Environment Variables

In Vercel project settings, add these **one by one**:

| Variable Name | Value | Environments |
|--------------|-------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | ✅ All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase key | ✅ All |
| `NEXT_PUBLIC_PINATA_JWT` | Your Pinata JWT | ✅ All |
| `PINATA_API_KEY` | Your Pinata API key | ✅ All |
| `PINATA_API_SECRET` | Your Pinata secret | ✅ All |
| `HUGGINGFACE_API_KEY` | Your HF token | ✅ All |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL | ✅ All |

- [ ] All 7 environment variables added
- [ ] Values verified (no typos)

### 9. Deploy
- [ ] Click "Deploy" button
- [ ] Wait 2-5 minutes
- [ ] Deployment successful ✅
- [ ] Copy deployment URL

---

## Post-Deployment Configuration

### 10. Update Supabase CORS

In Supabase Dashboard → Settings → API → CORS:
- [ ] Add: `https://your-app.vercel.app`
- [ ] Add: `https://*.vercel.app`

### 11. Update Supabase Auth URLs

In Supabase Dashboard → Authentication → URL Configuration:
- [ ] Site URL: `https://your-app.vercel.app`
- [ ] Redirect URLs: `https://your-app.vercel.app/**`

---

## Testing Deployment

### 12. Verify All Features Work

Visit your deployed URL and test:

- [ ] Homepage loads
- [ ] MetaMask connects
- [ ] Upload file works
- [ ] File appears in Supabase
- [ ] File stored on IPFS (check Pinata)
- [ ] Download file works
- [ ] Search works
- [ ] Profile image upload works
- [ ] File sharing works
- [ ] Anomaly detection works
- [ ] Dashboard displays correctly

**Test URLs:**
```
✅ https://your-app.vercel.app/
✅ https://your-app.vercel.app/dashboard
✅ https://your-app.vercel.app/upload
✅ https://your-app.vercel.app/files
✅ https://your-app.vercel.app/search
✅ https://your-app.vercel.app/profile
```

---

## Troubleshooting

### If build fails:
- [ ] Check Vercel logs
- [ ] Verify all dependencies in package.json
- [ ] Run `npm run build` locally first

### If app crashes:
- [ ] Check environment variables spelling
- [ ] Verify all API keys are valid
- [ ] Check browser console for errors

### If MetaMask won't connect:
- [ ] Ensure HTTPS is enabled (Vercel does this automatically)
- [ ] Clear browser cache
- [ ] Try different browser

### If files won't upload:
- [ ] Check Pinata API key is valid
- [ ] Verify Supabase connection
- [ ] Check browser console for errors

---

## Success Metrics

### Your app is working if:
- ✅ No build errors
- ✅ No runtime errors in logs
- ✅ Can connect wallet
- ✅ Can upload/download files
- ✅ Files persist in database
- ✅ All pages load correctly

---

## Optional: Custom Domain

### 13. Add Custom Domain (Optional)
- [ ] Purchase domain (GoDaddy, Namecheap, etc.)
- [ ] In Vercel → Settings → Domains
- [ ] Add domain
- [ ] Update DNS records:
  ```
  A     @     76.76.21.21
  CNAME www   cname.vercel-dns.com
  ```
- [ ] Wait for SSL certificate (automatic)

---

## Cost Summary

### Free Tier Limits (Should be enough):

**Vercel:**
- 100 GB bandwidth/month
- Unlimited deployments
- **$0/month**

**Supabase:**
- 500 MB database
- 1 GB storage
- 50k active users
- **$0/month**

**Pinata:**
- 1 GB storage
- 100 uploads/month
- **$0/month**

**HuggingFace:**
- 30k API calls/month
- **$0/month**

**Total: $0/month** ✅

### When you'll need to upgrade:
- > 100 GB bandwidth → Vercel Pro ($20/month)
- > 500 MB database → Supabase Pro ($25/month)
- > 1 GB IPFS storage → Pinata Picnic ($20/month)

---

## Quick Reference

### Important URLs:
- **App:** https://your-app.vercel.app
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Supabase Dashboard:** https://app.supabase.com
- **Pinata Dashboard:** https://app.pinata.cloud
- **HuggingFace:** https://huggingface.co/settings/tokens

### Support Links:
- **Vercel Docs:** https://vercel.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs

---

## Deployment Complete! 🎉

### What you've accomplished:
✅ Full-stack decentralized app deployed  
✅ Database configured and migrated  
✅ IPFS storage integrated  
✅ AI-powered search enabled  
✅ Secure file encryption working  
✅ Anomaly detection active  
✅ Production-ready application  

### Share your app:
```
🌐 https://your-app.vercel.app
🔒 Secure, encrypted file sharing
🚀 Powered by blockchain & IPFS
```

---

**You're live! Time to share with the world! 🚀**

### Next Steps:
1. Share with friends
2. Gather feedback
3. Monitor usage
4. Plan improvements

**Need help?** See `VERCEL_DEPLOYMENT_GUIDE.md` for detailed instructions.

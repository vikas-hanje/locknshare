# Deployment Guide for BlockShare.AI

## Prerequisites

Before deploying, ensure you have:
- Vercel account (or preferred hosting platform)
- Supabase project configured
- Pinata account with API keys
- AI service endpoints (embeddings & anomaly detection)

## Environment Variables

Set these in your deployment platform:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_PINATA_API_KEY=your_pinata_api_key
NEXT_PUBLIC_PINATA_SECRET_KEY=your_pinata_secret_key
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt
NEXT_PUBLIC_AI_EMBEDDINGS_ENDPOINT=your_embeddings_endpoint
NEXT_PUBLIC_AI_ANOMALY_ENDPOINT=your_anomaly_endpoint
NEXT_PUBLIC_APP_URL=your_production_url
```

## Deployment Steps

### 1. Vercel Deployment (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

Or connect your GitHub repository to Vercel for automatic deployments.

### 2. Build Locally

```bash
# Build the application
npm run build

# Test production build
npm start
```

### 3. Database Setup

Run the SQL schema in your Supabase project:

```bash
# In Supabase SQL Editor, paste content from supabase/schema.sql
```

### 4. Configure Pinata

1. Create a Pinata account at https://pinata.cloud
2. Generate API keys in your Pinata dashboard
3. Add keys to environment variables

### 5. AI Services Setup

You need to set up or integrate with:

**Embeddings API**: For semantic search
- OpenAI API (recommended)
- Cohere API
- Custom model endpoint

**Anomaly Detection API**: For security monitoring
- Custom ML model
- Third-party service
- Rule-based system

## Post-Deployment

### 1. Test MetaMask Connection
- Verify wallet connection works
- Test signature verification

### 2. Test File Upload
- Upload a test file
- Verify encryption
- Check IPFS storage
- Confirm database entry

### 3. Test File Download
- Download and decrypt test file
- Verify file integrity

### 4. Monitor Performance
- Check Vercel analytics
- Monitor Supabase usage
- Track Pinata storage

## Security Checklist

- ✅ Environment variables are secure
- ✅ CORS configured correctly
- ✅ RLS policies enabled in Supabase
- ✅ API keys not exposed in client code
- ✅ HTTPS enabled
- ✅ CSP headers configured

## Troubleshooting

### MetaMask Connection Issues
- Ensure HTTPS is enabled
- Check browser console for errors
- Verify MetaMask is installed

### IPFS Upload Failures
- Verify Pinata API keys
- Check file size limits
- Monitor Pinata dashboard

### Database Connection Issues
- Verify Supabase URL and key
- Check RLS policies
- Review Supabase logs

## Performance Optimization

1. **Enable Next.js Image Optimization**
2. **Configure CDN for static assets**
3. **Implement caching strategy**
4. **Optimize bundle size**
5. **Enable compression**

## Monitoring & Analytics

- Set up Vercel Analytics
- Configure Supabase logs
- Monitor IPFS gateway performance
- Track user activity

## Backup Strategy

1. **Database**: Regular Supabase backups
2. **IPFS**: Pin important files
3. **User keys**: Users responsible for backup

## Cost Estimation

### Vercel
- Hobby: Free (limited)
- Pro: $20/month

### Supabase
- Free tier: 500MB database
- Pro: $25/month

### Pinata
- Free: 1GB storage
- Paid: Starting at $20/month

### AI Services
- Varies by provider
- OpenAI: ~$0.0001 per 1K tokens

## Support & Maintenance

- Monitor error logs daily
- Update dependencies monthly
- Review security advisories
- Backup database weekly

---

For questions or issues, contact support or open an issue on GitHub.

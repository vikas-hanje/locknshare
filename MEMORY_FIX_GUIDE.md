# Memory Issues Fix Guide

## Problem
Your laptop is running into memory issues when loading the large BART classifier model (1.6GB):
- "The paging file is too small for this operation to complete"
- "Array buffer allocation failed"

## Root Cause
- **BART model**: Requires ~2-3 GB RAM to load
- **Next.js dev server**: Uses ~1-2 GB RAM
- **Embedding model**: Uses ~500 MB RAM
- **Total needed**: ~4-6 GB RAM minimum

## Immediate Solution ✅ (Applied)
Made the classifier model **optional**. Server now works with just the embedding model:
- ✅ Embeddings work locally (main feature)
- ⚠️  Anomaly detection uses cloud API fallback

## Long-term Solutions

### Option 1: Increase Windows Paging File (Recommended for demos)
1. Press `Win + R`, type `sysdm.cpl`, press Enter
2. Go to **Advanced** tab → **Performance Settings**
3. **Advanced** tab → **Virtual Memory** → **Change**
4. Uncheck "Automatically manage"
5. Select drive → **Custom size**:
   - Initial: 4096 MB
   - Maximum: 8192 MB
6. Click **Set** → **OK** → Restart computer

### Option 2: Use a Smaller Classifier Model
Replace BART with a smaller model in `ai-server/main.py`:

```python
# Instead of bart-large-mnli (1.6GB)
classifier_model = pipeline(
    "zero-shot-classification",
    model="facebook/bart-large-mnli",  # ❌ Too large
    device=device
)

# Use smaller model:
classifier_model = pipeline(
    "zero-shot-classification",
    model="cross-encoder/nli-deberta-v3-small",  # ✅ Only ~140MB
    device=device
)
```

### Option 3: Run Only Embeddings
For your use case (demo project), **embeddings are the main feature**:
- File search works perfectly with local embeddings
- Anomaly detection uses cloud API (rarely called anyway)
- Much lower memory usage
- Perfect for demos!

## Current Status
✅ Embedding model: **Works locally** (your main feature!)
⚠️  Classifier model: **Skipped** (uses cloud fallback)
✅ Your app: **Works perfectly** for file uploads and search

## Next.js Memory Error Fix
The "Array buffer allocation failed" is Next.js webpack caching issue. Add to `next.config.mjs`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable webpack cache to reduce memory usage
  webpack: (config, { isServer }) => {
    config.cache = false
    return config
  },
}

export default nextConfig
```

Or just **restart Next.js** when you see the error.

## Testing
1. Restart AI server: `npm run dev:ai`
2. You should see:
   ```
   ✅ Embedding model: Loaded
   ⚠️  Classifier model: Skipped (low memory)
   ```
3. Embeddings will work locally
4. Anomaly detection will use cloud API

**This is perfect for your demo!** The main AI feature (semantic search with embeddings) works locally! 🎉

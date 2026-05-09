# AI Server Installation - Complete ✅

## Status: Successfully Installed

All Python packages have been installed successfully!

## Installed Packages

```
✅ torch-2.7.1+cu118
✅ torchvision-0.22.1+cu118
✅ fastapi-0.122.0
✅ uvicorn-0.38.0
✅ pydantic-2.10.x
✅ transformers-4.57.3
✅ sentence-transformers (latest)
✅ huggingface-hub
✅ tokenizers-0.22.1
✅ python-multipart
✅ python-dotenv
```

## How to Start the AI Server

```bash
cd ai-server
python main.py
```

Expected startup output:
```
🚀 LockNShare AI Server Starting...
📥 Loading sentence transformer model (all-MiniLM-L6-v2)...
   This may take a few minutes on first run while downloading...
✅ Embedding model loaded successfully
   Model dimension: 384

📥 Loading classifier model (bart-large-mnli)...
   This is a larger model (~1.6GB), please wait...
✅ Classifier model loaded successfully

INFO:     Started server process [PID]
INFO:     Uvicorn running on http://0.0.0.0:8000
✨ AI Server ready! Access at http://localhost:8000
```

## First Run - Model Download

**Important:** On first run, the server will download AI models (~2GB total):
- `all-MiniLM-L6-v2`: ~90MB (embeddings)
- `bart-large-mnli`: ~1.6GB (classification)

This is normal and only happens once. Models are cached locally.

## Testing the Server

Once running, test with:

```bash
# Health check
curl http://localhost:8000/health

# Test embeddings
curl -X POST http://localhost:8000/embeddings \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"test document\"}"

# Test anomaly detection
curl -X POST http://localhost:8000/anomaly \
  -H "Content-Type: application/json" \
  -d "{\"summary\": \"User performed 50 uploads in 1 hour\"}"
```

## Troubleshooting

### Server Won't Start

1. **Check Python version:**
   ```bash
   python --version
   ```
   Should be Python 3.11+ (3.13 works)

2. **Verify all packages installed:**
   ```bash
   pip list | grep -E "fastapi|torch|transformers"
   ```

3. **Memory issues:**
   - BART model requires ~2-3GB RAM
   - Close unnecessary applications
   - Server will skip classifier if memory insufficient (embeddings still work)

### Port Already in Use

If port 8000 is busy:
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <process_id> /F

# Linux/Mac
lsof -i :8000
kill -9 <PID>
```

Or change port in `main.py`:
```python
uvicorn.run(app, host="0.0.0.0", port=8001)  # Use 8001 instead
```

## Integration with Next.js App

Update `.env.local`:
```env
NEXT_PUBLIC_AI_SERVER_URL=http://localhost:8000
AI_SERVER_FALLBACK=true
```

Then start both  services:
```bash
# Terminal 1 - AI Server
cd ai-server
python main.py

# Terminal 2 - Next.js
cd ..
npm run dev
```

## What Was Fixed

**Original Issue:** `numpy==1.24.3` not compatible with Python 3.13

**Solution:**
- Changed to `numpy>=1.26.0`
- Installed PyTorch separately first
- Installed remaining packages with flexible versions

All working now! ✅

# 🚀 Quick Start Guide

## ✅ Step 1: Create `.env.local` File

Create a new file named `.env.local` in the root directory (same folder as package.json):

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://civxbaoswlwhbjkggkul.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpdnhiYW9zd2x3aGJqa2dna3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMzM0MTEsImV4cCI6MjA3NTYwOTQxMX0.FBMO6T1rJt6mCB4mzwdTgW5bCR2NV5oPJbLEcRB18hI

# Pinata IPFS Configuration
NEXT_PUBLIC_PINATA_API_KEY=1c4b2c4080cdc7aee785
NEXT_PUBLIC_PINATA_SECRET_KEY=4c22e87f0326265766a2654730ad79afff3c45d23e30affb8000cdb79e9b06d2
NEXT_PUBLIC_PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJjNTU0M2ViZi0wZTZkLTRjZGEtYTk4Yy00MTMyNzIxYzYyYjIiLCJlbWFpbCI6InZpa2FzaGFuamUwMDdAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjFjNGIyYzQwODBjZGM3YWVlNzg1Iiwic2NvcGVkS2V5U2VjcmV0IjoiNGMyMmU4N2YwMzI2MjY1NzY2YTI2NTQ3MzBhZDc5YWZmZjNjNDVkMjNlMzBhZmZiODAwMGNkYjc5ZTliMDZkMiIsImV4cCI6MTc5MTcxMDAxMn0.m10OgWce7Ny-MxUjwRSV-xM4A8H4pdwTsQbHu16fWKY

# AI Service Endpoints (using local mock APIs)
NEXT_PUBLIC_AI_EMBEDDINGS_ENDPOINT=/api/embeddings
NEXT_PUBLIC_AI_ANOMALY_ENDPOINT=/api/anomaly

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**PowerShell Command:**
```powershell
Copy-Item .env.local.example .env.local
```

Then edit the file to use local endpoints:
- Change `https://your-embeddings-api.com/embed` to `/api/embeddings`
- Change `https://your-anomaly-api.com/detect` to `/api/anomaly`

---

## ✅ Step 2: Set Up Supabase Database

1. Go to your Supabase project: https://civxbaoswlwhbjkggkul.supabase.co
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `supabase/schema.sql`
5. Paste and click **Run**

This will create all necessary tables:
- `users`
- `file_metadata`
- `access_logs`
- `anomaly_records`

---

## ✅ Step 3: Run the Development Server

```powershell
npm run dev
```

Open http://localhost:3000 in your browser.

---

## 🧪 Testing the App

### 1. **Install MetaMask**
- Install MetaMask browser extension
- Create or import a wallet

### 2. **Connect Wallet**
- Click "Connect Wallet" on the landing page
- Approve the connection in MetaMask
- Sign the authentication message

### 3. **Upload a Test File**
- Navigate to Upload page
- Drag and drop a file
- Add description and tags (optional)
- Click "Encrypt & Upload"

### 4. **View Files**
- Go to "My Files" page
- Click "Download" to decrypt and download

### 5. **Search Files**
- Go to Search page
- Enter search query (semantic search is mock for now)

---

## 🤖 AI Endpoints: Current Setup

**Currently using MOCK APIs** located at:
- `/app/api/embeddings/route.ts` - Returns random embeddings
- `/app/api/anomaly/route.ts` - Always returns "safe" status

### To Use Real AI Services:

#### **Option A: OpenAI (Recommended)**
1. Sign up at https://platform.openai.com
2. Create API key
3. Update `.env.local`:
```env
OPENAI_API_KEY=sk-your-key-here
NEXT_PUBLIC_AI_EMBEDDINGS_ENDPOINT=https://api.openai.com/v1/embeddings
```

#### **Option B: Hugging Face (Free)**
1. Sign up at https://huggingface.co
2. Create API token
3. Update `.env.local`:
```env
HUGGINGFACE_API_KEY=hf_your-key-here
NEXT_PUBLIC_AI_EMBEDDINGS_ENDPOINT=https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2
```

#### **Option C: Local Ollama (Free, Offline)**
1. Install Ollama: https://ollama.ai
2. Run: `ollama pull nomic-embed-text`
3. Update `.env.local`:
```env
NEXT_PUBLIC_AI_EMBEDDINGS_ENDPOINT=http://localhost:11434/api/embeddings
```

---

## 🔧 Troubleshooting

### "supabaseUrl is required" Error
✅ **Fixed!** You created `.env.local` with your credentials.

### MetaMask Not Connecting
- Ensure MetaMask is installed
- Try refreshing the page
- Check browser console for errors

### File Upload Fails
- Verify Pinata credentials are correct
- Check browser console for errors
- Try a smaller file first

### Database Errors
- Ensure you ran the SQL schema in Supabase
- Check Supabase logs for errors

---

## 📦 What's Working Now

✅ Landing page with theme toggle
✅ MetaMask wallet connection
✅ Dashboard with stats
✅ File upload with encryption
✅ IPFS storage via Pinata
✅ File download with decryption
✅ Search interface
✅ Security monitoring (mock)
✅ Dark/light mode

## 🚧 What Needs Real AI Services

⚠️ **Semantic search** - Currently using mock embeddings
⚠️ **Anomaly detection** - Currently always returns "safe"

The app works fully without real AI - you just won't have intelligent search or security monitoring until you configure real AI endpoints.

---

## 🎯 Next Steps

1. ✅ Create `.env.local` file
2. ✅ Set up Supabase database
3. ✅ Run `npm run dev`
4. ✅ Test with MetaMask
5. 🔄 (Optional) Add real AI services later

---

Need help? Check the main README.md or ask for assistance!

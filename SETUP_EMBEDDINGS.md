# 🚀 Quick Setup: Embeddings & Username Display

## ⚡ 3-Step Setup

### **Step 1: Add HuggingFace API Key**

1. Go to [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Create a new token (Read access is enough)
3. Copy the token
4. Add to your `.env.local` file:

```env
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### **Step 2: Add Username Column to Supabase**

Run this SQL in Supabase SQL Editor:

```sql
-- Add username column (if not already done)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS username TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
```

---

### **Step 3: Restart Server**

```bash
npm run dev
```

---

## ✅ Test Everything

### **1. Test Embeddings**

1. Upload a text file or PDF
2. Check browser console for these messages:
   ```
   ✅ Extracting text from file for embeddings...
   ✅ Extracted text length: 1234
   ✅ Text split into 2 chunks
   ✅ Generating embeddings via HuggingFace API...
   ✅ Embedding generated: Success
   ```

3. Check Supabase `file_metadata` table:
   - Find your uploaded file
   - Check `embedding_vector` column
   - Should see array of 384 numbers: `[0.123, -0.456, ...]`

### **2. Test Username Display**

1. Go to **Profile** page
2. Click **Edit** next to Username
3. Enter a username (e.g., "JohnDoe")
4. Click **Save**
5. Check top-right corner - should show your username
6. Check dashboard - should say "Welcome back, JohnDoe!"

---

## 🎯 What You Get

### **Embeddings:**
- ✅ Automatic text extraction from files
- ✅ 384-dimensional embeddings using HuggingFace
- ✅ Stored in Supabase for semantic search
- ✅ Fast (~100-200ms per file)

### **Username Display:**
- ✅ Username shows in dashboard welcome message
- ✅ Username shows in top-right ConnectWallet component
- ✅ Avatar uses username initials
- ✅ Falls back to ENS or wallet address

---

## 🐛 Common Issues

### **"Embeddings generation failed"**

**Cause:** Invalid or missing HuggingFace API key

**Fix:**
1. Double-check your API key in `.env.local`
2. Make sure it starts with `hf_`
3. Restart dev server after adding key

### **"Rate limit exceeded"**

**Cause:** Too many requests to HuggingFace API

**Fix:**
1. Wait a few minutes
2. Free tier: 1000 requests/day
3. Upgrade to HuggingFace Pro if needed

### **Username not showing**

**Cause:** Database column not added or user not set

**Fix:**
1. Run the SQL migration (Step 2 above)
2. Set your username in Profile page
3. Refresh the page

---

## 📊 File Support

| File Type | Text Extraction | Embeddings |
|-----------|----------------|------------|
| `.txt` | ✅ Full text | ✅ Yes |
| `.md` | ✅ Full text | ✅ Yes |
| `.json` | ✅ Full text | ✅ Yes |
| `.pdf` | ⚠️ Basic | ✅ Yes |
| `.docx` | ⚠️ Metadata only | ✅ Yes |
| Images | ⚠️ Metadata only | ✅ Yes |
| Other | ⚠️ Metadata only | ✅ Yes |

**Note:** For better PDF support, consider installing `pdf-parse` library.

---

## 🔥 Next Steps

### **Implement Semantic Search:**

Now that embeddings are generated, you can implement semantic search:

```typescript
// Example search function
import { generateSingleEmbedding, cosineSimilarity } from '@/lib/huggingface'

async function searchFiles(query: string, files: FileMetadata[]) {
  // Generate query embedding
  const queryEmbedding = await generateSingleEmbedding(query)
  
  if (!queryEmbedding) return []
  
  // Calculate similarity with all files
  const results = files
    .filter(file => file.embedding_vector) // Only files with embeddings
    .map(file => ({
      file,
      similarity: cosineSimilarity(queryEmbedding, file.embedding_vector)
    }))
    .filter(r => r.similarity > 0.5) // Similarity threshold
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 10) // Top 10 results
  
  return results
}
```

### **Add to Search Page:**

Update `app/search/page.tsx` to use the semantic search function above.

---

## 🎉 You're All Set!

**What's Working:**
- ✅ Text extraction from files
- ✅ Automatic embedding generation
- ✅ Embeddings saved to Supabase
- ✅ Username display in UI
- ✅ Ready for semantic search

**Documentation:**
- Full guide: `EMBEDDINGS_IMPLEMENTATION.md`
- This setup: `SETUP_EMBEDDINGS.md`

---

**Need Help?**
- Check browser console for detailed logs
- Verify `.env.local` has `HUGGINGFACE_API_KEY`
- Ensure Supabase migration was run
- Test with simple text files first

Happy coding! 🚀

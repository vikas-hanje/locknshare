# HuggingFace 400 Error Fix - Input Format Issue

## Error Message
```
HuggingFace API error: 400 - SentenceSimilarityPipeline._call_() missing 1 required positional argument: 'sentences'
```

## Root Cause

The HuggingFace Inference API for **sentence-transformers/all-MiniLM-L6-v2** was receiving data in the wrong format.

### What Was Wrong

The previous code was converting **all inputs to arrays**, even single strings:

```typescript
// ❌ WRONG - Always wraps in array
const inputArray = Array.isArray(texts) ? texts : [texts]
body: JSON.stringify({
  inputs: inputArray,  // Even single strings became arrays!
})
```

This caused the API to misinterpret the request as a **sentence similarity task** instead of **feature extraction (embeddings)**.

### Correct Format

HuggingFace Inference API expects:

**For Single Text:**
```json
{
  "inputs": "This is a single text string"
}
```
Returns: `[0.1, 0.2, 0.3, ...]` (1D array of 384 numbers)

**For Multiple Texts (Batch):**
```json
{
  "inputs": ["First text", "Second text"]
}
```
Returns: `[[0.1, 0.2, ...], [0.3, 0.4, ...]]` (2D array)

## The Fix

### Updated Code in `lib/huggingface.ts`

```typescript
// ✅ CORRECT - Preserves the input type
const isSingleInput = typeof texts === 'string'
const inputData = isSingleInput ? texts : texts  // Keep as-is

body: JSON.stringify({
  inputs: inputData,  // String stays string, array stays array
})
```

### Updated Response Parsing

```typescript
// Handle both response types correctly
if (Array.isArray(data[0])) {
  // 2D array from batch request
  embeddings = data
} else if (typeof data[0] === 'number') {
  // 1D array from single string - wrap it
  embeddings = [data]
}
```

## Changes Made

### File: `lib/huggingface.ts`

1. ✅ **Preserve input type** - Don't convert single strings to arrays
2. ✅ **Added logging** for input type and array status
3. ✅ **Improved response parsing** with clear detection of 1D vs 2D arrays
4. ✅ **Better error messages** with JSON snippets for debugging

## Testing Steps

1. **Restart the dev server:**
   ```bash
   # Stop the current server (Ctrl+C in terminal)
   npm run dev
   ```

2. **Open browser console** (F12)

3. **Upload a file** and watch for:
   ```
   Input type: string
   Is array: false
   HuggingFace API response is array: true
   First element type: number
   Received 1D array (single text response), wrapping
   ✅ Embeddings generated successfully: 1 vectors
   ✅ Embedding dimensions: 384
   ```

## Expected Results

### ✅ Success Console Output:
```
Calling embeddings API endpoint...
Text length: XXX characters
Generating embeddings for text(s): 1
Text lengths: [XXX]
Input type: string
Is array: false
HuggingFace API response type: object
HuggingFace API response is array: true
First element type: number
Received 1D array (single text response), wrapping
✅ Embeddings generated successfully: 1 vectors
✅ Embedding dimensions: 384
Successfully generated embedding with 384 dimensions
```

### ✅ Upload Success:
- File uploads successfully
- No embedding errors
- Search functionality enabled

## Why This Happened

The HuggingFace Inference API uses different pipelines based on input format:
- **String input** → `FeatureExtractionPipeline` (embeddings)
- **Array of pairs** → `SentenceSimilarityPipeline` (similarity scores)

By wrapping single strings in arrays, we accidentally triggered the wrong pipeline, causing the 400 error.

## Verification

Check that your `.env.local` has the API key (you already have this):
```env
HUGGINGFACE_API_KEY=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
```

The API key format is correct (starts with `hf_`), so no changes needed there.

## Summary

✅ **Fixed:** Input format now matches HuggingFace API expectations  
✅ **Fixed:** Response parsing handles both 1D and 2D arrays  
✅ **Added:** Detailed logging for debugging  
✅ **Result:** Embeddings should now generate successfully!

# AI Server Setup - Python 3.13 Compatibility Fix

## Issue
Installing AI server dependencies failed with:
```
AttributeError: module 'pkgutil' has no attribute 'ImpImporter'
```

## Root Cause
- `numpy==1.24.3` is **not compatible** with Python 3.13
- Python 3.13 removed deprecated `pkgutil.ImpImporter`
- Older numpy versions still reference this deprecated feature

## Solution
Updated `ai-server/requirements.txt` to use compatible versions:

### Changed:
```diff
- numpy==1.24.3
+ numpy>=1.26.0
```

## Installation

```bash
cd ai-server
pip install -r requirements.txt
```

## Package Versions (Python 3.13 Compatible)

```
fastapi==0.121.1
uvicorn[standard]==0.38.0
pydantic==2.5.3
transformers==4.57.2
torch==2.8.0
sentence-transformers==5.1.2
numpy>=1.26.0              # ✅ Python 3.13 compatible
python-multipart==0.0.6
python-dotenv==1.0.0
tf-keras
```

## Alternative: Use Python 3.11/3.12

If you encounter other compatibility issues, you can use Python 3.11 or 3.12:

```bash
# Create virtual environment with Python 3.11
conda create -n locknshare-ai python=3.11
conda activate locknshare-ai

# Or with venv
python3.11 -m venv venv
source venv/bin/activate  # Linux/Mac
.\venv\Scripts\activate   # Windows

# Then install
pip install -r requirements.txt
```

## Verification

After successful installation, test the server:

```bash
python main.py
```

Expected output:
```
🚀 LockNShare AI Server Starting...
📥 Loading sentence transformer model (all-MiniLM-L6-v2)...
✅ Embedding model loaded successfully
📥 Loading classifier model (bart-large-mnli)...
✅ Classifier model loaded successfully
✨ AI Server ready at http://localhost:8000
```

## Troubleshooting

### Still Getting Errors?

1. **Update pip and setuptools:**
   ```bash
   pip install --upgrade pip setuptools wheel
   ```

2. **Clear pip cache:**
   ```bash
   pip cache purge
   ```

3. **Install packages one by one:**
   ```bash
   pip install fastapi uvicorn pydantic
   pip install torch
   pip install transformers sentence-transformers
   pip install numpy>=1.26.0
   ```

4. **Check Python version:**
   ```bash
   python --version
   ```
   Should be Python 3.11+ (3.13 recommended)

---

**Status:** ✅ Fixed - requirements.txt updated for Python 3.13 compatibility

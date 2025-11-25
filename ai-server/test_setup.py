"""
Quick test script to verify AI server setup
Run this to test if all models load correctly
"""

import asyncio
import sys

async def test_server():
    print("=" * 60)
    print("🧪 Testing LockNShare AI Server Setup")
    print("=" * 60)
    print()
    
    # Test imports
    print("1️⃣  Testing imports...")
    try:
        import torch
        import transformers
        from sentence_transformers import SentenceTransformer
        print("   ✅ All imports successful")
        print(f"   - PyTorch version: {torch.__version__}")
        print(f"   - Transformers version: {transformers.__version__}")
        print(f"   - CUDA available: {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            print(f"   - GPU: {torch.cuda.get_device_name(0)}")
    except ImportError as e:
        print(f"   ❌ Import failed: {e}")
        print("   Run: pip install -r requirements.txt")
        return False
    
    print()
    
    # Test embedding model
    print("2️⃣  Loading embedding model (all-MiniLM-L6-v2)...")
    print("   First download may take a few minutes...")
    try:
        model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
        print("   ✅ Embedding model loaded")
        
        # Test embedding generation
        test_text = "This is a test sentence for embedding generation"
        embedding = model.encode(test_text)
        print(f"   ✅ Test embedding generated ({len(embedding)} dimensions)")
    except Exception as e:
        print(f"   ❌ Failed to load embedding model: {e}")
        return False
    
    print()
    
    # Test classifier model
    print("3️⃣  Loading classifier model (bart-large-mnli)...")
    print("   This is a larger model (~1.6GB), please wait...")
    try:
        from transformers import pipeline
        classifier = pipeline(
            "zero-shot-classification",
            model="facebook/bart-large-mnli",
            device=0 if torch.cuda.is_available() else -1
        )
        print("   ✅ Classifier model loaded")
        
        # Test classification
        result = classifier(
            "User uploaded 10 files in normal business hours",
            candidate_labels=["normal activity", "suspicious activity"]
        )
        print(f"   ✅ Test classification: {result['labels'][0]} ({result['scores'][0]:.2%})")
    except Exception as e:
        print(f"   ❌ Failed to load classifier model: {e}")
        return False
    
    print()
    print("=" * 60)
    print("🎉 All tests passed! Server is ready to run.")
    print("=" * 60)
    print()
    print("Next steps:")
    print("1. Start AI server: python main.py")
    print("2. Visit: http://localhost:8000")
    print("3. Start Next.js: npm run dev (in main directory)")
    print()
    
    return True

if __name__ == "__main__":
    result = asyncio.run(test_server())
    sys.exit(0 if result else 1)

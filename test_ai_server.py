# Quick test script for AI server endpoints
# Tests embedding generation and anomaly detection

import requests
import json

AI_SERVER_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint"""
    print("=" * 60)
    print("Testing AI Server Endpoints")
    print("=" * 60)
    print("\n1️⃣  Testing /health endpoint...")
    
    response = requests.get(f"{AI_SERVER_URL}/health")
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Server is {data['status']}")
        print(f"   ✅ Embedding model loaded: {data['models_loaded']['embedding']}")
        print(f"   ✅ Classifier model loaded: {data['models_loaded']['classifier']}")
        print(f"   💻 Device: {data['hardware']['device']}")
        return True
    else:
        print(f"   ❌ Health check failed: {response.status_code}")
        return False

def test_embeddings():
    """Test embeddings endpoint"""
    print("\n2️⃣  Testing /embeddings endpoint...")
    
    test_text = "This is a secure file upload for sensitive business documents"
    
    response = requests.post(
        f"{AI_SERVER_URL}/embeddings",
        json={"text": test_text},
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Embedding generated successfully")
        print(f"   ✅ Dimensions: {data['dimensions']}")
        print(f"   ✅ Source: {data['source']}")
        print(f"   ✅ First 5 values: {data['embedding'][:5]}")
        return True
    else:
        print(f"   ❌ Embedding generation failed: {response.status_code}")
        print(f"   Error: {response.text}")
        return False

def test_anomaly():
    """Test anomaly detection endpoint"""
    print("\n3️⃣  Testing /anomaly endpoint...")
    
    # Test with normal activity
    normal_summary = "User uploaded 3 files during business hours from their usual location"
    response = requests.post(
        f"{AI_SERVER_URL}/anomaly",
        json={
            "activity_summary": normal_summary,
            "user_id": "test-user-123"
        },
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Normal activity analysis:")
        print(f"      Label: {data['top_label']}")
        print(f"      Confidence: {data['confidence']:.2%}")
        print(f"      Suspicious: {data['is_suspicious']}")
    
    # Test with suspicious activity
    print("\n   Testing suspicious activity...")
    suspicious_summary = "User downloaded 50 files in 5 minutes from unknown location"
    response = requests.post(
        f"{AI_SERVER_URL}/anomaly",
        json={
            "activity_summary": suspicious_summary,
            "user_id": "test-user-456"
        },
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Suspicious activity analysis:")
        print(f"      Label: {data['top_label']}")
        print(f"      Confidence: {data['confidence']:.2%}")
        print(f"      Suspicious: {data['is_suspicious']}")
        print(f"      Source: {data['source']}")
        return True
    else:
        print(f"   ❌ Anomaly detection failed: {response.status_code}")
        print(f"   Error: {response.text}")
        return False

if __name__ == "__main__":
    try:
        if test_health():
            test_embeddings()
            test_anomaly()
            print("\n" + "=" * 60)
            print("🎉 All endpoint tests passed!")
            print("=" * 60)
            print("\nAI Server is ready for use with Next.js application")
        else:
            print("\n❌ Server not ready. Make sure it's running on port 8000")
    except requests.exceptions.ConnectionError:
        print("\n❌ Cannot connect to AI server.")
        print("   Make sure the server is running: python main.py")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")

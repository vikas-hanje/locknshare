from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Annotated
from contextlib import asynccontextmanager
import torch
from sentence_transformers import SentenceTransformer
from transformers import pipeline
import numpy as np
import logging
import sys
import os
import secrets

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Global model instances
embedding_model = None
classifier_model = None

# Simple API key authentication (optional for demo)
# Set AI_SERVER_API_KEY environment variable to enable authentication
API_KEY = os.getenv("AI_SERVER_API_KEY", None)

# Get allowed origins from environment or use defaults
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(",") if os.getenv("ALLOWED_ORIGINS") else [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "https://pettier-buffy-doltishly.ngrok-free.de",
    "https://locknshare.vercel.app"
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Modern lifespan context manager for startup/shutdown events"""
    # Startup
    global embedding_model, classifier_model
    
    logger.info("🚀 Starting LockNShare AI Server...")
    logger.info(f"🔧 Python version: {sys.version}")
    logger.info(f"🔧 PyTorch version: {torch.__version__}")
    logger.info(f"💻 CUDA available: {torch.cuda.is_available()}")
    
    if torch.cuda.is_available():
        logger.info(f"🎮 GPU Device: {torch.cuda.get_device_name(0)}")
    else:
        logger.info("⚠️  Running on CPU (GPU not available)")
    
    # Log security settings
    if API_KEY:
        logger.info("🔐 API Key authentication enabled")
    else:
        logger.info("⚠️  API Key authentication disabled (set AI_SERVER_API_KEY to enable)")
    
    logger.info(f"🌐 Allowed origins: {ALLOWED_ORIGINS}")
    
    try:
        # Load embedding model (384-dimensional vectors)
        logger.info("📥 Loading sentence transformer model (all-MiniLM-L6-v2)...")
        logger.info("   This may take a few minutes on first run while downloading...")
        
        embedding_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
        logger.info("✅ Embedding model loaded successfully")
        logger.info(f"   Model dimension: {embedding_model.get_sentence_embedding_dimension()}")
        
        # Load zero-shot classifier for anomaly detection
        logger.info("📥 Loading classifier model (bart-large-mnli)...")
        logger.info("   This is a larger model (~1.6GB), please wait...")
        
        device = 0 if torch.cuda.is_available() else -1
        classifier_model = pipeline(
            "zero-shot-classification",
            model="facebook/bart-large-mnli",
            device=device
        )
        logger.info("✅ Classifier model loaded successfully")
        
        logger.info("=" * 60)
        logger.info("🎉 All models loaded successfully!")
        logger.info("🌐 Server ready to accept requests")
        logger.info(f"💾 Memory usage: ~{_get_model_memory_mb():.0f} MB")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"❌ Failed to load models: {str(e)}")
        logger.error("   Server will start but API calls will fail")
        logger.error("   Make sure you have stable internet for first-time model download")
        # Don't raise - let server start for health checks
    
    # Yield control back to FastAPI (app is running)
    yield
    
    # Shutdown
    logger.info("👋 Shutting down AI server...")


def _get_model_memory_mb():
    """Estimate model memory usage"""
    try:
        if torch.cuda.is_available():
            return torch.cuda.memory_allocated() / 1024 / 1024
        return 0
    except:
        return 0


# Authentication dependency
async def verify_api_key(x_api_key: Annotated[str | None, Header()] = None):
    """Verify API key if authentication is enabled"""
    if API_KEY is None:
        # Authentication disabled
        return True
    
    if x_api_key is None or x_api_key != API_KEY:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing API key. Include X-Api-Key header."
        )
    return True


# Initialize FastAPI app with lifespan
app = FastAPI(
    title="LockNShare AI Server",
    version="1.0.0",
    description="Local AI inference server for embeddings and anomaly detection",
    lifespan=lifespan
)

# CORS configuration - allow Next.js to call this server
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class EmbeddingRequest(BaseModel):
    text: Optional[str] = None
    texts: Optional[List[str]] = None
    
class EmbeddingResponse(BaseModel):
    embedding: Optional[List[float]] = None
    embeddings: Optional[List[List[float]]] = None
    dimensions: int
    source: str = "local"
    
class AnomalyRequest(BaseModel):
    activity_summary: str
    user_id: str
    
class AnomalyResponse(BaseModel):
    is_suspicious: bool
    top_label: str
    confidence: float
    all_scores: dict
    source: str = "local"

async def root():
    """Health check endpoint with model information"""
    return {
        "status": "online",
        "service": "LockNShare AI Server",
        "version": "1.0.0",
        "models": {
            "embedding": {
                "name": "sentence-transformers/all-MiniLM-L6-v2",
                "loaded": embedding_model is not None,
                "dimensions": 384
            },
            "classifier": {
                "name": "facebook/bart-large-mnli",
                "loaded": classifier_model is not None,
                "type": "zero-shot-classification"
            }
        },
        "hardware": {
            "gpu_available": torch.cuda.is_available(),
            "device": "cuda" if torch.cuda.is_available() else "cpu"
        }
    }


@app.post("/embeddings", response_model=EmbeddingResponse)
async def generate_embeddings(
    request: EmbeddingRequest,
    authenticated: bool = Depends(verify_api_key)
):
    """
    Generate embeddings for text(s)
    
    - Single text: Pass 'text' parameter
    - Multiple texts: Pass 'texts' array parameter (returns averaged embedding)
    """
    try:
        if embedding_model is None:
            raise HTTPException(
                status_code=503,
                detail="Embedding model not loaded. Server may still be initializing."
            )
        
        # Single text
        if request.text:
            logger.info(f"📝 Generating embedding for single text ({len(request.text)} chars)")
            
            embedding = embedding_model.encode(
                request.text,
                convert_to_numpy=True,
                show_progress_bar=False
            )
            
            logger.info(f"✅ Generated embedding with {len(embedding)} dimensions")
            
            return EmbeddingResponse(
                embedding=embedding.tolist(),
                dimensions=len(embedding),
                source="local"
            )
        
        # Multiple texts (for chunks) - return averaged embedding
        elif request.texts:
            logger.info(f"📝 Generating embeddings for {len(request.texts)} texts")
            
            embeddings = embedding_model.encode(
                request.texts,
                convert_to_numpy=True,
                show_progress_bar=False
            )
            
            # Average the embeddings
            if len(request.texts) > 1:
                averaged = np.mean(embeddings, axis=0)
                logger.info(f"✅ Generated and averaged {len(request.texts)} embeddings")
                
                return EmbeddingResponse(
                    embedding=averaged.tolist(),
                    dimensions=len(averaged),
                    source="local"
                )
            else:
                return EmbeddingResponse(
                    embedding=embeddings[0].tolist(),
                    dimensions=len(embeddings[0]),
                    source="local"
                )
        
        else:
            raise HTTPException(
                status_code=400,
                detail="Must provide either 'text' or 'texts' parameter"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error generating embeddings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Embedding generation failed: {str(e)}")


@app.post("/anomaly", response_model=AnomalyResponse)
async def detect_anomaly(
    request: AnomalyRequest,
    authenticated: bool = Depends(verify_api_key)
):
    """
    Analyze activity summary for suspicious patterns using zero-shot classification
    """
    try:
        if classifier_model is None:
            raise HTTPException(
                status_code=503,
                detail="Classifier model not loaded. Server may still be initializing."
            )
        
        logger.info(f"🔍 Analyzing activity for user {request.user_id}")
        logger.info(f"   Summary: {request.activity_summary[:100]}...")
        
        # Candidate labels for classification
        labels = [
            'normal user activity',
            'suspicious behavior',
            'potential security threat',
            'data exfiltration attempt',
        ]
        
        # Perform zero-shot classification
        result = classifier_model(
            request.activity_summary,
            candidate_labels=labels,
        )
        
        # Extract results
        top_label = result['labels'][0]
        confidence = result['scores'][0]
        
        # Create score dictionary
        all_scores = {
            label: score 
            for label, score in zip(result['labels'], result['scores'])
        }
        
        # Determine if suspicious (anything other than "normal" with >50% confidence)
        is_suspicious = top_label != 'normal user activity' and confidence > 0.5
        
        logger.info(f"✅ Classification: {top_label} (confidence: {confidence:.2%})")
        logger.info(f"   Suspicious: {is_suspicious}")
        
        return AnomalyResponse(
            is_suspicious=is_suspicious,
            top_label=top_label,
            confidence=confidence,
            all_scores=all_scores,
            source="local"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error detecting anomaly: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Anomaly detection failed: {str(e)}")


@app.get("/health")
async def health_check():
    """Detailed health check endpoint"""
    models_loaded = {
        "embedding": embedding_model is not None,
        "classifier": classifier_model is not None
    }
    
    all_loaded = all(models_loaded.values())
    
    return {
        "status": "healthy" if all_loaded else "initializing",
        "models_loaded": models_loaded,
        "hardware": {
            "gpu": torch.cuda.is_available(),
            "device": "cuda" if torch.cuda.is_available() else "cpu",
            "memory_mb": _get_model_memory_mb()
        },
        "ready": all_loaded
    }


if __name__ == "__main__":
    import uvicorn
    
    logger.info("🚀 Starting server with uvicorn...")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )

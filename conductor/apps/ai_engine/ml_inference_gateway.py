# ML Inference Gateway Service
# Unified API gateway for all ML model serving with load balancing and caching

import asyncio
import json
import logging
import time
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum
import aiohttp
import redis.asyncio as redis
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from prometheus_client import Counter, Histogram, Gauge, generate_latest
import uvicorn
import hashlib
import pickle

logger = logging.getLogger(__name__)

# Metrics
REQUEST_COUNT = Counter('ml_inference_requests_total', 'Total ML inference requests', ['model', 'endpoint'])
REQUEST_LATENCY = Histogram('ml_inference_request_duration_seconds', 'ML inference request latency', ['model', 'endpoint'])
MODEL_ACCURACY = Gauge('ml_model_accuracy', 'Model accuracy score', ['model'])
ACTIVE_CONNECTIONS = Gauge('ml_inference_active_connections', 'Active inference connections')
CACHE_HIT_RATE = Gauge('ml_inference_cache_hit_rate', 'Cache hit rate')

class ModelType(Enum):
    TENSORFLOW = "tensorflow"
    PYTORCH = "pytorch"
    CUSTOM = "custom"

@dataclass
class ModelConfig:
    name: str
    model_type: ModelType
    endpoint: str
    version: str
    max_batch_size: int
    timeout: float = 5.0
    cache_ttl: int = 3600

class MLInferenceGateway:
    """Unified gateway for ML model inference with load balancing and caching."""
    
    def __init__(self):
        self.app = FastAPI(title="ML Inference Gateway", version="1.0.0")
        self.redis_client: Optional[redis.Redis] = None
        self.model_configs: Dict[str, ModelConfig] = {}
        self.session: Optional[aiohttp.ClientSession] = None
        
        # Configure middleware
        self.app.add_middleware(GZipMiddleware, minimum_size=1000)
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        # Setup routes
        self._setup_routes()
        
        # Initialize model configurations
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize model configurations."""
        self.model_configs = {
            "text-embedding": ModelConfig(
                name="text-embedding",
                model_type=ModelType.PYTORCH,
                endpoint="http://pytorch-serving:8080/predictions/text-embedding",
                version="v1.0",
                max_batch_size=64,
                cache_ttl=7200  # 2 hours
            ),
            "recommendation": ModelConfig(
                name="recommendation",
                model_type=ModelType.TENSORFLOW,
                endpoint="http://tensorflow-serving:8501/v1/models/recommendation-model:predict",
                version="v2.1",
                max_batch_size=32,
                cache_ttl=1800  # 30 minutes
            ),
            "adaptive-learning": ModelConfig(
                name="adaptive-learning",
                model_type=ModelType.PYTORCH,
                endpoint="http://pytorch-serving:8080/predictions/adaptive-learning",
                version="v3.0",
                max_batch_size=16,
                cache_ttl=900  # 15 minutes
            ),
            "content-classification": ModelConfig(
                name="content-classification",
                model_type=ModelType.TENSORFLOW,
                endpoint="http://tensorflow-serving:8501/v1/models/content-classification:predict",
                version="v1.5",
                max_batch_size=128,
                cache_ttl=3600  # 1 hour
            ),
            "sentiment-analysis": ModelConfig(
                name="sentiment-analysis",
                model_type=ModelType.PYTORCH,
                endpoint="http://pytorch-serving:8080/predictions/sentiment-analysis",
                version="v2.0",
                max_batch_size=256,
                cache_ttl=1800  # 30 minutes
            ),
        }
    
    def _setup_routes(self):
        """Setup API routes."""
        
        @self.app.on_event("startup")
        async def startup():
            await self._initialize_connections()
        
        @self.app.on_event("shutdown")
        async def shutdown():
            await self._cleanup_connections()
        
        @self.app.get("/health")
        async def health_check():
            """Health check endpoint."""
            return {"status": "healthy", "models": list(self.model_configs.keys())}
        
        @self.app.get("/models")
        async def list_models():
            """List available models."""
            return {
                "models": [
                    {
                        "name": config.name,
                        "type": config.model_type.value,
                        "version": config.version,
                        "endpoint": config.endpoint
                    }
                    for config in self.model_configs.values()
                ]
            }
        
        @self.app.post("/predict/{model_name}")
        async def predict(model_name: str, request: Dict[str, Any]):
            """Generic prediction endpoint."""
            if model_name not in self.model_configs:
                raise HTTPException(status_code=404, detail=f"Model {model_name} not found")
            
            config = self.model_configs[model_name]
            return await self._predict_with_cache(config, request)
        
        @self.app.post("/embed/text")
        async def text_embedding(request: Dict[str, Any]):
            """Text embedding endpoint."""
            return await self._predict_with_cache(
                self.model_configs["text-embedding"], 
                request
            )
        
        @self.app.post("/recommend/courses")
        async def recommend_courses(request: Dict[str, Any]):
            """Course recommendation endpoint."""
            return await self._predict_with_cache(
                self.model_configs["recommendation"], 
                request
            )
        
        @self.app.post("/learning/adaptive")
        async def adaptive_learning(request: Dict[str, Any]):
            """Adaptive learning endpoint."""
            return await self._predict_with_cache(
                self.model_configs["adaptive-learning"], 
                request
            )
        
        @self.app.post("/content/classify")
        async def classify_content(request: Dict[str, Any]):
            """Content classification endpoint."""
            return await self._predict_with_cache(
                self.model_configs["content-classification"], 
                request
            )
        
        @self.app.post("/sentiment/analyze")
        async def analyze_sentiment(request: Dict[str, Any]):
            """Sentiment analysis endpoint."""
            return await self._predict_with_cache(
                self.model_configs["sentiment-analysis"], 
                request
            )
        
        @self.app.post("/batch/predict/{model_name}")
        async def batch_predict(model_name: str, requests: List[Dict[str, Any]]):
            """Batch prediction endpoint."""
            if model_name not in self.model_configs:
                raise HTTPException(status_code=404, detail=f"Model {model_name} not found")
            
            config = self.model_configs[model_name]
            
            # Batch size validation
            if len(requests) > config.max_batch_size:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Batch size {len(requests)} exceeds maximum {config.max_batch_size}"
                )
            
            # Process batch
            results = await asyncio.gather(*[
                self._predict_with_cache(config, req) 
                for req in requests
            ])
            
            return {"results": results}
        
        @self.app.get("/metrics")
        async def prometheus_metrics():
            """Prometheus metrics endpoint."""
            return generate_latest()
        
        @self.app.post("/cache/clear/{model_name}")
        async def clear_cache(model_name: str):
            """Clear cache for a specific model."""
            if not self.redis_client:
                return {"status": "error", "message": "Redis not available"}
            
            pattern = f"ml_cache:{model_name}:*"
            keys = await self.redis_client.keys(pattern)
            if keys:
                await self.redis_client.delete(*keys)
                return {"status": "success", "cleared_keys": len(keys)}
            else:
                return {"status": "success", "cleared_keys": 0}
    
    async def _initialize_connections(self):
        """Initialize Redis and HTTP connections."""
        try:
            self.redis_client = redis.from_url(
                "redis://redis-service:6379/1",
                encoding="utf-8",
                decode_responses=True
            )
            await self.redis_client.ping()
            logger.info("Connected to Redis")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
        
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            connector=aiohttp.TCPConnector(limit=100)
        )
        logger.info("HTTP session initialized")
    
    async def _cleanup_connections(self):
        """Cleanup connections."""
        if self.session:
            await self.session.close()
        if self.redis_client:
            await self.redis_client.close()
    
    def _generate_cache_key(self, model_name: str, request: Dict[str, Any]) -> str:
        """Generate cache key for request."""
        request_str = json.dumps(request, sort_keys=True)
        hash_key = hashlib.md5(request_str.encode()).hexdigest()
        return f"ml_cache:{model_name}:{hash_key}"
    
    async def _get_from_cache(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Get result from cache."""
        if not self.redis_client:
            return None
        
        try:
            cached_result = await self.redis_client.get(cache_key)
            if cached_result:
                return json.loads(cached_result)
        except Exception as e:
            logger.error(f"Cache get error: {e}")
        
        return None
    
    async def _set_cache(self, cache_key: str, result: Dict[str, Any], ttl: int):
        """Set result in cache."""
        if not self.redis_client:
            return
        
        try:
            await self.redis_client.setex(
                cache_key, 
                ttl, 
                json.dumps(result)
            )
        except Exception as e:
            logger.error(f"Cache set error: {e}")
    
    async def _predict_with_cache(self, config: ModelConfig, request: Dict[str, Any]) -> Dict[str, Any]:
        """Predict with caching and metrics."""
        start_time = time.time()
        
        # Generate cache key
        cache_key = self._generate_cache_key(config.name, request)
        
        # Try cache first
        cached_result = await self._get_from_cache(cache_key)
        if cached_result:
            CACHE_HIT_RATE.set(1)
            return cached_result
        
        CACHE_HIT_RATE.set(0)
        
        try:
            # Make prediction
            result = await self._make_prediction(config, request)
            
            # Cache result
            await self._set_cache(cache_key, result, config.cache_ttl)
            
            # Update metrics
            REQUEST_COUNT.labels(model=config.name, endpoint="predict").inc()
            REQUEST_LATENCY.labels(model=config.name, endpoint="predict").observe(time.time() - start_time)
            
            return result
            
        except Exception as e:
            logger.error(f"Prediction error for {config.name}: {e}")
            REQUEST_COUNT.labels(model=config.name, endpoint="error").inc()
            raise HTTPException(status_code=500, detail=str(e))
    
    async def _make_prediction(self, config: ModelConfig, request: Dict[str, Any]) -> Dict[str, Any]:
        """Make prediction to model server."""
        if not self.session:
            raise HTTPException(status_code=503, detail="HTTP session not available")
        
        ACTIVE_CONNECTIONS.inc()
        
        try:
            async with self.session.post(
                config.endpoint,
                json=request,
                timeout=aiohttp.ClientTimeout(total=config.timeout)
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    
                    # Add metadata
                    result["metadata"] = {
                        "model": config.name,
                        "version": config.version,
                        "timestamp": time.time(),
                        "processing_time": time.time() - time.time()
                    }
                    
                    return result
                else:
                    error_text = await response.text()
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"Model server error: {error_text}"
                    )
        
        except asyncio.TimeoutError:
            raise HTTPException(status_code=504, detail="Prediction timeout")
        
        except aiohttp.ClientError as e:
            raise HTTPException(status_code=503, detail=f"Model server unavailable: {e}")
        
        finally:
            ACTIVE_CONNECTIONS.dec()

# Initialize gateway
gateway = MLInferenceGateway()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    uvicorn.run(
        "ml_inference_gateway:gateway.app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        workers=1,
        access_log=True
    )

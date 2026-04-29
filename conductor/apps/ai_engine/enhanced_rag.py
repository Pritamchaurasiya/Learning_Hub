# Enhanced RAG System with Multi-Modal Support
# Advanced retrieval-augmented generation with hybrid search and multi-modal processing

import asyncio
import json
import logging
import hashlib
import time
from typing import Dict, Any, List, Optional, Tuple, Union
from dataclasses import dataclass
from enum import Enum
import redis.asyncio as redis
import numpy as np

# Handle missing heavy ML dependencies gracefully (for testing/CI)
try:
    import aiohttp
    from elasticsearch import AsyncElasticsearch
    import PyPDF2
    import whisper
    import cv2
    from PIL import Image
    import torch
    from transformers import CLIPProcessor, CLIPModel
    from sentence_transformers import SentenceTransformer
except ImportError:
    aiohttp = None
    AsyncElasticsearch = None
    PyPDF2 = None
    whisper = None
    cv2 = None
    Image = None
    torch = None
    CLIPProcessor = None
    CLIPModel = None
    SentenceTransformer = None
from django.apps import apps
from django.db.models import Q, Count, Avg
from django.core.cache import cache
from prometheus_client import Counter, Histogram, Gauge

logger = logging.getLogger(__name__)

# Metrics
try:
    RAG_REQUESTS = Counter('rag_requests_total', 'Total RAG requests', ['search_type'])
    RAG_LATENCY = Histogram('rag_latency_seconds', 'RAG processing latency', ['search_type'])
    VECTOR_SEARCH_ACCURACY = Gauge('rag_vector_search_accuracy', 'Vector search accuracy')
    MULTIMODAL_PROCESSING_COUNT = Counter('rag_multimodal_processing_total', 'Multi-modal processing', ['modality'])
except ValueError:
    RAG_REQUESTS = Counter('rag_requests_total', 'Total RAG requests', ['search_type'], registry=None)
    RAG_LATENCY = Histogram('rag_latency_seconds', 'RAG processing latency', ['search_type'], registry=None)
    VECTOR_SEARCH_ACCURACY = Gauge('rag_vector_search_accuracy', 'Vector search accuracy', registry=None)
    MULTIMODAL_PROCESSING_COUNT = Counter('rag_multimodal_processing_total', 'Multi-modal processing', ['modality'], registry=None)

class ModalityType(Enum):
    TEXT = "text"
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"
    PDF = "pdf"

class SearchType(Enum):
    HYBRID = "hybrid"
    SEMANTIC = "semantic"
    KEYWORD = "keyword"
    MULTIMODAL = "multimodal"

@dataclass
class ContentChunk:
    id: str
    content: str
    modality: ModalityType
    source_id: int
    source_type: str
    metadata: Dict[str, Any]
    embedding: Optional[np.ndarray] = None
    relevance_score: float = 0.0

@dataclass
class SearchResult:
    chunks: List[ContentChunk]
    query: str
    search_type: SearchType
    total_results: int
    processing_time: float
    confidence_score: float

class MultiModalProcessor:
    """Multi-modal content processor for RAG system."""
    
    def __init__(self):
        self.clip_model = None
        self.clip_processor = None
        self.whisper_model = None
        self.text_encoder = None
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize multi-modal models."""
        try:
            # CLIP for image-text understanding
            self.clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
            self.clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
            
            # Whisper for audio transcription
            self.whisper_model = whisper.load_model("base")
            
            # Sentence transformer for text embeddings
            self.text_encoder = SentenceTransformer('all-MiniLM-L6-v2')
            
            logger.info("Multi-modal models initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize multi-modal models: {e}")
    
    async def process_text(self, text: str) -> Dict[str, Any]:
        """Process text content."""
        try:
            # Generate text embedding
            embedding = self.text_encoder.encode(text, convert_to_numpy=True)
            
            # Extract text features
            features = {
                'length': len(text),
                'word_count': len(text.split()),
                'sentence_count': text.count('.') + text.count('!') + text.count('?'),
                'language': self._detect_language(text),
                'embedding': embedding.tolist()
            }
            
            return {
                'modality': ModalityType.TEXT,
                'content': text,
                'features': features,
                'embedding': embedding
            }
        except Exception as e:
            logger.error(f"Text processing error: {e}")
            return None
    
    async def process_image(self, image_path: str) -> Dict[str, Any]:
        """Process image content."""
        try:
            # Load image
            image = Image.open(image_path)
            
            # Generate CLIP embedding
            inputs = self.clip_processor(images=image, return_tensors="pt")
            with torch.no_grad():
                embedding = self.clip_model.get_image_features(**inputs)
                embedding = embedding.cpu().numpy().flatten()
            
            # Extract image features
            features = {
                'size': image.size,
                'mode': image.mode,
                'format': image.format,
                'embedding': embedding.tolist()
            }
            
            return {
                'modality': ModalityType.IMAGE,
                'content': f"Image: {image_path}",
                'features': features,
                'embedding': embedding
            }
        except Exception as e:
            logger.error(f"Image processing error: {e}")
            return None
    
    async def process_audio(self, audio_path: str) -> Dict[str, Any]:
        """Process audio content."""
        try:
            # Transcribe audio using Whisper
            result = self.whisper_model.transcribe(audio_path)
            transcript = result['text']
            
            # Generate text embedding from transcript
            text_embedding = self.text_encoder.encode(transcript, convert_to_numpy=True)
            
            # Extract audio features
            features = {
                'duration': result.get('duration', 0),
                'language': result.get('language', 'unknown'),
                'transcript': transcript,
                'embedding': text_embedding.tolist()
            }
            
            return {
                'modality': ModalityType.AUDIO,
                'content': transcript,
                'features': features,
                'embedding': text_embedding
            }
        except Exception as e:
            logger.error(f"Audio processing error: {e}")
            return None
    
    async def process_pdf(self, pdf_path: str) -> Dict[str, Any]:
        """Process PDF content."""
        try:
            # Extract text from PDF
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
            
            # Generate text embedding
            embedding = self.text_encoder.encode(text, convert_to_numpy=True)
            
            # Extract PDF features
            features = {
                'page_count': len(pdf_reader.pages),
                'title': pdf_reader.metadata.get('/Title', '') if pdf_reader.metadata else '',
                'author': pdf_reader.metadata.get('/Author', '') if pdf_reader.metadata else '',
                'embedding': embedding.tolist()
            }
            
            return {
                'modality': ModalityType.PDF,
                'content': text,
                'features': features,
                'embedding': embedding
            }
        except Exception as e:
            logger.error(f"PDF processing error: {e}")
            return None
    
    def _detect_language(self, text: str) -> str:
        """Detect language of text (simplified)."""
        # Simple language detection based on character sets
        if any(ord(char) > 127 for char in text[:100]):
            return "non_english"
        return "english"

class HybridSearchEngine:
    """Hybrid search engine combining semantic and keyword search."""
    
    def __init__(self):
        self.elasticsearch_client: Optional[AsyncElasticsearch] = None
        self.multimodal_processor = MultiModalProcessor()
        self.cache_client: Optional[redis.Redis] = None
        self._initialize_connections()
    
    def _initialize_connections(self):
        """Initialize Elasticsearch and Redis connections."""
        try:
            # Elasticsearch connection
            if AsyncElasticsearch is not None:
                self.elasticsearch_client = AsyncElasticsearch(
                hosts=["elasticsearch:9200"],
                timeout=30
            )
            
            # Redis connection
            self.cache_client = redis.from_url(
                "redis://redis-service:6379/3",
                encoding="utf-8",
                decode_responses=True
            )
            
            logger.info("Hybrid search engine initialized")
        except Exception as e:
            logger.error(f"Failed to initialize search engine: {e}")
    
    async def search(self, query: str, search_type: SearchType = SearchType.HYBRID, 
                    limit: int = 10, modalities: List[ModalityType] = None) -> SearchResult:
        """Perform hybrid search across multiple modalities."""
        start_time = time.time()
        
        try:
            # Generate cache key
            cache_key = self._generate_cache_key(query, search_type, limit, modalities)
            
            # Check cache
            cached_result = await self._get_cache(cache_key)
            if cached_result:
                return SearchResult(**cached_result)
            
            # Perform search based on type
            if search_type == SearchType.HYBRID:
                results = await self._hybrid_search(query, limit, modalities)
            elif search_type == SearchType.SEMANTIC:
                results = await self._semantic_search(query, limit, modalities)
            elif search_type == SearchType.KEYWORD:
                results = await self._keyword_search(query, limit, modalities)
            elif search_type == SearchType.MULTIMODAL:
                results = await self._multimodal_search(query, limit, modalities)
            else:
                raise ValueError(f"Unsupported search type: {search_type}")
            
            # Calculate processing time
            processing_time = time.time() - start_time
            
            # Create search result
            search_result = SearchResult(
                chunks=results['chunks'],
                query=query,
                search_type=search_type,
                total_results=results['total'],
                processing_time=processing_time,
                confidence_score=results['confidence']
            )
            
            # Cache result
            await self._set_cache(cache_key, search_result.__dict__, ttl=1800)  # 30 minutes
            
            # Update metrics
            RAG_REQUESTS.labels(search_type=search_type.value).inc()
            RAG_LATENCY.labels(search_type=search_type.value).observe(processing_time)
            
            return search_result
            
        except Exception as e:
            logger.error(f"Search error: {e}")
            return SearchResult(
                chunks=[],
                query=query,
                search_type=search_type,
                total_results=0,
                processing_time=time.time() - start_time,
                confidence_score=0.0
            )
    
    async def _hybrid_search(self, query: str, limit: int, 
                           modalities: List[ModalityType] = None) -> Dict[str, Any]:
        """Perform hybrid search combining semantic and keyword search."""
        # Run semantic and keyword searches in parallel
        semantic_task = asyncio.create_task(self._semantic_search(query, limit, modalities))
        keyword_task = asyncio.create_task(self._keyword_search(query, limit, modalities))
        
        semantic_results, keyword_results = await asyncio.gather(semantic_task, keyword_task)
        
        # Combine and re-rank results
        combined_chunks = self._combine_results(
            semantic_results['chunks'], 
            keyword_results['chunks']
        )
        
        # Apply re-ranking
        reranked_chunks = await self._rerank_results(query, combined_chunks)
        
        return {
            'chunks': reranked_chunks[:limit],
            'total': len(reranked_chunks),
            'confidence': self._calculate_confidence(reranked_chunks[:limit])
        }
    
    async def _semantic_search(self, query: str, limit: int, 
                              modalities: List[ModalityType] = None) -> Dict[str, Any]:
        """Perform semantic search using vector embeddings."""
        try:
            # Generate query embedding
            query_embedding = self.multimodal_processor.text_encoder.encode(query, convert_to_numpy=True)
            
            # Build Elasticsearch query
            search_body = {
                "size": limit,
                "query": {
                    "script_score": {
                        "query": {"match_all": {}},
                        "script": {
                            "source": "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
                            "params": {"query_vector": query_embedding.tolist()}
                        }
                    }
                }
            }
            
            # Filter by modalities if specified
            if modalities:
                search_body["query"]["script_score"]["query"] = {
                    "bool": {
                        "must": [{"match_all": {}}],
                        "filter": [
                            {"terms": {"modality": [m.value for m in modalities]}}
                        ]
                    }
                }
            
            # Execute search
            response = await self.elasticsearch_client.search(
                index="multimodal_content",
                body=search_body
            )
            
            # Process results
            chunks = []
            for hit in response['hits']['hits']:
                chunk = ContentChunk(
                    id=hit['_id'],
                    content=hit['_source']['content'],
                    modality=ModalityType(hit['_source']['modality']),
                    source_id=hit['_source']['source_id'],
                    source_type=hit['_source']['source_type'],
                    metadata=hit['_source'].get('metadata', {}),
                    relevance_score=hit['_score']
                )
                chunks.append(chunk)
            
            return {
                'chunks': chunks,
                'total': response['hits']['total']['value'],
                'confidence': self._calculate_confidence(chunks)
            }
            
        except Exception as e:
            logger.error(f"Semantic search error: {e}")
            return {'chunks': [], 'total': 0, 'confidence': 0.0}
    
    async def _keyword_search(self, query: str, limit: int, 
                             modalities: List[ModalityType] = None) -> Dict[str, Any]:
        """Perform keyword search using Elasticsearch."""
        try:
            # Build Elasticsearch query
            search_body = {
                "size": limit,
                "query": {
                    "multi_match": {
                        "query": query,
                        "fields": ["content^2", "title", "metadata.*"],
                        "type": "best_fields",
                        "fuzziness": "AUTO"
                    }
                }
            }
            
            # Filter by modalities if specified
            if modalities:
                search_body["query"]["bool"] = {
                    "must": [search_body["query"]],
                    "filter": [
                        {"terms": {"modality": [m.value for m in modalities]}}
                    ]
                }
                del search_body["query"]["multi_match"]
            
            # Execute search
            response = await self.elasticsearch_client.search(
                index="multimodal_content",
                body=search_body
            )
            
            # Process results
            chunks = []
            for hit in response['hits']['hits']:
                chunk = ContentChunk(
                    id=hit['_id'],
                    content=hit['_source']['content'],
                    modality=ModalityType(hit['_source']['modality']),
                    source_id=hit['_source']['source_id'],
                    source_type=hit['_source']['source_type'],
                    metadata=hit['_source'].get('metadata', {}),
                    relevance_score=hit['_score']
                )
                chunks.append(chunk)
            
            return {
                'chunks': chunks,
                'total': response['hits']['total']['value'],
                'confidence': self._calculate_confidence(chunks)
            }
            
        except Exception as e:
            logger.error(f"Keyword search error: {e}")
            return {'chunks': [], 'total': 0, 'confidence': 0.0}
    
    async def _multimodal_search(self, query: str, limit: int, 
                                modalities: List[ModalityType] = None) -> Dict[str, Any]:
        """Perform multi-modal search across different content types."""
        if not modalities:
            modalities = [ModalityType.TEXT, ModalityType.IMAGE, ModalityType.AUDIO, ModalityType.PDF]
        
        # Process query for each modality
        modality_results = {}
        
        for modality in modalities:
            try:
                if modality == ModalityType.TEXT:
                    result = await self._semantic_search(query, limit, [ModalityType.TEXT])
                elif modality == ModalityType.IMAGE:
                    result = await self._image_search(query, limit)
                elif modality == ModalityType.AUDIO:
                    result = await self._audio_search(query, limit)
                elif modality == ModalityType.PDF:
                    result = await self._semantic_search(query, limit, [ModalityType.PDF])
                
                modality_results[modality] = result
                MULTIMODAL_PROCESSING_COUNT.labels(modality=modality.value).inc()
                
            except Exception as e:
                logger.error(f"Multi-modal search error for {modality}: {e}")
                modality_results[modality] = {'chunks': [], 'total': 0, 'confidence': 0.0}
        
        # Combine results from all modalities
        all_chunks = []
        for result in modality_results.values():
            all_chunks.extend(result['chunks'])
        
        # Re-rank combined results
        reranked_chunks = await self._rerank_results(query, all_chunks)
        
        return {
            'chunks': reranked_chunks[:limit],
            'total': len(reranked_chunks),
            'confidence': self._calculate_confidence(reranked_chunks[:limit])
        }
    
    async def _image_search(self, query: str, limit: int) -> Dict[str, Any]:
        """Search for images using CLIP."""
        try:
            # Generate text embedding for query
            text_embedding = self.multimodal_processor.text_encoder.encode(query, convert_to_numpy=True)
            
            # Search for similar images in Elasticsearch
            search_body = {
                "size": limit,
                "query": {
                    "script_score": {
                        "query": {"term": {"modality": "image"}},
                        "script": {
                            "source": "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
                            "params": {"query_vector": text_embedding.tolist()}
                        }
                    }
                }
            }
            
            response = await self.elasticsearch_client.search(
                index="multimodal_content",
                body=search_body
            )
            
            # Process results
            chunks = []
            for hit in response['hits']['hits']:
                chunk = ContentChunk(
                    id=hit['_id'],
                    content=hit['_source']['content'],
                    modality=ModalityType.IMAGE,
                    source_id=hit['_source']['source_id'],
                    source_type=hit['_source']['source_type'],
                    metadata=hit['_source'].get('metadata', {}),
                    relevance_score=hit['_score']
                )
                chunks.append(chunk)
            
            return {
                'chunks': chunks,
                'total': response['hits']['total']['value'],
                'confidence': self._calculate_confidence(chunks)
            }
            
        except Exception as e:
            logger.error(f"Image search error: {e}")
            return {'chunks': [], 'total': 0, 'confidence': 0.0}
    
    async def _audio_search(self, query: str, limit: int) -> Dict[str, Any]:
        """Search for audio content."""
        # Similar to image search but for audio modality
        return await self._semantic_search(query, limit, [ModalityType.AUDIO])
    
    def _combine_results(self, semantic_chunks: List[ContentChunk], 
                         keyword_chunks: List[ContentChunk]) -> List[ContentChunk]:
        """Combine semantic and keyword search results."""
        # Create a dictionary to avoid duplicates
        combined = {}
        
        # Add semantic results
        for chunk in semantic_chunks:
            combined[chunk.id] = chunk
            chunk.relevance_score *= 1.2  # Boost semantic results
        
        # Add keyword results
        for chunk in keyword_chunks:
            if chunk.id in combined:
                # Combine scores
                combined[chunk.id].relevance_score = (
                    combined[chunk.id].relevance_score * 0.7 + 
                    chunk.relevance_score * 0.3
                )
            else:
                combined[chunk.id] = chunk
                chunk.relevance_score *= 0.8  # Slightly lower weight for keyword-only
        
        return list(combined.values())
    
    async def _rerank_results(self, query: str, chunks: List[ContentChunk]) -> List[ContentChunk]:
        """Re-rank search results using cross-encoder."""
        try:
            # Generate query embedding
            query_embedding = self.multimodal_processor.text_encoder.encode(query, convert_to_numpy=True)
            
            # Calculate similarity scores
            for chunk in chunks:
                if chunk.embedding is not None:
                    # Calculate cosine similarity
                    similarity = np.dot(query_embedding, chunk.embedding) / (
                        np.linalg.norm(query_embedding) * np.linalg.norm(chunk.embedding)
                    )
                    chunk.relevance_score = (chunk.relevance_score + similarity) / 2
                else:
                    # Fallback to original score
                    pass
            
            # Sort by relevance score
            chunks.sort(key=lambda x: x.relevance_score, reverse=True)
            
            return chunks
            
        except Exception as e:
            logger.error(f"Re-ranking error: {e}")
            return chunks
    
    def _calculate_confidence(self, chunks: List[ContentChunk]) -> float:
        """Calculate confidence score for search results."""
        if not chunks:
            return 0.0
        
        # Average relevance score as confidence
        avg_score = sum(chunk.relevance_score for chunk in chunks) / len(chunks)
        
        # Normalize to 0-1 range
        return min(1.0, max(0.0, avg_score / 2.0))
    
    def _generate_cache_key(self, query: str, search_type: SearchType, 
                           limit: int, modalities: List[ModalityType]) -> str:
        """Generate cache key for search."""
        query_hash = hashlib.md5(query.lower().encode()).hexdigest()
        modality_str = ",".join([m.value for m in modalities]) if modalities else "all"
        return f"rag_search:{search_type.value}:{query_hash}:{limit}:{modality_str}"
    
    async def _get_cache(self, key: str) -> Optional[Dict[str, Any]]:
        """Get result from cache."""
        if not self.cache_client:
            return None
        
        try:
            cached = await self.cache_client.get(key)
            if cached:
                return json.loads(cached)
        except Exception as e:
            logger.error(f"Cache get error: {e}")
        
        return None
    
    async def _set_cache(self, key: str, value: Dict[str, Any], ttl: int = 1800):
        """Set result in cache."""
        if not self.cache_client:
            return
        
        try:
            await self.cache_client.setex(key, ttl, json.dumps(value))
        except Exception as e:
            logger.error(f"Cache set error: {e}")

class EnhancedRAGService:
    """Enhanced RAG service with multi-modal support and hybrid search."""
    
    def __init__(self):
        self.search_engine = HybridSearchEngine()
        self.multimodal_processor = MultiModalProcessor()
        self.cache_client: Optional[redis.Redis] = None
        self._initialize_connections()
    
    def _initialize_connections(self):
        """Initialize connections."""
        try:
            self.cache_client = redis.from_url(
                "redis://redis-service:6379/4",
                encoding="utf-8",
                decode_responses=True
            )
            # await self.cache_client.ping()
            logger.info("Enhanced RAG service initialized")
        except Exception as e:
            logger.error(f"Failed to initialize RAG service: {e}")
    
    async def get_context_for_query(self, query: str, limit: int = 5, 
                                  search_type: SearchType = SearchType.HYBRID,
                                  modalities: List[ModalityType] = None) -> str:
        """Get relevant context for a query using enhanced RAG."""
        try:
            # Perform search
            search_result = await self.search_engine.search(
                query=query,
                search_type=search_type,
                limit=limit,
                modalities=modalities
            )
            
            if not search_result.chunks:
                return "No relevant context found. Please provide more specific information."
            
            # Format context
            context_parts = []
            for i, chunk in enumerate(search_result.chunks, 1):
                context_part = f"[{chunk.modality.value.upper()} #{i}] {chunk.content}"
                if chunk.metadata:
                    context_part += f"\nMetadata: {json.dumps(chunk.metadata, indent=2)}"
                context_parts.append(context_part)
            
            # Add search metadata
            context_header = f"""Enhanced RAG Context (Search Type: {search_type.value})
Query: {query}
Results Found: {search_result.total_results}
Confidence: {search_result.confidence_score:.2f}
Processing Time: {search_result.processing_time:.3f}s

"""
            
            context = context_header + "\n\n".join(context_parts)
            
            return context
            
        except Exception as e:
            logger.error(f"Enhanced RAG context generation error: {e}")
            return "Error generating context. Please try again."
    
    async def index_content(self, content: str, modality: ModalityType,
                           source_id: int, source_type: str, 
                           metadata: Dict[str, Any] = None) -> bool:
        """Index content in the RAG system."""
        try:
            # Process content based on modality
            if modality == ModalityType.TEXT:
                processed = await self.multimodal_processor.process_text(content)
            elif modality == ModalityType.IMAGE:
                processed = await self.multimodal_processor.process_image(content)
            elif modality == ModalityType.AUDIO:
                processed = await self.multimodal_processor.process_audio(content)
            elif modality == ModalityType.PDF:
                processed = await self.multimodal_processor.process_pdf(content)
            else:
                logger.error(f"Unsupported modality: {modality}")
                return False
            
            if not processed:
                return False
            
            # Create document for Elasticsearch
            doc = {
                'content': processed['content'],
                'modality': modality.value,
                'source_id': source_id,
                'source_type': source_type,
                'metadata': metadata or {},
                'embedding': processed['embedding'].tolist(),
                'features': processed['features'],
                'indexed_at': time.time()
            }
            
            # Index in Elasticsearch
            await self.search_engine.elasticsearch_client.index(
                index="multimodal_content",
                body=doc
            )
            
            logger.info(f"Indexed {modality.value} content for source {source_id}")
            return True
            
        except Exception as e:
            logger.error(f"Content indexing error: {e}")
            return False

# Global RAG service instance
enhanced_rag_service = EnhancedRAGService()

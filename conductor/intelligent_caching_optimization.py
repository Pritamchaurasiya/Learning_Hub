# Intelligent Caching & Optimization Strategies
"""
Advanced multi-layer caching system with intelligent optimization and adaptive strategies
"""

import os
import sys
import time
import json
import logging
import asyncio
import threading
import queue
import hashlib
import pickle
import zlib
import lzma
import redis
import memcache
from typing import Dict, List, Any, Optional, Tuple, Union, Callable, TypeVar, Generic
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
from pathlib import Path
import statistics
import traceback
import psutil
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import wraps, lru_cache
import schedule

# Setup Django
try:
    import django
    from django.conf import settings
    from django.core.cache import cache as django_cache
    from django.db import connection, connections
    from django.core.management import execute_from_command_line
    from django.apps import apps
    from django.test import Client
    from django.urls import reverse
    
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
    django.setup()
    
    DJANGO_AVAILABLE = True
except ImportError:
    DJANGO_AVAILABLE = False
    print("Warning: Django not available")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

T = TypeVar('T')

class CacheLevel(Enum):
    """Cache levels in the hierarchy."""
    L1_MEMORY = "l1_memory"      # Fastest, smallest
    L2_LOCAL = "l2_local"        # Redis/Memcached
    L3_DISTRIBUTED = "l3_distributed"  # Cluster cache
    L4_PERSISTENT = "l4_persistent"    # Disk-based cache

class CacheStrategy(Enum):
    """Cache eviction strategies."""
    LRU = "lru"                  # Least Recently Used
    LFU = "lfu"                  # Least Frequently Used
    FIFO = "fifo"                # First In, First Out
    RANDOM = "random"             # Random eviction
    TTL_BASED = "ttl_based"      # Time-to-live based
    ADAPTIVE = "adaptive"         # Adaptive strategy

class OptimizationType(Enum):
    """Optimization types."""
    QUERY_OPTIMIZATION = "query_optimization"
    INDEX_OPTIMIZATION = "index_optimization"
    CONNECTION_POOLING = "connection_pooling"
    BATCH_PROCESSING = "batch_processing"
    LAZY_LOADING = "lazy_loading"
    PREFETCHING = "prefetching"
    COMPRESSION = "compression"
    SERIALIZATION = "serialization"

@dataclass
class CacheEntry:
    """Cache entry data structure."""
    key: str
    value: Any
    level: CacheLevel
    created_at: datetime
    last_accessed: datetime
    access_count: int = 0
    size: int = 0
    ttl: Optional[int] = None
    expires_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    compressed: bool = False
    serialized: bool = False

@dataclass
class CacheMetrics:
    """Cache performance metrics."""
    total_requests: int = 0
    cache_hits: int = 0
    cache_misses: int = 0
    hit_rate: float = 0.0
    total_size: int = 0
    eviction_count: int = 0
    compression_ratio: float = 0.0
    avg_response_time: float = 0.0
    memory_usage: int = 0
    network_bandwidth: int = 0

@dataclass
class OptimizationResult:
    """Optimization result data structure."""
    optimization_type: OptimizationType
    timestamp: datetime
    before_metrics: Dict[str, float]
    after_metrics: Dict[str, float]
    improvement_percent: float
    applied: bool = False
    recommendations: List[str] = field(default_factory=list)

class IntelligentCacheSystem(Generic[T]):
    """Intelligent multi-layer caching system with optimization."""
    
    def __init__(self):
        self.l1_cache: Dict[str, CacheEntry] = {}
        self.l2_cache = None  # Redis/Memcached
        self.l3_cache = None  # Distributed cache
        self.l4_cache_path = Path("/tmp/intelligent_cache")
        self.l4_cache_path.mkdir(exist_ok=True)
        
        # Cache configuration
        self.cache_config = {
            CacheLevel.L1_MEMORY: {
                "max_size": 1000,
                "max_memory": 100 * 1024 * 1024,  # 100MB
                "strategy": CacheStrategy.LRU,
                "ttl": 300  # 5 minutes
            },
            CacheLevel.L2_LOCAL: {
                "max_size": 10000,
                "max_memory": 500 * 1024 * 1024,  # 500MB
                "strategy": CacheStrategy.LFU,
                "ttl": 1800  # 30 minutes
            },
            CacheLevel.L3_DISTRIBUTED: {
                "max_size": 100000,
                "max_memory": 2 * 1024 * 1024 * 1024,  # 2GB
                "strategy": CacheStrategy.ADAPTIVE,
                "ttl": 3600  # 1 hour
            },
            CacheLevel.L4_PERSISTENT: {
                "max_size": 1000000,
                "max_memory": 10 * 1024 * 1024 * 1024,  # 10GB
                "strategy": CacheStrategy.TTL_BASED,
                "ttl": 86400  # 24 hours
            }
        }
        
        # Metrics
        self.metrics = {
            level: CacheMetrics() for level in CacheLevel
        }
        
        # Optimization results
        self.optimization_results: List[OptimizationResult] = []
        
        # Thread pool for async operations
        self.executor = ThreadPoolExecutor(max_workers=4)
        
        # Background tasks
        self.running = False
        self.maintenance_thread = None
        self.optimization_thread = None
        
        # Initialize cache layers
        self._initialize_cache_layers()
        
        # Setup maintenance tasks
        self._setup_maintenance_tasks()
    
    def _initialize_cache_layers(self):
        """Initialize cache layers."""
        try:
            # Initialize L2 cache (Redis/Memcached)
            try:
                import redis
                self.l2_cache = redis.Redis(
                    host='localhost',
                    port=6379,
                    db=0,
                    decode_responses=False
                )
                self.l2_cache.ping()
                logger.info("L2 Redis cache initialized")
            except Exception as e:
                logger.warning(f"Redis not available, using memory cache for L2: {e}")
                self.l2_cache = {}
            
            # Initialize L3 distributed cache
            try:
                import redis
                self.l3_cache = redis.Redis(
                    host='localhost',
                    port=6379,
                    db=1,
                    decode_responses=False
                )
                self.l3_cache.ping()
                logger.info("L3 distributed cache initialized")
            except Exception as e:
                logger.warning(f"Distributed cache not available: {e}")
                self.l3_cache = {}
        
        except Exception as e:
            logger.error(f"Error initializing cache layers: {e}")
    
    def _setup_maintenance_tasks(self):
        """Setup maintenance tasks."""
        # Schedule cache maintenance
        schedule.every(5).minutes.do(self._cleanup_expired_entries)
        schedule.every(10).minutes.do(self._optimize_cache_performance)
        schedule.every().hour.do(self._analyze_cache_patterns)
        schedule.every().day.at("02:00").do(self._cache_maintenance)
    
    def start_cache_system(self):
        """Start the intelligent cache system."""
        if self.running:
            logger.warning("Cache system is already running")
            return
        
        self.running = True
        logger.info("Starting intelligent cache system...")
        
        # Start background threads
        self.maintenance_thread = threading.Thread(target=self._maintenance_loop, daemon=True)
        self.optimization_thread = threading.Thread(target=self._optimization_loop, daemon=True)
        
        self.maintenance_thread.start()
        self.optimization_thread.start()
        
        logger.info("Intelligent cache system started successfully")
    
    def stop_cache_system(self):
        """Stop the intelligent cache system."""
        if not self.running:
            logger.warning("Cache system is not running")
            return
        
        self.running = False
        logger.info("Stopping intelligent cache system...")
        
        # Wait for threads to finish
        if self.maintenance_thread:
            self.maintenance_thread.join(timeout=10)
        if self.optimization_thread:
            self.optimization_thread.join(timeout=10)
        
        # Shutdown executor
        self.executor.shutdown(wait=True)
        
        logger.info("Intelligent cache system stopped")
    
    def _maintenance_loop(self):
        """Maintenance loop for cache operations."""
        while self.running:
            try:
                # Run scheduled tasks
                schedule.run_pending()
                
                # Clean up expired entries
                self._cleanup_expired_entries()
                
                # Optimize cache performance
                self._optimize_cache_performance()
                
                # Sleep before next iteration
                time.sleep(60)
                
            except Exception as e:
                logger.error(f"Error in maintenance loop: {e}")
                time.sleep(30)
    
    def _optimization_loop(self):
        """Optimization loop for continuous improvement."""
        while self.running:
            try:
                # Analyze cache patterns
                self._analyze_cache_patterns()
                
                # Apply optimizations
                self._apply_intelligent_optimizations()
                
                # Sleep before next iteration
                time.sleep(300)  # 5 minutes
                
            except Exception as e:
                logger.error(f"Error in optimization loop: {e}")
                time.sleep(60)
    
    def get(self, key: str, default: Optional[T] = None) -> Optional[T]:
        """Get value from cache with intelligent layer selection."""
        try:
            start_time = time.time()
            
            # Try L1 cache first
            value = self._get_from_l1(key)
            if value is not None:
                self._update_metrics(CacheLevel.L1_MEMORY, hit=True, response_time=time.time() - start_time)
                return value
            
            # Try L2 cache
            value = self._get_from_l2(key)
            if value is not None:
                # Promote to L1
                self._set_to_l1(key, value)
                self._update_metrics(CacheLevel.L2_LOCAL, hit=True, response_time=time.time() - start_time)
                return value
            
            # Try L3 cache
            value = self._get_from_l3(key)
            if value is not None:
                # Promote to higher levels
                self._set_to_l2(key, value)
                self._set_to_l1(key, value)
                self._update_metrics(CacheLevel.L3_DISTRIBUTED, hit=True, response_time=time.time() - start_time)
                return value
            
            # Try L4 cache
            value = self._get_from_l4(key)
            if value is not None:
                # Promote to higher levels
                self._set_to_l3(key, value)
                self._set_to_l2(key, value)
                self._set_to_l1(key, value)
                self._update_metrics(CacheLevel.L4_PERSISTENT, hit=True, response_time=time.time() - start_time)
                return value
            
            # Cache miss
            for level in CacheLevel:
                self._update_metrics(level, hit=False, response_time=time.time() - start_time)
            
            return default
        
        except Exception as e:
            logger.error(f"Error getting cache key {key}: {e}")
            return default
    
    def set(self, key: str, value: T, ttl: Optional[int] = None, level: Optional[CacheLevel] = None) -> bool:
        """Set value in cache with intelligent level selection."""
        try:
            # Determine optimal cache level
            if level is None:
                level = self._determine_cache_level(key, value)
            
            # Prepare cache entry
            entry = self._prepare_cache_entry(key, value, ttl, level)
            
            # Store in appropriate level(s)
            success = True
            
            if level == CacheLevel.L1_MEMORY:
                success &= self._set_to_l1(key, value, ttl)
            elif level == CacheLevel.L2_LOCAL:
                success &= self._set_to_l2(key, value, ttl)
                success &= self._set_to_l1(key, value, ttl)
            elif level == CacheLevel.L3_DISTRIBUTED:
                success &= self._set_to_l3(key, value, ttl)
                success &= self._set_to_l2(key, value, ttl)
                success &= self._set_to_l1(key, value, ttl)
            elif level == CacheLevel.L4_PERSISTENT:
                success &= self._set_to_l4(key, value, ttl)
                success &= self._set_to_l3(key, value, ttl)
                success &= self._set_to_l2(key, value, ttl)
                success &= self._set_to_l1(key, value, ttl)
            
            return success
        
        except Exception as e:
            logger.error(f"Error setting cache key {key}: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete key from all cache levels."""
        try:
            success = True
            
            # Delete from all levels
            success &= self._delete_from_l1(key)
            success &= self._delete_from_l2(key)
            success &= self._delete_from_l3(key)
            success &= self._delete_from_l4(key)
            
            return success
        
        except Exception as e:
            logger.error(f"Error deleting cache key {key}: {e}")
            return False
    
    def _determine_cache_level(self, key: str, value: T) -> CacheLevel:
        """Determine optimal cache level based on access patterns and data characteristics."""
        try:
            # Analyze key characteristics
            key_size = len(key.encode('utf-8'))
            value_size = self._get_value_size(value)
            
            # Analyze access patterns
            access_pattern = self._analyze_access_pattern(key)
            
            # Determine level based on heuristics
            if access_pattern["frequency"] > 10 and access_pattern["recency"] < 3600:  # High frequency, recent
                return CacheLevel.L1_MEMORY
            elif access_pattern["frequency"] > 5 and access_pattern["recency"] < 7200:  # Medium frequency, recent
                return CacheLevel.L2_LOCAL
            elif value_size < 1024 * 1024:  # Small values
                return CacheLevel.L3_DISTRIBUTED
            else:  # Large values or infrequent access
                return CacheLevel.L4_PERSISTENT
        
        except Exception as e:
            logger.error(f"Error determining cache level: {e}")
            return CacheLevel.L2_LOCAL
    
    def _prepare_cache_entry(self, key: str, value: T, ttl: Optional[int], level: CacheLevel) -> CacheEntry:
        """Prepare cache entry with optimization."""
        try:
            now = datetime.now()
            value_size = self._get_value_size(value)
            
            # Determine if compression is beneficial
            should_compress = value_size > 1024  # Compress if > 1KB
            compressed_value = value
            compression_ratio = 1.0
            
            if should_compress:
                compressed_value = self._compress_value(value)
                compressed_size = len(compressed_value) if isinstance(compressed_value, bytes) else self._get_value_size(compressed_value)
                compression_ratio = compressed_size / value_size
                
                # Only use compression if it reduces size
                if compression_ratio < 0.8:
                    value_size = compressed_size
                else:
                    compressed_value = value
                    compression_ratio = 1.0
            
            # Determine if serialization is needed
            should_serialize = not isinstance(compressed_value, (str, int, float, bool, bytes))
            serialized_value = compressed_value
            
            if should_serialize:
                serialized_value = self._serialize_value(compressed_value)
            
            # Calculate expiration
            expires_at = None
            if ttl:
                expires_at = now + timedelta(seconds=ttl)
            
            return CacheEntry(
                key=key,
                value=serialized_value,
                level=level,
                created_at=now,
                last_accessed=now,
                size=value_size,
                ttl=ttl,
                expires_at=expires_at,
                compressed=should_compress and compression_ratio < 0.8,
                serialized=should_serialize,
                metadata={
                    "original_size": self._get_value_size(value),
                    "compression_ratio": compression_ratio
                }
            )
        
        except Exception as e:
            logger.error(f"Error preparing cache entry: {e}")
            raise
    
    def _get_from_l1(self, key: str) -> Optional[T]:
        """Get value from L1 cache."""
        try:
            if key in self.l1_cache:
                entry = self.l1_cache[key]
                
                # Check expiration
                if entry.expires_at and entry.expires_at < datetime.now():
                    del self.l1_cache[key]
                    return None
                
                # Update access info
                entry.last_accessed = datetime.now()
                entry.access_count += 1
                
                # Deserialize and decompress if needed
                return self._restore_value(entry.value, entry.compressed, entry.serialized)
            
            return None
        
        except Exception as e:
            logger.error(f"Error getting from L1 cache: {e}")
            return None
    
    def _get_from_l2(self, key: str) -> Optional[T]:
        """Get value from L2 cache."""
        try:
            if self.l2_cache is None:
                return None
            
            if isinstance(self.l2_cache, dict):
                # Memory fallback
                if key in self.l2_cache:
                    entry_data = self.l2_cache[key]
                    entry = pickle.loads(entry_data)
                    
                    # Check expiration
                    if entry.expires_at and entry.expires_at < datetime.now():
                        del self.l2_cache[key]
                        return None
                    
                    return self._restore_value(entry.value, entry.compressed, entry.serialized)
            else:
                # Redis
                entry_data = self.l2_cache.get(key)
                if entry_data:
                    entry = pickle.loads(entry_data)
                    
                    # Check expiration
                    if entry.expires_at and entry.expires_at < datetime.now():
                        self.l2_cache.delete(key)
                        return None
                    
                    return self._restore_value(entry.value, entry.compressed, entry.serialized)
            
            return None
        
        except Exception as e:
            logger.error(f"Error getting from L2 cache: {e}")
            return None
    
    def _get_from_l3(self, key: str) -> Optional[T]:
        """Get value from L3 cache."""
        try:
            if self.l3_cache is None:
                return None
            
            if isinstance(self.l3_cache, dict):
                # Memory fallback
                if key in self.l3_cache:
                    entry_data = self.l3_cache[key]
                    entry = pickle.loads(entry_data)
                    
                    # Check expiration
                    if entry.expires_at and entry.expires_at < datetime.now():
                        del self.l3_cache[key]
                        return None
                    
                    return self._restore_value(entry.value, entry.compressed, entry.serialized)
            else:
                # Redis
                entry_data = self.l3_cache.get(key)
                if entry_data:
                    entry = pickle.loads(entry_data)
                    
                    # Check expiration
                    if entry.expires_at and entry.expires_at < datetime.now():
                        self.l3_cache.delete(key)
                        return None
                    
                    return self._restore_value(entry.value, entry.compressed, entry.serialized)
            
            return None
        
        except Exception as e:
            logger.error(f"Error getting from L3 cache: {e}")
            return None
    
    def _get_from_l4(self, key: str) -> Optional[T]:
        """Get value from L4 cache (disk)."""
        try:
            cache_file = self.l4_cache_path / f"{hashlib.md5(key.encode()).hexdigest()}.cache"
            
            if cache_file.exists():
                with open(cache_file, 'rb') as f:
                    entry_data = f.read()
                
                entry = pickle.loads(entry_data)
                
                # Check expiration
                if entry.expires_at and entry.expires_at < datetime.now():
                    cache_file.unlink()
                    return None
                
                return self._restore_value(entry.value, entry.compressed, entry.serialized)
            
            return None
        
        except Exception as e:
            logger.error(f"Error getting from L4 cache: {e}")
            return None
    
    def _set_to_l1(self, key: str, value: T, ttl: Optional[int] = None) -> bool:
        """Set value in L1 cache."""
        try:
            entry = self._prepare_cache_entry(key, value, ttl, CacheLevel.L1_MEMORY)
            
            # Check capacity
            if len(self.l1_cache) >= self.cache_config[CacheLevel.L1_MEMORY]["max_size"]:
                self._evict_from_l1()
            
            # Check memory usage
            total_size = sum(entry.size for entry in self.l1_cache.values())
            if total_size + entry.size > self.cache_config[CacheLevel.L1_MEMORY]["max_memory"]:
                self._evict_from_l1_until_fit(entry.size)
            
            self.l1_cache[key] = entry
            return True
        
        except Exception as e:
            logger.error(f"Error setting to L1 cache: {e}")
            return False
    
    def _set_to_l2(self, key: str, value: T, ttl: Optional[int] = None) -> bool:
        """Set value in L2 cache."""
        try:
            if self.l2_cache is None:
                return False
            
            entry = self._prepare_cache_entry(key, value, ttl, CacheLevel.L2_LOCAL)
            entry_data = pickle.dumps(entry)
            
            if isinstance(self.l2_cache, dict):
                # Memory fallback
                self.l2_cache[key] = entry_data
            else:
                # Redis
                if ttl:
                    self.l2_cache.setex(key, ttl, entry_data)
                else:
                    self.l2_cache.set(key, entry_data)
            
            return True
        
        except Exception as e:
            logger.error(f"Error setting to L2 cache: {e}")
            return False
    
    def _set_to_l3(self, key: str, value: T, ttl: Optional[int] = None) -> bool:
        """Set value in L3 cache."""
        try:
            if self.l3_cache is None:
                return False
            
            entry = self._prepare_cache_entry(key, value, ttl, CacheLevel.L3_DISTRIBUTED)
            entry_data = pickle.dumps(entry)
            
            if isinstance(self.l3_cache, dict):
                # Memory fallback
                self.l3_cache[key] = entry_data
            else:
                # Redis
                if ttl:
                    self.l3_cache.setex(key, ttl, entry_data)
                else:
                    self.l3_cache.set(key, entry_data)
            
            return True
        
        except Exception as e:
            logger.error(f"Error setting to L3 cache: {e}")
            return False
    
    def _set_to_l4(self, key: str, value: T, ttl: Optional[int] = None) -> bool:
        """Set value in L4 cache (disk)."""
        try:
            entry = self._prepare_cache_entry(key, value, ttl, CacheLevel.L4_PERSISTENT)
            entry_data = pickle.dumps(entry)
            
            cache_file = self.l4_cache_path / f"{hashlib.md5(key.encode()).hexdigest()}.cache"
            
            with open(cache_file, 'wb') as f:
                f.write(entry_data)
            
            return True
        
        except Exception as e:
            logger.error(f"Error setting to L4 cache: {e}")
            return False
    
    def _delete_from_l1(self, key: str) -> bool:
        """Delete key from L1 cache."""
        try:
            if key in self.l1_cache:
                del self.l1_cache[key]
            return True
        except Exception as e:
            logger.error(f"Error deleting from L1 cache: {e}")
            return False
    
    def _delete_from_l2(self, key: str) -> bool:
        """Delete key from L2 cache."""
        try:
            if self.l2_cache is None:
                return False
            
            if isinstance(self.l2_cache, dict):
                # Memory fallback
                if key in self.l2_cache:
                    del self.l2_cache[key]
            else:
                # Redis
                self.l2_cache.delete(key)
            
            return True
        except Exception as e:
            logger.error(f"Error deleting from L2 cache: {e}")
            return False
    
    def _delete_from_l3(self, key: str) -> bool:
        """Delete key from L3 cache."""
        try:
            if self.l3_cache is None:
                return False
            
            if isinstance(self.l3_cache, dict):
                # Memory fallback
                if key in self.l3_cache:
                    del self.l3_cache[key]
            else:
                # Redis
                self.l3_cache.delete(key)
            
            return True
        except Exception as e:
            logger.error(f"Error deleting from L3 cache: {e}")
            return False
    
    def _delete_from_l4(self, key: str) -> bool:
        """Delete key from L4 cache."""
        try:
            cache_file = self.l4_cache_path / f"{hashlib.md5(key.encode()).hexdigest()}.cache"
            
            if cache_file.exists():
                cache_file.unlink()
            
            return True
        except Exception as e:
            logger.error(f"Error deleting from L4 cache: {e}")
            return False
    
    def _evict_from_l1(self):
        """Evict entries from L1 cache based on strategy."""
        try:
            strategy = self.cache_config[CacheLevel.L1_MEMORY]["strategy"]
            
            if strategy == CacheStrategy.LRU:
                # Remove least recently used
                oldest_key = min(self.l1_cache.keys(), key=lambda k: self.l1_cache[k].last_accessed)
                del self.l1_cache[oldest_key]
            elif strategy == CacheStrategy.LFU:
                # Remove least frequently used
                least_used_key = min(self.l1_cache.keys(), key=lambda k: self.l1_cache[k].access_count)
                del self.l1_cache[least_used_key]
            elif strategy == CacheStrategy.FIFO:
                # Remove oldest entry
                oldest_key = min(self.l1_cache.keys(), key=lambda k: self.l1_cache[k].created_at)
                del self.l1_cache[oldest_key]
            elif strategy == CacheStrategy.RANDOM:
                # Remove random entry
                import random
                random_key = random.choice(list(self.l1_cache.keys()))
                del self.l1_cache[random_key]
            
            self.metrics[CacheLevel.L1_MEMORY].eviction_count += 1
        
        except Exception as e:
            logger.error(f"Error evicting from L1 cache: {e}")
    
    def _evict_from_l1_until_fit(self, required_size: int):
        """Evict entries from L1 cache until required size fits."""
        try:
            max_memory = self.cache_config[CacheLevel.L1_MEMORY]["max_memory"]
            current_size = sum(entry.size for entry in self.l1_cache.values())
            
            while current_size + required_size > max_memory and self.l1_cache:
                self._evict_from_l1()
                current_size = sum(entry.size for entry in self.l1_cache.values())
        
        except Exception as e:
            logger.error(f"Error evicting from L1 cache until fit: {e}")
    
    def _compress_value(self, value: T) -> Any:
        """Compress value for storage."""
        try:
            if isinstance(value, str):
                return zlib.compress(value.encode('utf-8'))
            elif isinstance(value, bytes):
                return zlib.compress(value)
            else:
                # Serialize first, then compress
                serialized = pickle.dumps(value)
                return zlib.compress(serialized)
        
        except Exception as e:
            logger.error(f"Error compressing value: {e}")
            return value
    
    def _decompress_value(self, compressed_value: Any) -> Any:
        """Decompress value."""
        try:
            decompressed = zlib.decompress(compressed_value)
            
            # Try to decode as string
            try:
                return decompressed.decode('utf-8')
            except UnicodeDecodeError:
                # Return as bytes or deserialize
                try:
                    return pickle.loads(decompressed)
                except:
                    return decompressed
        
        except Exception as e:
            logger.error(f"Error decompressing value: {e}")
            return compressed_value
    
    def _serialize_value(self, value: T) -> bytes:
        """Serialize value for storage."""
        try:
            return pickle.dumps(value)
        except Exception as e:
            logger.error(f"Error serializing value: {e}")
            return str(value).encode('utf-8')
    
    def _deserialize_value(self, serialized_value: bytes) -> T:
        """Deserialize value."""
        try:
            return pickle.loads(serialized_value)
        except Exception as e:
            logger.error(f"Error deserializing value: {e}")
            return serialized_value.decode('utf-8')
    
    def _restore_value(self, stored_value: Any, compressed: bool, serialized: bool) -> T:
        """Restore value from stored format."""
        try:
            value = stored_value
            
            # Decompress if needed
            if compressed:
                value = self._decompress_value(value)
            
            # Deserialize if needed
            if serialized:
                if isinstance(value, bytes):
                    value = self._deserialize_value(value)
                else:
                    value = value  # Already deserialized during decompression
            
            return value
        
        except Exception as e:
            logger.error(f"Error restoring value: {e}")
            return stored_value
    
    def _get_value_size(self, value: T) -> int:
        """Get size of value in bytes."""
        try:
            if isinstance(value, str):
                return len(value.encode('utf-8'))
            elif isinstance(value, bytes):
                return len(value)
            elif isinstance(value, (int, float, bool)):
                return 8  # Approximate size
            else:
                # For complex objects, serialize to get size
                return len(pickle.dumps(value))
        except Exception as e:
            logger.error(f"Error getting value size: {e}")
            return 1024  # Default size
    
    def _analyze_access_pattern(self, key: str) -> Dict[str, Any]:
        """Analyze access pattern for a key."""
        try:
            # This is a simplified implementation
            # In a real system, you would track access history
            
            # Check if key exists in any cache level
            frequency = 0
            recency = 0
            
            for level_cache in [self.l1_cache, self.l2_cache, self.l3_cache]:
                if isinstance(level_cache, dict) and key in level_cache:
                    if isinstance(level_cache[key], CacheEntry):
                        entry = level_cache[key]
                        frequency += entry.access_count
                        recency = max(recency, (datetime.now() - entry.last_accessed).total_seconds())
            
            return {
                "frequency": frequency,
                "recency": recency,
                "pattern": "hot" if frequency > 10 else "warm" if frequency > 5 else "cold"
            }
        
        except Exception as e:
            logger.error(f"Error analyzing access pattern: {e}")
            return {"frequency": 0, "recency": 0, "pattern": "unknown"}
    
    def _update_metrics(self, level: CacheLevel, hit: bool, response_time: float):
        """Update cache metrics."""
        try:
            metrics = self.metrics[level]
            metrics.total_requests += 1
            
            if hit:
                metrics.cache_hits += 1
            else:
                metrics.cache_misses += 1
            
            # Update hit rate
            metrics.hit_rate = metrics.cache_hits / metrics.total_requests
            
            # Update average response time
            metrics.avg_response_time = (metrics.avg_response_time * (metrics.total_requests - 1) + response_time) / metrics.total_requests
        
        except Exception as e:
            logger.error(f"Error updating metrics: {e}")
    
    def _cleanup_expired_entries(self):
        """Clean up expired entries from all cache levels."""
        try:
            now = datetime.now()
            
            # Clean up L1
            expired_keys = [key for key, entry in self.l1_cache.items() 
                           if entry.expires_at and entry.expires_at < now]
            for key in expired_keys:
                del self.l1_cache[key]
            
            # Clean up L4 (disk)
            for cache_file in self.l4_cache_path.glob("*.cache"):
                try:
                    with open(cache_file, 'rb') as f:
                        entry_data = f.read()
                    entry = pickle.loads(entry_data)
                    
                    if entry.expires_at and entry.expires_at < now:
                        cache_file.unlink()
                except Exception as e:
                    logger.error(f"Error cleaning up cache file {cache_file}: {e}")
        
        except Exception as e:
            logger.error(f"Error cleaning up expired entries: {e}")
    
    def _optimize_cache_performance(self):
        """Optimize cache performance."""
        try:
            # Analyze hit rates
            for level, metrics in self.metrics.items():
                if metrics.hit_rate < 0.8:  # Low hit rate
                    logger.warning(f"Low hit rate for {level.value}: {metrics.hit_rate:.2%}")
                    
                    # Suggest optimizations
                    if level == CacheLevel.L1_MEMORY:
                        logger.info("Consider increasing L1 cache size or adjusting eviction strategy")
                    elif level == CacheLevel.L2_LOCAL:
                        logger.info("Consider optimizing cache key distribution or TTL values")
        
        except Exception as e:
            logger.error(f"Error optimizing cache performance: {e}")
    
    def _analyze_cache_patterns(self):
        """Analyze cache access patterns."""
        try:
            # Analyze key distribution
            all_keys = set()
            
            for level_cache in [self.l1_cache, self.l2_cache, self.l3_cache]:
                if isinstance(level_cache, dict):
                    all_keys.update(level_cache.keys())
            
            # Pattern analysis
            key_patterns = {}
            for key in all_keys:
                # Extract pattern (e.g., prefix, length)
                prefix = key.split(':')[0] if ':' in key else 'default'
                key_patterns[prefix] = key_patterns.get(prefix, 0) + 1
            
            # Log insights
            for pattern, count in sorted(key_patterns.items(), key=lambda x: x[1], reverse=True)[:5]:
                logger.info(f"Cache pattern '{pattern}': {count} keys")
        
        except Exception as e:
            logger.error(f"Error analyzing cache patterns: {e}")
    
    def _apply_intelligent_optimizations(self):
        """Apply intelligent optimizations."""
        try:
            # Query optimization
            self._optimize_queries()
            
            # Index optimization
            self._optimize_indexes()
            
            # Connection pooling
            self._optimize_connections()
            
            # Batch processing
            self._optimize_batch_processing()
        
        except Exception as e:
            logger.error(f"Error applying intelligent optimizations: {e}")
    
    def _optimize_queries(self):
        """Optimize database queries."""
        try:
            if DJANGO_AVAILABLE:
                # Analyze slow queries
                with connection.cursor() as cursor:
                    cursor.execute("""
                        SELECT query, mean_time, calls 
                        FROM pg_stat_statements 
                        WHERE mean_time > 100 
                        ORDER BY mean_time DESC 
                        LIMIT 10
                    """)
                    slow_queries = cursor.fetchall()
                
                if slow_queries:
                    logger.info(f"Found {len(slow_queries)} slow queries to optimize")
        
        except Exception as e:
            logger.error(f"Error optimizing queries: {e}")
    
    def _optimize_indexes(self):
        """Optimize database indexes."""
        try:
            if DJANGO_AVAILABLE:
                # Analyze missing indexes
                with connection.cursor() as cursor:
                    cursor.execute("""
                        SELECT schemaname, tablename, attname, n_distinct, correlation 
                        FROM pg_stats 
                        WHERE n_distinct > 100 
                        ORDER BY n_distinct DESC 
                        LIMIT 10
                    """)
                    index_candidates = cursor.fetchall()
                
                if index_candidates:
                    logger.info(f"Found {len(index_candidates)} potential index optimizations")
        
        except Exception as e:
            logger.error(f"Error optimizing indexes: {e}")
    
    def _optimize_connections(self):
        """Optimize database connections."""
        try:
            # Monitor connection pool
            if DJANGO_AVAILABLE:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT count(*) FROM pg_stat_activity WHERE state = 'active'")
                    active_connections = cursor.fetchone()[0]
                
                if active_connections > 50:
                    logger.warning(f"High number of active connections: {active_connections}")
        
        except Exception as e:
            logger.error(f"Error optimizing connections: {e}")
    
    def _optimize_batch_processing(self):
        """Optimize batch processing."""
        try:
            # Analyze batch operations
            batch_size_recommendations = {
                "insert": 1000,
                "update": 500,
                "delete": 1000
            }
            
            for operation, recommended_size in batch_size_recommendations.items():
                logger.info(f"Recommended batch size for {operation}: {recommended_size}")
        
        except Exception as e:
            logger.error(f"Error optimizing batch processing: {e}")
    
    def _cache_maintenance(self):
        """Perform comprehensive cache maintenance."""
        try:
            logger.info("Performing cache maintenance...")
            
            # Clean up expired entries
            self._cleanup_expired_entries()
            
            # Optimize cache performance
            self._optimize_cache_performance()
            
            # Analyze patterns
            self._analyze_cache_patterns()
            
            # Generate cache report
            self._generate_cache_report()
            
            logger.info("Cache maintenance completed")
        
        except Exception as e:
            logger.error(f"Error during cache maintenance: {e}")
    
    def _generate_cache_report(self):
        """Generate cache performance report."""
        try:
            report = {
                "timestamp": datetime.now().isoformat(),
                "metrics": {
                    level.value: {
                        "total_requests": metrics.total_requests,
                        "cache_hits": metrics.cache_hits,
                        "cache_misses": metrics.cache_misses,
                        "hit_rate": metrics.hit_rate,
                        "avg_response_time": metrics.avg_response_time,
                        "eviction_count": metrics.eviction_count
                    }
                    for level, metrics in self.metrics.items()
                },
                "cache_sizes": {
                    level.value: len(self.l1_cache) if level == CacheLevel.L1_MEMORY else 0
                    for level in CacheLevel
                },
                "optimizations": len(self.optimization_results),
                "recommendations": self._generate_cache_recommendations()
            }
            
            # Save report
            report_file = f"cache_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(report_file, 'w') as f:
                json.dump(report, f, indent=2, default=str)
            
            logger.info(f"Cache report saved: {report_file}")
        
        except Exception as e:
            logger.error(f"Error generating cache report: {e}")
    
    def _generate_cache_recommendations(self) -> List[str]:
        """Generate cache optimization recommendations."""
        recommendations = []
        
        try:
            # Analyze hit rates
            for level, metrics in self.metrics.items():
                if metrics.hit_rate < 0.7:
                    recommendations.append(f"Low hit rate in {level.value} cache ({metrics.hit_rate:.1%}) - consider optimization")
                
                if metrics.avg_response_time > 0.1:
                    recommendations.append(f"High response time in {level.value} cache ({metrics.avg_response_time:.3f}s) - consider performance tuning")
            
            # Analyze eviction rates
            total_evictions = sum(metrics.eviction_count for metrics in self.metrics.values())
            if total_evictions > 1000:
                recommendations.append("High eviction rate - consider increasing cache sizes")
            
            # General recommendations
            recommendations.extend([
                "Monitor cache performance regularly",
                "Implement cache warming strategies",
                "Consider cache partitioning for better performance",
                "Use compression for large cache entries"
            ])
        
        except Exception as e:
            logger.error(f"Error generating cache recommendations: {e}")
        
        return recommendations[:10]
    
    def get_cache_statistics(self) -> Dict[str, Any]:
        """Get comprehensive cache statistics."""
        try:
            return {
                "cache_levels": {
                    level.value: {
                        "size": len(self.l1_cache) if level == CacheLevel.L1_MEMORY else 0,
                        "metrics": {
                            "total_requests": metrics.total_requests,
                            "cache_hits": metrics.cache_hits,
                            "cache_misses": metrics.cache_misses,
                            "hit_rate": metrics.hit_rate,
                            "avg_response_time": metrics.avg_response_time,
                            "eviction_count": metrics.eviction_count
                        }
                    }
                    for level, metrics in self.metrics.items()
                },
                "total_optimizations": len(self.optimization_results),
                "system_health": self._assess_system_health()
            }
        
        except Exception as e:
            logger.error(f"Error getting cache statistics: {e}")
            return {}
    
    def _assess_system_health(self) -> Dict[str, Any]:
        """Assess overall system health."""
        try:
            # Calculate overall hit rate
            total_requests = sum(metrics.total_requests for metrics in self.metrics.values())
            total_hits = sum(metrics.cache_hits for metrics in self.metrics.values())
            overall_hit_rate = total_hits / total_requests if total_requests > 0 else 0
            
            # Calculate average response time
            avg_response_times = [metrics.avg_response_time for metrics in self.metrics.values() if metrics.total_requests > 0]
            overall_avg_response_time = statistics.mean(avg_response_times) if avg_response_times else 0
            
            # Health score
            health_score = 100
            health_score -= (1 - overall_hit_rate) * 50  # Penalty for low hit rate
            health_score -= min(overall_avg_response_time * 100, 30)  # Penalty for slow response
            
            return {
                "overall_hit_rate": overall_hit_rate,
                "overall_avg_response_time": overall_avg_response_time,
                "health_score": max(0, health_score),
                "status": "excellent" if health_score >= 90 else "good" if health_score >= 75 else "fair" if health_score >= 60 else "poor"
            }
        
        except Exception as e:
            logger.error(f"Error assessing system health: {e}")
            return {"health_score": 0, "status": "unknown"}

# Decorator for caching function results
def intelligent_cache(ttl: int = 300, level: Optional[CacheLevel] = None, key_func: Optional[Callable] = None):
    """Decorator for intelligent caching of function results."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                cache_key = f"{func.__name__}:{hashlib.md5(str(args).encode()).hexdigest()}:{hashlib.md5(str(kwargs).encode()).hexdigest()}"
            
            # Get cache instance
            cache_instance = getattr(wrapper, '_cache_instance', None)
            if cache_instance is None:
                cache_instance = IntelligentCacheSystem()
                wrapper._cache_instance = cache_instance
                cache_instance.start_cache_system()
            
            # Try to get from cache
            result = cache_instance.get(cache_key)
            if result is not None:
                return result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache_instance.set(cache_key, result, ttl=ttl, level=level)
            
            return result
        
        return wrapper
    return decorator

# Global cache instance
_global_cache = None

def get_global_cache() -> IntelligentCacheSystem:
    """Get global cache instance."""
    global _global_cache
    if _global_cache is None:
        _global_cache = IntelligentCacheSystem()
        _global_cache.start_cache_system()
    return _global_cache

def main():
    """Main function for the intelligent caching system."""
    print("🚀 Starting Intelligent Caching & Optimization Strategies...")
    print("=" * 80)
    
    # Create cache system
    cache_system = IntelligentCacheSystem()
    cache_system.start_cache_system()
    
    try:
        print("✅ Intelligent cache system started successfully!")
        
        # Demonstrate caching
        print("\n📦 Demonstrating intelligent caching...")
        
        # Set some test values
        test_data = {
            "user:123": {"name": "John Doe", "email": "john@example.com"},
            "course:456": {"title": "Python Programming", "duration": "10 hours"},
            "config:settings": {"theme": "dark", "language": "en"}
        }
        
        for key, value in test_data.items():
            success = cache_system.set(key, value, ttl=300)
            print(f"💾 Stored {key}: {'✅' if success else '❌'}")
        
        # Retrieve values
        print("\n📖 Retrieving cached values...")
        for key in test_data.keys():
            start_time = time.time()
            value = cache_system.get(key)
            end_time = time.time()
            print(f"🔍 Retrieved {key}: {value is not None} ({(end_time - start_time) * 1000:.2f}ms)")
        
        # Demonstrate cache misses
        print("\n❌ Testing cache misses...")
        start_time = time.time()
        value = cache_system.get("nonexistent:key")
        end_time = time.time()
        print(f"🔍 Non-existent key: {value} ({(end_time - start_time) * 1000:.2f}ms)")
        
        # Display statistics
        print("\n📊 Cache Statistics:")
        print("=" * 80)
        
        stats = cache_system.get_cache_statistics()
        
        for level_name, level_data in stats["cache_levels"].items():
            metrics = level_data["metrics"]
            if metrics["total_requests"] > 0:
                print(f"📋 {level_name.upper()}:")
                print(f"   Requests: {metrics['total_requests']}")
                print(f"   Hits: {metrics['cache_hits']}")
                print(f"   Misses: {metrics['cache_misses']}")
                print(f"   Hit Rate: {metrics['hit_rate']:.1%}")
                print(f"   Avg Response Time: {metrics['avg_response_time']:.3f}s")
        
        # System health
        health = stats["system_health"]
        print(f"\n🏥 System Health:")
        print(f"   Overall Hit Rate: {health['overall_hit_rate']:.1%}")
        print(f"   Overall Response Time: {health['overall_avg_response_time']:.3f}s")
        print(f"   Health Score: {health['health_score']:.1f}/100")
        print(f"   Status: {health['status'].upper()}")
        
        # Keep running for demonstration
        print("\n🔄 Cache system is running... (Press Ctrl+C to stop)")
        
        while True:
            time.sleep(30)
            
            # Update statistics
            stats = cache_system.get_cache_statistics()
            health = stats["system_health"]
            
            print(f"\n📊 Live Status (Hit Rate: {health['overall_hit_rate']:.1%}, Health: {health['status'].upper()})")
    
    except KeyboardInterrupt:
        print("\n🛑 Stopping intelligent cache system...")
        cache_system.stop_cache_system()
        print("✅ Intelligent cache system stopped")
    
    except Exception as e:
        print(f"\n❌ Error: {e}")
        cache_system.stop_cache_system()

if __name__ == '__main__':
    main()

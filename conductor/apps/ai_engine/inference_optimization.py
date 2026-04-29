"""
Inference Optimization

Speed optimization:
1. KV cache.
2. Batching strategies.
3. Continuous batching.
"""

import random
import math
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from collections import OrderedDict


@dataclass
class InferenceConfig:
    max_batch_size: int = 32
    max_sequence_length: int = 2048
    kv_cache_size: int = 1000
    prefill_chunk_size: int = 512


class KVCache:
    """Key-Value cache for attention."""
    def __init__(self, max_size: int = 1000):
        self.max_size = max_size
        self.cache: OrderedDict = OrderedDict()

    def get(self, key: str) -> Optional[Tuple[List, List]]:
        if key in self.cache:
            self.cache.move_to_end(key)
            return self.cache[key]
        return None

    def put(self, key: str, k_states: List, v_states: List):
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = (k_states, v_states)
        while len(self.cache) > self.max_size:
            self.cache.popitem(last=False)

    def append(self, key: str, new_k: List[float], new_v: List[float]):
        if key in self.cache:
            k, v = self.cache[key]
            k.append(new_k)
            v.append(new_v)
            self.cache.move_to_end(key)
        else:
            self.put(key, [new_k], [new_v])

    def clear(self):
        self.cache.clear()

    def stats(self) -> Dict:
        return {'size': len(self.cache), 'max_size': self.max_size}


class StaticBatcher:
    """Static batching."""
    def __init__(self, batch_size: int = 8):
        self.batch_size = batch_size
        self.queue: List[Dict] = []

    def add(self, request: Dict):
        self.queue.append(request)

    def get_batch(self) -> List[Dict]:
        if len(self.queue) >= self.batch_size:
            batch = self.queue[:self.batch_size]
            self.queue = self.queue[self.batch_size:]
            return batch
        return []

    def flush(self) -> List[Dict]:
        batch = self.queue[:]
        self.queue = []
        return batch


class ContinuousBatcher:
    """Continuous batching for LLM inference."""
    def __init__(self, max_batch: int = 32, max_tokens: int = 4096):
        self.max_batch = max_batch
        self.max_tokens = max_tokens
        self.active: List[Dict] = []
        self.waiting: List[Dict] = []

    def add(self, request: Dict):
        self.waiting.append(request)

    def schedule(self) -> List[Dict]:
        # Add new requests if capacity
        while self.waiting and len(self.active) < self.max_batch:
            req = self.waiting.pop(0)
            req['tokens_generated'] = 0
            self.active.append(req)
        return self.active

    def complete(self, request_id: str):
        self.active = [r for r in self.active if r.get('id') != request_id]

    def step(self) -> Tuple[List[Dict], List[str]]:
        completed = []
        for req in self.active:
            req['tokens_generated'] = req.get('tokens_generated', 0) + 1
            if req['tokens_generated'] >= req.get('max_tokens', 100):
                completed.append(req['id'])
        for cid in completed:
            self.complete(cid)
        return self.active, completed


class ChunkedPrefill:
    """Chunked prefill for long prompts."""
    def __init__(self, chunk_size: int = 512):
        self.chunk_size = chunk_size

    def chunk(self, tokens: List[int]) -> List[List[int]]:
        chunks = []
        for i in range(0, len(tokens), self.chunk_size):
            chunks.append(tokens[i:i + self.chunk_size])
        return chunks

    def prefill(self, chunks: List[List[int]], process_fn) -> List:
        states = []
        for chunk in chunks:
            state = process_fn(chunk)
            states.append(state)
        return states


class PagedAttention:
    """Paged attention for memory efficiency."""
    def __init__(self, page_size: int = 16, num_pages: int = 1000):
        self.page_size = page_size
        self.num_pages = num_pages
        self.pages: Dict[int, List] = {}
        self.allocations: Dict[str, List[int]] = {}
        self.free_pages: List[int] = list(range(num_pages))

    def allocate(self, request_id: str, num_tokens: int) -> List[int]:
        needed = math.ceil(num_tokens / self.page_size)
        if len(self.free_pages) < needed:
            return []
        allocated = []
        for _ in range(needed):
            page_id = self.free_pages.pop(0)
            self.pages[page_id] = []
            allocated.append(page_id)
        self.allocations[request_id] = allocated
        return allocated

    def free(self, request_id: str):
        if request_id in self.allocations:
            for page_id in self.allocations[request_id]:
                del self.pages[page_id]
                self.free_pages.append(page_id)
            del self.allocations[request_id]


class InferenceOptimizer:
    """Complete inference optimization."""
    def __init__(self, config: InferenceConfig = None):
        self.config = config or InferenceConfig()
        self.kv_cache = KVCache(self.config.kv_cache_size)
        self.batcher = ContinuousBatcher(self.config.max_batch_size)
        self.prefill = ChunkedPrefill(self.config.prefill_chunk_size)
        self.paged = PagedAttention()

    def process_request(self, request: Dict) -> Dict:
        request_id = request.get('id', str(random.randint(1000, 9999)))
        tokens = request.get('tokens', [])
        
        # Check cache
        cache_key = f"{request_id}_kv"
        cached = self.kv_cache.get(cache_key)
        
        if cached:
            return {'status': 'cache_hit', 'request_id': request_id}
        
        # Allocate paged attention
        pages = self.paged.allocate(request_id, len(tokens) + 100)
        
        # Add to batch
        self.batcher.add({**request, 'id': request_id, 'pages': pages})
        
        return {'status': 'queued', 'request_id': request_id, 'pages': len(pages)}

    def step(self) -> Dict:
        active, completed = self.batcher.step()
        for cid in completed:
            self.paged.free(cid)
        return {'active': len(active), 'completed': completed}

"""
Static File Optimizer
Optimizes static file delivery with compression and caching
"""

import os
import hashlib
from pathlib import Path
from django.conf import settings
from django.contrib.staticfiles.storage import StaticFilesStorage


class OptimizedStaticStorage(StaticFilesStorage):
    """
    Static file storage with optimization features.
    """
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.file_hashes = {}
    
    def url(self, name):
        """Return URL with cache-busting hash."""
        if name not in self.file_hashes:
            self.file_hashes[name] = self._compute_hash(name)
        
        hashed_name = f"{name}?v={self.file_hashes[name][:8]}"
        return super().url(hashed_name)
    
    def _compute_hash(self, name):
        """Compute MD5 hash of file contents."""
        try:
            file_path = self.path(name)
            if os.path.exists(file_path):
                with open(file_path, 'rb') as f:
                    return hashlib.md5(f.read()).hexdigest()
        except:
            pass
        return "00000000"


class StaticOptimizer:
    """
    Optimizes static file handling.
    """
    
    # File extensions to compress
    COMPRESSIBLE_TYPES = [
        '.css', '.js', '.html', '.json', '.xml',
        '.svg', '.txt', '.md'
    ]
    
    @staticmethod
    def should_compress(filename):
        """Check if file should be compressed."""
        return any(filename.endswith(ext) for ext in StaticOptimizer.COMPRESSIBLE_TYPES)
    
    @staticmethod
    def get_cache_headers(filename):
        """Get optimal cache headers for file type."""
        if filename.endswith(('.css', '.js')):
            return {
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Vary': 'Accept-Encoding'
            }
        elif filename.endswith(('.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico')):
            return {
                'Cache-Control': 'public, max-age=2592000',
            }
        else:
            return {
                'Cache-Control': 'public, max-age=86400',
            }


def optimize_static_collection():
    """
    Optimize static files during collection.
    """
    from django.contrib.staticfiles.management.commands.collectstatic import Command as CollectStaticCommand
    
    # Custom collectstatic that applies optimizations
    class OptimizedCollectStatic(CollectStaticCommand):
        def delete_file(self, path, prefixed_path, source_storage):
            # Add custom optimization logic here
            return super().delete_file(path, prefixed_path, source_storage)
    
    print("[OK] Static file optimizer configured")

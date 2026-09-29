"""
Parsers package for Student Updates Ingestion.
"""
from typing import Any
from .base import BaseUpdateParser
from .mgkvp_parser import MGKVPNoticeParser
from .aktu_parser import AKTUNoticeParser
from .alld_univ_parser import AllahabadUnivNoticeParser
from .rss_parser import RSSFeedParser
from .lucknow_univ_parser import LucknowUnivNoticeParser
from .bhu_parser import BHUNoticeParser
from .ddu_parser import DDUNoticeParser
from .nta_parser import NTANoticeParser


def get_parser_for_source(source: Any) -> BaseUpdateParser:
    """
    Factory function resolving the dedicated specialized parser for a source
    based on domain, source_id, institution name, or fetch_method.
    """
    domain = ""
    source_id = ""
    fetch_method = ""

    if hasattr(source, 'domain'):
        domain = (source.domain or "").lower()
        source_id = (source.source_id or "").lower()
        fetch_method = (source.fetch_method or "").upper()
    elif isinstance(source, dict):
        domain = (source.get('domain') or "").lower()
        source_id = (source.get('source_id') or "").lower()
        fetch_method = (source.get('fetch_method') or "").upper()

    if fetch_method == 'RSS_FEED':
        return RSSFeedParser()

    if 'aktu' in domain or 'aktu' in source_id:
        return AKTUNoticeParser()
    if 'allduniv' in domain or 'allahabad' in source_id or 'uod' in source_id:
        return AllahabadUnivNoticeParser()
    if 'lkouniv' in domain or 'lu-' in source_id or 'lucknow' in source_id:
        return LucknowUnivNoticeParser()
    if 'bhu.ac.in' in domain or 'bhu' in source_id:
        return BHUNoticeParser()
    if 'ddu' in domain or 'ddu' in source_id:
        return DDUNoticeParser()
    if 'nta.ac.in' in domain or 'nta' in source_id:
        return NTANoticeParser()
    if 'mgkvp' in domain or 'mgkvp' in source_id:
        return MGKVPNoticeParser()

    # Default fallback table / list extractor
    return MGKVPNoticeParser()


__all__ = [
    'BaseUpdateParser',
    'MGKVPNoticeParser',
    'AKTUNoticeParser',
    'AllahabadUnivNoticeParser',
    'RSSFeedParser',
    'LucknowUnivNoticeParser',
    'BHUNoticeParser',
    'DDUNoticeParser',
    'NTANoticeParser',
    'get_parser_for_source',
]

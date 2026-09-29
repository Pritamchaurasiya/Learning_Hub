"""
Canonical Normalizer for Ingested Student Notices.
"""
from datetime import datetime, timezone as dt_timezone
from typing import Dict, Any, Optional
import re


def parse_flexible_date(date_str: Optional[str]) -> Optional[datetime]:
    """
    Parses flexible Indian & international date strings (DD-MM-YYYY, DD/MM/YYYY, etc.)
    into timezone-aware UTC datetimes. Returns None if unparseable (never fabricates).
    """
    if not date_str:
        return None

    cleaned = re.sub(r'[^\w\s/\.\-]', '', date_str.strip())
    # Standard format trials
    formats = [
        '%d-%m-%Y',
        '%d/%m/%Y',
        '%d.%m.%Y',
        '%Y-%m-%d',
        '%d %b %Y',
        '%d %B %Y',
        '%a, %d %b %Y %H:%M:%S %z',
        '%a, %d %b %Y %H:%M:%S GMT',
    ]

    for fmt in formats:
        try:
            dt = datetime.strptime(cleaned, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=dt_timezone.utc)
            return dt
        except ValueError:
            continue

    return None


def normalize_notice_payload(raw: Dict[str, Any], default_institution: str = "") -> Dict[str, Any]:
    """
    Transforms raw parser output into canonical schema-compliant update dictionary.
    """
    title = (raw.get('title') or '').strip()
    source_url = (raw.get('url') or '').strip()
    summary = (raw.get('summary') or title).strip()

    published_at = parse_flexible_date(raw.get('date_str'))
    deadline = parse_flexible_date(raw.get('deadline_str'))

    category = raw.get('category') or 'ACADEMIC'
    sub_category = raw.get('sub_category') or 'UNIVERSITY_NOTICE'
    importance = raw.get('importance') or 'NORMAL'

    institution = (raw.get('institution') or default_institution).strip()
    course = (raw.get('course') or '').strip()
    semester = (raw.get('semester') or '').strip()

    return {
        'title': title,
        'summary': summary,
        'source_url': source_url,
        'category': category,
        'sub_category': sub_category,
        'institution': institution,
        'course': course,
        'semester': semester,
        'published_at': published_at,
        'deadline': deadline,
        'importance': importance,
        'attachments': raw.get('attachments') or [],
    }

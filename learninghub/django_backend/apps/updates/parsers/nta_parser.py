"""
National Testing Agency (NTA) Public Notice Parser.
Domain: nta.ac.in
"""
import re
from typing import List, Dict, Any
from urllib.parse import urljoin
from .base import BaseUpdateParser


class NTANoticeParser(BaseUpdateParser):
    """
    Extracts official public notices from the National Testing Agency (NTA) portal,
    handling national competitive entrance examinations (CUET, JEE Main, NEET, UGC NET).
    """

    DATE_PATTERN = re.compile(r'(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})')
    DEADLINE_PATTERN = re.compile(
        r'(?:last\s*date|deadline|upto|extended\s*(?:up\s*to|till))[\s:]*(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})',
        re.IGNORECASE
    )

    EXAM_PATTERNS = [
        (re.compile(r'\b(CUET\s*(?:UG|PG)?)\b', re.IGNORECASE), 'CUET'),
        (re.compile(r'\b(JEE\s*(?:Main|Advanced)?)\b', re.IGNORECASE), 'JEE Main'),
        (re.compile(r'\b(NEET\s*(?:UG|PG)?)\b', re.IGNORECASE), 'NEET UG'),
        (re.compile(r'\b(UGC\s*NET|CSIR\s*(?:UGC\s*)?NET)\b', re.IGNORECASE), 'UGC NET'),
        (re.compile(r'\b(CMAT)\b', re.IGNORECASE), 'CMAT'),
        (re.compile(r'\b(GPAT)\b', re.IGNORECASE), 'GPAT'),
        (re.compile(r'\b(ICAR\s*(?:AIEEA)?)\b', re.IGNORECASE), 'ICAR'),
    ]

    def parse(self, content: str, base_url: str = "https://nta.ac.in") -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []
        if not content:
            return results

        # Match table rows or notice list items
        items = re.findall(r'<(?:tr|li|div\s+class=["\'][^"\']*(?:notice|announcement|news)[^"\']*["\'])[^>]*>(.*?)</(?:tr|li|div)>', content, re.DOTALL | re.IGNORECASE)
        if not items:
            items = re.findall(r'(<a\s+[^>]*href=["\'][^"\']+["\'][^>]*>.*?</a>)', content, re.DOTALL | re.IGNORECASE)

        for raw_item in items:
            links = re.findall(r'<a\s+[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', raw_item, re.DOTALL | re.IGNORECASE)
            clean_text = re.sub(r'<[^>]+>', ' ', raw_item)
            clean_text = re.sub(r'\s+', ' ', clean_text).strip()

            if not links and len(clean_text) < 10:
                continue

            for href, anchor_html in links:
                raw_title = re.sub(r'<[^>]+>', '', anchor_html).strip()
                if not raw_title or len(raw_title) < 5:
                    raw_title = clean_text[:120]

                if not raw_title:
                    continue

                full_url = urljoin(base_url, href)

                # Date extraction
                date_match = self.DATE_PATTERN.search(clean_text)
                date_str = date_match.group(1) if date_match else None

                # Deadline extraction
                deadline_match = self.DEADLINE_PATTERN.search(clean_text) or self.DEADLINE_PATTERN.search(raw_title)
                deadline_str = deadline_match.group(1) if deadline_match else None

                # Exam Detection
                detected_exam = None
                for pattern, name in self.EXAM_PATTERNS:
                    if pattern.search(raw_title) or pattern.search(clean_text):
                        detected_exam = name
                        break

                # Category & Sub-Category
                title_lower = raw_title.lower()
                category = "COMPETITIVE_EXAMS"
                sub_category = "EXAM_NOTICE"
                importance = "IMPORTANT"

                if any(k in title_lower for k in ('invite', 'application', 'registration', 'online submission', 'submission of online')):
                    sub_category = "ADMISSION_OPEN"
                    importance = "URGENT"
                elif any(k in title_lower for k in ('admit card', 'hall ticket')):
                    sub_category = "ADMIT_CARD"
                    importance = "URGENT"
                elif any(k in title_lower for k in ('city intimation', 'advance intimation', 'exam city', 'centre list')):
                    sub_category = "EXAM_CENTER"
                    importance = "IMPORTANT"
                elif any(k in title_lower for k in ('result', 'score card', 'nta score', 'air', 'final answer key')):
                    sub_category = "RESULT"
                    importance = "URGENT"
                elif any(k in title_lower for k in ('correction window', 'correction in particulars')):
                    sub_category = "EXAM_FORM"
                    importance = "URGENT"
                elif any(k in title_lower for k in ('exam date', 'schedule of examination', 'examination dates')):
                    sub_category = "TIMETABLE"
                    importance = "IMPORTANT"

                if any(k in title_lower for k in ('urgent', 'immediate', 'today', 'last date extended')):
                    importance = "URGENT"

                # Attachments
                attachments = []
                if full_url.lower().endswith(('.pdf', '.doc', '.docx', '.zip')):
                    attachments.append({
                        'title': f"{raw_title[:60]} Circular",
                        'url': full_url
                    })

                results.append({
                    'title': raw_title,
                    'url': full_url,
                    'date_str': date_str,
                    'deadline_str': deadline_str,
                    'summary': clean_text[:350],
                    'category': category,
                    'sub_category': sub_category,
                    'importance': importance,
                    'exam': detected_exam,
                    'target_exam': detected_exam,
                    'course': detected_exam,
                    'attachments': attachments
                })

        return results

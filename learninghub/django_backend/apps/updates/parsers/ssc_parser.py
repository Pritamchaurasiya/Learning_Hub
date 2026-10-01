"""
Staff Selection Commission (SSC) Official Notice Parser.
Domain: ssc.gov.in, ssc.nic.in
"""
import json
import re
from typing import List, Dict, Any
from urllib.parse import urljoin
from .base import BaseUpdateParser


class SSCNoticeParser(BaseUpdateParser):
    """
    Extracts official notices, notifications, and results from the Staff Selection Commission (SSC),
    supporting CGL, CHSL, MTS, GD Constable, CPO (SI in DP/CAPFs), JE, and Stenographer examinations.
    Handles both structured HTML tables and JSON REST API payloads.
    """

    DATE_PATTERN = re.compile(r'(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})')
    DEADLINE_PATTERN = re.compile(
        r'(?:last\s*date|closing\s*date|deadline|upto|extended\s*(?:up\s*to|till))[\s:]*(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})',
        re.IGNORECASE
    )

    EXAM_PATTERNS = [
        (re.compile(r'\b(CGL|Combined\s*Graduate\s*Level)\b', re.IGNORECASE), 'SSC CGL'),
        (re.compile(r'\b(CHSL|Combined\s*Higher\s*Secondary|10\+2)\b', re.IGNORECASE), 'SSC CHSL'),
        (re.compile(r'\b(MTS|Multi\s*Tasking\s*Staff|Havaldar)\b', re.IGNORECASE), 'SSC MTS'),
        (re.compile(r'\b(GD\s*Constable|Constable\s*\(GD\)|CAPFs)\b', re.IGNORECASE), 'SSC GD Constable'),
        (re.compile(r'\b(CPO|Sub[\s\-]Inspector|SI\s*in\s*Delhi\s*Police)\b', re.IGNORECASE), 'SSC CPO'),
        (re.compile(r'\b(JE|Junior\s*Engineer)\b', re.IGNORECASE), 'SSC JE'),
        (re.compile(r'\b(Stenographer|Steno\s*Grade\s*[\'"]?[CD][\'"]?)\b', re.IGNORECASE), 'SSC Stenographer'),
        (re.compile(r'\b(Selection\s*Post|Phase[\s\-IVXLCDM]+)\b', re.IGNORECASE), 'SSC Selection Posts'),
        (re.compile(r'\b(JHT|Junior\s*Hindi\s*Translator)\b', re.IGNORECASE), 'SSC JHT'),
    ]

    def parse(self, content: str, base_url: str = "https://ssc.gov.in") -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []
        if not content:
            return results

        # 1. Attempt JSON parsing if content is JSON response from SSC API
        stripped = content.strip()
        if (stripped.startswith('{') and stripped.endswith('}')) or (stripped.startswith('[') and stripped.endswith(']')):
            try:
                data = json.loads(stripped)
                json_results = self._parse_json(data, base_url)
                if json_results:
                    return json_results
            except (json.JSONDecodeError, TypeError):
                pass

        # 2. Parse HTML table rows or notice list items
        items = re.findall(
            r'<(?:tr|li|div\s+class=["\'][^"\']*(?:notice|announcement|news|card)[^"\']*["\'])[^>]*>(.*?)</(?:tr|li|div)>',
            content,
            re.DOTALL | re.IGNORECASE
        )
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
                    raw_title = clean_text[:140]

                if not raw_title:
                    continue

                full_url = urljoin(base_url, href)

                date_match = self.DATE_PATTERN.search(clean_text)
                date_str = date_match.group(1) if date_match else None

                deadline_match = self.DEADLINE_PATTERN.search(clean_text) or self.DEADLINE_PATTERN.search(raw_title)
                deadline_str = deadline_match.group(1) if deadline_match else None

                detected_exam = self._detect_exam(raw_title, clean_text)
                category, sub_category, importance = self._classify_notice(raw_title)

                attachments = []
                if href.lower().endswith(('.pdf', '.doc', '.docx', '.zip')):
                    attachments.append({
                        'title': raw_title[:100],
                        'file_url': full_url,
                        'mime_type': 'application/pdf' if href.lower().endswith('.pdf') else 'application/octet-stream',
                    })

                results.append({
                    'title': raw_title,
                    'summary': clean_text if len(clean_text) > len(raw_title) else raw_title,
                    'url': full_url,
                    'date_str': date_str,
                    'deadline_str': deadline_str,
                    'category': category,
                    'sub_category': sub_category,
                    'importance': importance,
                    'institution': 'Staff Selection Commission (SSC)',
                    'exam': detected_exam or 'SSC Examination',
                    'course': detected_exam or 'Staff Selection Commission',
                    'semester': '',
                    'attachments': attachments,
                })

        return results

    def _parse_json(self, data: Any, base_url: str) -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []
        rows = data if isinstance(data, list) else data.get('data') or data.get('notices') or data.get('items') or []

        for item in rows:
            if not isinstance(item, dict):
                continue

            title = item.get('title') or item.get('noticeTitle') or item.get('subject') or item.get('name') or ''
            if not title:
                continue

            rel_url = item.get('fileUrl') or item.get('url') or item.get('pdfUrl') or item.get('link') or ''
            full_url = urljoin(base_url, rel_url) if rel_url else base_url

            date_str = item.get('date') or item.get('publishedDate') or item.get('noticeDate') or ''
            deadline_str = item.get('lastDate') or item.get('deadline') or ''

            detected_exam = self._detect_exam(title, '')
            category, sub_category, importance = self._classify_notice(title)

            attachments = []
            if full_url.lower().endswith('.pdf'):
                attachments.append({
                    'title': title[:100],
                    'file_url': full_url,
                    'mime_type': 'application/pdf',
                })

            results.append({
                'title': title,
                'summary': item.get('description') or title,
                'url': full_url,
                'date_str': str(date_str) if date_str else None,
                'deadline_str': str(deadline_str) if deadline_str else None,
                'category': category,
                'sub_category': sub_category,
                'importance': importance,
                'institution': 'Staff Selection Commission (SSC)',
                'exam': detected_exam or 'SSC Examination',
                'course': detected_exam or 'Staff Selection Commission',
                'semester': '',
                'attachments': attachments,
            })

        return results

    def _detect_exam(self, title: str, context: str) -> str:
        combined = f"{title} {context}"
        for pattern, name in self.EXAM_PATTERNS:
            if pattern.search(combined):
                return name
        return ""

    def _classify_notice(self, title: str):
        title_lower = title.lower()
        category = "COMPETITIVE_EXAMS"
        sub_category = "EXAM_NOTICE"
        importance = "NORMAL"

        if any(k in title_lower for k in ('notice of examination', 'notification for', 'apply online', 'recruitment')):
            sub_category = "APPLICATION_OPEN"
            importance = "URGENT"
        elif any(k in title_lower for k in ('admit card', 'admission certificate', 'hall ticket', 'application status')):
            sub_category = "ADMIT_CARD"
            importance = "URGENT"
        elif any(k in title_lower for k in ('tentative answer key', 'final answer key', 'response sheet', 'challenges')):
            sub_category = "ANSWER_KEY"
            importance = "IMPORTANT"
        elif any(k in title_lower for k in ('result', 'marks of qualified', 'cutoff', 'cut-off', 'merit list', 'final select list')):
            sub_category = "RESULT"
            importance = "URGENT"
        elif any(k in title_lower for k in ('schedule of examinations', 'tentative calendar', 'exam date', 'rescheduled')):
            sub_category = "TIMETABLE"
            importance = "IMPORTANT"
        elif any(k in title_lower for k in ('document verification', 'dv schedule', 'medical examination', 'pet/pst')):
            sub_category = "COUNSELLING"
            importance = "IMPORTANT"

        return category, sub_category, importance

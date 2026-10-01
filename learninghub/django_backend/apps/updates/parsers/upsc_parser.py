"""
Union Public Service Commission (UPSC) Official Notice Parser.
Domain: upsc.gov.in
"""
import re
from typing import List, Dict, Any
from urllib.parse import urljoin
from .base import BaseUpdateParser


class UPSCNoticeParser(BaseUpdateParser):
    """
    Extracts official examination notifications, timetables, admit cards, and results from the
    Union Public Service Commission (UPSC), covering Civil Services (CSE), NDA, CDS, CMS,
    Engineering Services (ESE/IES), CAPF, and IFS.
    """

    DATE_PATTERN = re.compile(r'(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})')
    DEADLINE_PATTERN = re.compile(
        r'(?:last\s*date|closing\s*date|deadline|upto|till)[\s:]*(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})',
        re.IGNORECASE
    )

    EXAM_PATTERNS = [
        (re.compile(r'\b(Civil\s*Services|CSE|IAS|IPS|IFS)\b', re.IGNORECASE), 'Civil Services (CSE)'),
        (re.compile(r'\b(NDA|National\s*Defence\s*Academy|Naval\s*Academy)\b', re.IGNORECASE), 'NDA & NA'),
        (re.compile(r'\b(CDS|Combined\s*Defence\s*Services)\b', re.IGNORECASE), 'CDS'),
        (re.compile(r'\b(CAPF|Central\s*Armed\s*Police|Assistant\s*Commandant)\b', re.IGNORECASE), 'CAPF (AC)'),
        (re.compile(r'\b(Engineering\s*Services|ESE|IES)\b', re.IGNORECASE), 'Engineering Services (ESE)'),
        (re.compile(r'\b(Combined\s*Medical\s*Services|CMS)\b', re.IGNORECASE), 'Combined Medical Services (CMS)'),
        (re.compile(r'\b(Indian\s*Forest\s*Service|IFoS)\b', re.IGNORECASE), 'Indian Forest Service (IFoS)'),
        (re.compile(r'\b(Geo[\s\-]Scientist|CGSE)\b', re.IGNORECASE), 'Combined Geo-Scientist'),
    ]

    def parse(self, content: str, base_url: str = "https://upsc.gov.in") -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []
        if not content:
            return results

        # Match table rows or list items from UPSC Examination tables
        items = re.findall(
            r'<(?:tr|li|div\s+class=["\'][^"\']*(?:views-row|exam-item|notice-list|item)[^"\']*["\'])[^>]*>(.*?)</(?:tr|li|div)>',
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

                # Date extraction
                date_match = self.DATE_PATTERN.search(clean_text)
                date_str = date_match.group(1) if date_match else None

                # Deadline extraction
                deadline_match = self.DEADLINE_PATTERN.search(clean_text) or self.DEADLINE_PATTERN.search(raw_title)
                deadline_str = deadline_match.group(1) if deadline_match else None

                detected_exam = self._detect_exam(raw_title, clean_text)
                category, sub_category, importance = self._classify_notice(raw_title)

                attachments = []
                if href.lower().endswith(('.pdf', '.doc', '.docx')):
                    attachments.append({
                        'title': raw_title[:100],
                        'file_url': full_url,
                        'mime_type': 'application/pdf',
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
                    'institution': 'Union Public Service Commission (UPSC)',
                    'exam': detected_exam or 'UPSC Examination',
                    'course': detected_exam or 'Union Public Service Commission',
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

        if any(k in title_lower for k in ('examination notice', 'notification for', 'apply online', 'online application', 'recruitment')):
            sub_category = "APPLICATION_OPEN"
            importance = "URGENT"
        elif any(k in title_lower for k in ('daf', 'detailed application form')):
            sub_category = "EXAM_FORM"
            importance = "URGENT"
        elif any(k in title_lower for k in ('e-admit card', 'admit card', 'hall ticket')):
            sub_category = "ADMIT_CARD"
            importance = "URGENT"
        elif any(k in title_lower for k in ('final result', 'written result', 'reserve list', 'marks of recommended', 'cut-off')):
            sub_category = "RESULT"
            importance = "URGENT"
        elif any(k in title_lower for k in ('examination time table', 'programme of examinations', 'annual calendar', 'exam schedule')):
            sub_category = "TIMETABLE"
            importance = "IMPORTANT"
        elif any(k in title_lower for k in ('personality test', 'interview schedule', 'interview letters')):
            sub_category = "COUNSELLING"
            importance = "IMPORTANT"

        return category, sub_category, importance

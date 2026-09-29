"""
Banaras Hindu University (BHU) Notice Board & Circular Parser.
Domain: bhu.ac.in / bhuonline.in
"""
import re
from typing import List, Dict, Any
from urllib.parse import urljoin
from .base import BaseUpdateParser


class BHUNoticeParser(BaseUpdateParser):
    """
    Extracts official notices from Banaras Hindu University portals,
    handling academic circulars, semester examinations, counseling, and entrance updates.
    """

    DATE_PATTERN = re.compile(r'(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})')
    DEADLINE_PATTERN = re.compile(
        r'(?:last\s*date|deadline|extended\s*(?:up\s*to|till)|antim\s*tithi)[\s:]*(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})',
        re.IGNORECASE
    )

    COURSE_PATTERNS = [
        (re.compile(r'\b(B\.?Tech|BTech)\b', re.IGNORECASE), 'B.Tech'),
        (re.compile(r'\b(BCA)\b', re.IGNORECASE), 'BCA'),
        (re.compile(r'\b(MCA)\b', re.IGNORECASE), 'MCA'),
        (re.compile(r'\b(MBA)\b', re.IGNORECASE), 'MBA'),
        (re.compile(r'\b(B\.?Sc\s*(?:\(Ag\)|\(Agriculture\)|Bio|Maths)?|BSc)\b', re.IGNORECASE), 'B.Sc'),
        (re.compile(r'\b(M\.?Sc|MSc)\b', re.IGNORECASE), 'M.Sc'),
        (re.compile(r'\b(B\.?A\s*(?:\(Hons\))?|BA)\b', re.IGNORECASE), 'BA'),
        (re.compile(r'\b(M\.?A|MA)\b', re.IGNORECASE), 'MA'),
        (re.compile(r'\b(B\.?Com\s*(?:\(Hons\))?|BCom)\b', re.IGNORECASE), 'B.Com'),
        (re.compile(r'\b(M\.?Com|MCom)\b', re.IGNORECASE), 'M.Com'),
        (re.compile(r'\b(LL\.?B|LLB)\b', re.IGNORECASE), 'LLB'),
        (re.compile(r'\b(LL\.?M|LLM)\b', re.IGNORECASE), 'LLM'),
        (re.compile(r'\b(B\.?Ed|BEd)\b', re.IGNORECASE), 'B.Ed'),
        (re.compile(r'\b(RET|Ph\.?D|Doctoral)\b', re.IGNORECASE), 'Ph.D / RET'),
    ]

    SEMESTER_PATTERN = re.compile(
        r'\b(\d+(?:st|nd|rd|th)?\s*(?:sem(?:ester)?|yr|year))\b',
        re.IGNORECASE
    )

    def parse(self, content: str, base_url: str = "https://bhu.ac.in") -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []
        if not content:
            return results

        # Match table rows or notice list items
        items = re.findall(r'<(?:tr|li|div\s+class=["\'][^"\']*(?:notice|item|news)[^"\']*["\'])[^>]*>(.*?)</(?:tr|li|div)>', content, re.DOTALL | re.IGNORECASE)
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

                # Detect Course
                detected_course = None
                for pattern, name in self.COURSE_PATTERNS:
                    if pattern.search(raw_title) or pattern.search(clean_text):
                        detected_course = name
                        break

                # Detect Semester
                sem_match = self.SEMESTER_PATTERN.search(raw_title) or self.SEMESTER_PATTERN.search(clean_text)
                detected_semester = sem_match.group(1) if sem_match else None

                # Detect Category & Sub-Category
                title_lower = raw_title.lower()
                category = "ACADEMIC"
                sub_category = "UNIVERSITY_NOTICE"
                importance = "NORMAL"

                if any(k in title_lower for k in ('exam', 'pariksha', 'datesheet', 'schedule', 'admit card', 'center', 'centre', 'practical')):
                    category = "EXAMINATION"
                    if 'form' in title_lower:
                        sub_category = "EXAM_FORM"
                        importance = "IMPORTANT"
                    elif 'admit' in title_lower or 'hall ticket' in title_lower:
                        sub_category = "ADMIT_CARD"
                        importance = "IMPORTANT"
                    elif 'time table' in title_lower or 'datesheet' in title_lower or 'schedule' in title_lower:
                        sub_category = "TIMETABLE"
                        importance = "IMPORTANT"
                    elif 'reval' in title_lower or 'scrutiny' in title_lower:
                        sub_category = "REVALUATION"
                        importance = "IMPORTANT"
                    elif 'center' in title_lower or 'centre' in title_lower:
                        sub_category = "EXAM_CENTER"
                elif any(k in title_lower for k in ('result', 'score card', 'marksheet')):
                    category = "EXAMINATION"
                    sub_category = "RESULT"
                    importance = "IMPORTANT"
                elif any(k in title_lower for k in ('counselling', 'counseling', 'admission', 'cuet', 'allotment', 'merit', 'spot round', 'uet', 'pet')):
                    category = "ADMISSION"
                    sub_category = "COUNSELLING"
                    importance = "IMPORTANT"
                elif any(k in title_lower for k in ('scholarship', 'fellowship', 'stipend')):
                    category = "SCHOLARSHIP"
                    sub_category = "SCHOLARSHIP_OPEN"
                elif any(k in title_lower for k in ('placement', 'internship', 'recruitment', 'job')):
                    category = "CAREER"
                    sub_category = "PLACEMENT"

                if any(k in title_lower for k in ('urgent', 'immediate', 'rescheduled', 'postponed', 'extended up to')):
                    importance = "URGENT"

                # Attachments
                attachments = []
                if full_url.lower().endswith(('.pdf', '.doc', '.docx', '.zip')):
                    attachments.append({
                        'title': f"{raw_title[:60]} Document",
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
                    'course': detected_course,
                    'semester': detected_semester,
                    'attachments': attachments
                })

        return results

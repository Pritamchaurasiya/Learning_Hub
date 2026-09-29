"""
University of Allahabad (Central University) Notice Board Parser.
Official portal: https://allduniv.ac.in
"""
import re
from typing import List, Dict, Any
from urllib.parse import urljoin
from .base import BaseUpdateParser


class AllahabadUnivNoticeParser(BaseUpdateParser):
    """
    Extracts notices, admissions cutoff circulars, and exam timetables
    from the University of Allahabad official public portal.
    """

    DATE_PATTERN = re.compile(r'(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})')
    DEADLINE_PATTERN = re.compile(
        r'(?:last\s*date|deadline|extended\s*up\s*to|antim\s*tithi|up\s*to)[\s:]*(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})',
        re.IGNORECASE
    )

    def parse(self, content: str, base_url: str = "https://allduniv.ac.in") -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []
        if not content:
            return results

        # 1. Match table rows or list items: <tr>...</tr> or <li>...</li>
        items = re.findall(r'<(?:tr|li)[^>]*>(.*?)</(?:tr|li)>', content, re.DOTALL | re.IGNORECASE)
        if not items:
            # Fallback to general block extraction
            items = re.findall(r'<div[^>]*class=["\'][^"\']*(?:notice|news|announcement)[^"\']*["\'][^>]*>(.*?)</div>', content, re.DOTALL | re.IGNORECASE)

        for block in items:
            links = re.findall(r'<a\s+[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', block, re.DOTALL | re.IGNORECASE)
            clean_text = re.sub(r'<[^>]+>', ' ', block)
            clean_text = re.sub(r'\s+', ' ', clean_text).strip()

            if not links and len(clean_text) < 10:
                continue

            for href, anchor_text in links:
                raw_title = re.sub(r'<[^>]+>', '', anchor_text).strip()
                if not raw_title or len(raw_title) < 5:
                    raw_title = clean_text[:140]

                if not raw_title or len(raw_title) < 5:
                    continue

                full_url = urljoin(base_url, href)

                # Date parsing
                date_match = self.DATE_PATTERN.search(clean_text)
                date_str = date_match.group(1) if date_match else None

                # Deadline parsing
                deadline_match = self.DEADLINE_PATTERN.search(clean_text)
                deadline_str = deadline_match.group(1) if deadline_match else None

                # Category classification
                title_lower = raw_title.lower()
                category = "ACADEMIC"
                sub_category = "UNIVERSITY_NOTICE"
                importance = "NORMAL"

                if any(k in title_lower for k in ('exam', 'pariksha', 'time table', 'datesheet', 'centre', 'admit card', 'back paper', 'improvement')):
                    category = "EXAMINATION"
                    if 'time table' in title_lower or 'schedule' in title_lower or 'datesheet' in title_lower:
                        sub_category = "TIMETABLE"
                        importance = "IMPORTANT"
                    elif 'admit' in title_lower:
                        sub_category = "ADMIT_CARD"
                        importance = "IMPORTANT"
                    elif 'form' in title_lower:
                        sub_category = "EXAM_FORM"
                        importance = "IMPORTANT"
                    elif 'back paper' in title_lower or 'improvement' in title_lower:
                        sub_category = "BACK_PAPER"
                elif any(k in title_lower for k in ('result', 'parinam', 'marksheet', 'scrutiny')):
                    category = "EXAMINATION"
                    sub_category = "RESULT"
                    importance = "URGENT"
                elif any(k in title_lower for k in ('admission', 'counselling', 'cutoff', 'cut-off', 'cret', 'pravesh', 'merit list')):
                    category = "ADMISSION"
                    if 'cutoff' in title_lower or 'cut-off' in title_lower or 'merit' in title_lower:
                        sub_category = "CUTOFF_LIST"
                        importance = "URGENT"
                    elif 'counselling' in title_lower:
                        sub_category = "COUNSELLING"
                        importance = "IMPORTANT"
                    else:
                        sub_category = "ADMISSION_NOTICE"
                elif any(k in title_lower for k in ('scholarship', 'fellowship')):
                    category = "SCHOLARSHIP"
                    sub_category = "SCHOLARSHIP_NOTICE"

                # Identify course
                course = ""
                course_match = re.search(r'\b(BA|B\.Sc|B\.Com|MA|M\.Sc|M\.Com|LLB|LLM|B\.Ed|M\.Ed|B\.Tech|CRET|Ph\.D)\b', raw_title, re.IGNORECASE)
                if course_match:
                    course = course_match.group(1).upper()

                # Identify semester / annual
                semester = ""
                sem_match = re.search(r'\b([1-8](?:st|nd|rd|th)?\s*(?:sem|semester)|annual|odd\s*sem|even\s*sem)\b', raw_title, re.IGNORECASE)
                if sem_match:
                    semester = sem_match.group(1).strip()

                attachments = []
                if full_url.lower().endswith(('.pdf', '.docx', '.xlsx', '.zip')):
                    attachments.append({
                        "title": raw_title[:100],
                        "url": full_url,
                        "mime_type": "application/pdf" if full_url.lower().endswith('.pdf') else "application/octet-stream"
                    })

                results.append({
                    "title": raw_title,
                    "url": full_url,
                    "summary": clean_text[:300] if len(clean_text) > len(raw_title) else raw_title,
                    "date_str": date_str,
                    "deadline_str": deadline_str,
                    "category": category,
                    "sub_category": sub_category,
                    "importance": importance,
                    "institution": "University of Allahabad",
                    "course": course,
                    "semester": semester,
                    "attachments": attachments,
                })

        return results

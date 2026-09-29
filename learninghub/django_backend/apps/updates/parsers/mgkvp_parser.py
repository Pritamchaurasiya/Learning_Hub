"""
Mahatma Gandhi Kashi Vidyapith (MGKVP) Notice Board Parser.
"""
import re
from typing import List, Dict, Any
from urllib.parse import urljoin
from .base import BaseUpdateParser


class MGKVPNoticeParser(BaseUpdateParser):
    """
    Extracts notices from MGKVP public tables, handling date extraction,
    relative document URLs, and category classification.
    """

    DATE_PATTERN = re.compile(r'(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})')
    DEADLINE_PATTERN = re.compile(
        r'(?:last\s*date|deadline|extended\s*up\s*to|antim\s*tithi)[\s:]*(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})',
        re.IGNORECASE
    )

    def parse(self, content: str, base_url: str = "https://mgkvp.ac.in") -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []
        if not content:
            return results

        # Match table rows or anchor containers
        # Look for table rows: <tr>...<td>date</td>...<td>title/link</td>...</tr>
        row_matches = re.findall(r'<tr[^>]*>(.*?)</tr>', content, re.DOTALL | re.IGNORECASE)

        for row in row_matches:
            # Extract all anchor tags
            links = re.findall(r'<a\s+[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', row, re.DOTALL | re.IGNORECASE)
            # Extract plain text for date search
            clean_text = re.sub(r'<[^>]+>', ' ', row)
            clean_text = re.sub(r'\s+', ' ', clean_text).strip()

            if not links and len(clean_text) < 10:
                continue

            for href, anchor_text in links:
                raw_title = re.sub(r'<[^>]+>', '', anchor_text).strip()
                if not raw_title or len(raw_title) < 5:
                    raw_title = clean_text[:120]

                if not raw_title:
                    continue

                full_url = urljoin(base_url, href)

                # Find publication date in row text
                date_match = self.DATE_PATTERN.search(clean_text)
                date_str = date_match.group(1) if date_match else None

                # Find deadline if mentioned in title or text
                deadline_match = self.DEADLINE_PATTERN.search(clean_text)
                deadline_str = deadline_match.group(1) if deadline_match else None

                # Detect category heuristics
                title_lower = raw_title.lower()
                category = "ACADEMIC"
                sub_category = "UNIVERSITY_NOTICE"
                importance = "NORMAL"

                if any(k in title_lower for k in ('exam', 'pariksha', 'admit card', 'center', 'centre', 'time table', 'datesheet', 'scrutiny', 'back paper')):
                    category = "EXAMINATION"
                    if 'form' in title_lower:
                        sub_category = "EXAM_FORM"
                        importance = "IMPORTANT"
                    elif 'admit' in title_lower:
                        sub_category = "ADMIT_CARD"
                        importance = "IMPORTANT"
                    elif 'time table' in title_lower or 'datesheet' in title_lower:
                        sub_category = "TIMETABLE"
                        importance = "IMPORTANT"
                    elif 'center' in title_lower or 'centre' in title_lower:
                        sub_category = "EXAM_CENTER"
                    elif 'scrutiny' in title_lower or 'revaluation' in title_lower:
                        sub_category = "REVALUATION"
                elif any(k in title_lower for k in ('result', 'parinam', 'score')):
                    category = "EXAMINATION"
                    sub_category = "RESULT"
                    importance = "URGENT"
                elif any(k in title_lower for k in ('admission', 'pravesh', 'counselling', 'entrance')):
                    category = "ADMISSION"
                    sub_category = "ADMISSION_OPEN"
                elif any(k in title_lower for k in ('scholarship', 'chhatravritti')):
                    category = "SCHOLARSHIP"
                    sub_category = "SCHOLARSHIP_OPEN"

                # Check course mention (e.g. BCA, B.Sc, BA, B.Com, MCA)
                course = ""
                course_match = re.search(r'\b(BCA|MCA|B\.Tech|MBA|B\.Sc|M\.Sc|BA|MA|B\.Com|M\.Com|B\.Ed|LLB)\b', raw_title, re.IGNORECASE)
                if course_match:
                    course = course_match.group(1).upper()

                # Check semester mention
                semester = ""
                sem_match = re.search(r'\b([1-8](?:st|nd|rd|th)?\s*(?:sem|semester))\b', raw_title, re.IGNORECASE)
                if sem_match:
                    semester = sem_match.group(1)

                attachments = []
                if href.lower().endswith(('.pdf', '.doc', '.docx', '.zip')):
                    attachments.append({
                        "title": f"{raw_title[:60]}.pdf",
                        "url": full_url,
                        "mime_type": "application/pdf"
                    })

                results.append({
                    "title": raw_title,
                    "url": full_url,
                    "date_str": date_str,
                    "deadline_str": deadline_str,
                    "summary": clean_text[:300] if len(clean_text) > len(raw_title) else raw_title,
                    "category": category,
                    "sub_category": sub_category,
                    "institution": "Mahatma Gandhi Kashi Vidyapith (MGKVP)",
                    "course": course,
                    "semester": semester,
                    "importance": importance,
                    "attachments": attachments
                })

        return results

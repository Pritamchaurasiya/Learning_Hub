"""
Dr. A.P.J. Abdul Kalam Technical University (AKTU / UPTU) Notice & Circulars Parser.
Official portal: https://aktu.ac.in/circulars.html
"""
import re
from typing import List, Dict, Any
from urllib.parse import urljoin
from .base import BaseUpdateParser


class AKTUNoticeParser(BaseUpdateParser):
    """
    Extracts official circulars and notices from AKTU public circular boards.
    Handles dates, PDF attachments, exam form deadlines, admit cards, and course tags.
    """

    DATE_PATTERN = re.compile(r'(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})')
    DEADLINE_PATTERN = re.compile(
        r'(?:last\s*date|deadline|extended\s*up\s*to|antim\s*tithi|till)[\s:]*(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})',
        re.IGNORECASE
    )

    def parse(self, content: str, base_url: str = "https://aktu.ac.in") -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []
        if not content:
            return results

        # 1. Match table rows: <tr>...<td>date</td>...<td>title/link</td>...</tr>
        row_matches = re.findall(r'<tr[^>]*>(.*?)</tr>', content, re.DOTALL | re.IGNORECASE)

        for row in row_matches:
            links = re.findall(r'<a\s+[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', row, re.DOTALL | re.IGNORECASE)
            clean_text = re.sub(r'<[^>]+>', ' ', row)
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

                # Date extraction
                date_match = self.DATE_PATTERN.search(clean_text)
                date_str = date_match.group(1) if date_match else None

                # Deadline extraction
                deadline_match = self.DEADLINE_PATTERN.search(clean_text)
                deadline_str = deadline_match.group(1) if deadline_match else None

                # Category & Sub-category heuristic classification
                title_lower = raw_title.lower()
                category = "ACADEMIC"
                sub_category = "CIRCULAR"
                importance = "NORMAL"

                if any(k in title_lower for k in ('exam', 'pariksha', 'datesheet', 'schedule', 'centre', 'center', 'carry over', 'cop', 'admit card', 'practical')):
                    category = "EXAMINATION"
                    if 'form' in title_lower or 'registration' in title_lower:
                        sub_category = "EXAM_FORM"
                        importance = "IMPORTANT"
                    elif 'admit' in title_lower:
                        sub_category = "ADMIT_CARD"
                        importance = "IMPORTANT"
                    elif 'carry over' in title_lower or 'cop' in title_lower:
                        sub_category = "CARRY_OVER_EXAM"
                        importance = "IMPORTANT"
                    elif 'schedule' in title_lower or 'datesheet' in title_lower or 'time table' in title_lower:
                        sub_category = "TIMETABLE"
                        importance = "IMPORTANT"
                    elif 'practical' in title_lower or 'center' in title_lower or 'centre' in title_lower:
                        sub_category = "EXAM_CENTER"
                elif any(k in title_lower for k in ('result', 'parinam', 'challenge evaluation', 'scrutiny')):
                    category = "EXAMINATION"
                    sub_category = "RESULT"
                    importance = "URGENT"
                elif any(k in title_lower for k in ('counselling', 'cuet', 'uptac', 'admission', 'allotment')):
                    category = "ADMISSION"
                    sub_category = "COUNSELLING"
                    importance = "IMPORTANT"
                elif any(k in title_lower for k in ('scholarship', 'fee concession', 'chhatravritti')):
                    category = "SCHOLARSHIP"
                    sub_category = "SCHOLARSHIP_NOTICE"

                # Extract degree program if present (B.Tech, M.Tech, MCA, MBA, B.Pharm, M.Pharm)
                course = ""
                course_match = re.search(r'\b(B\.Tech|M\.Tech|B\.Pharm|M\.Pharm|MCA|MBA|B\.Arch|BHMCT)\b', raw_title, re.IGNORECASE)
                if course_match:
                    course = course_match.group(1).upper()

                # Extract semester
                semester = ""
                sem_match = re.search(r'\b([1-8](?:st|nd|rd|th)?\s*(?:sem|semester)|odd\s*sem(?:ester)?|even\s*sem(?:ester)?)\b', raw_title, re.IGNORECASE)
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
                    "institution": "Dr. A.P.J. Abdul Kalam Technical University (AKTU)",
                    "course": course,
                    "semester": semester,
                    "attachments": attachments,
                })

        return results

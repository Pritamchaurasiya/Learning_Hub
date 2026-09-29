"""
RSS 2.0 / Atom Feed Parser.
"""
import xml.etree.ElementTree as ET
from typing import List, Dict, Any
from .base import BaseUpdateParser


class RSSFeedParser(BaseUpdateParser):
    """
    Standard XML RSS 2.0 / Atom parser for official educational news feeds.
    """

    def parse(self, content: str, base_url: str = "") -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []
        if not content:
            return results

        try:
            root = ET.fromstring(content)
        except ET.ParseError:
            return results

        # Support RSS channel -> item
        for item in root.findall('.//item'):
            title_elem = item.find('title')
            link_elem = item.find('link')
            desc_elem = item.find('description')
            pub_date_elem = item.find('pubDate')

            title = title_elem.text.strip() if title_elem is not None and title_elem.text else ''
            link = link_elem.text.strip() if link_elem is not None and link_elem.text else base_url
            desc = desc_elem.text.strip() if desc_elem is not None and desc_elem.text else title
            pub_date = pub_date_elem.text.strip() if pub_date_elem is not None and pub_date_elem.text else None

            if not title:
                continue

            results.append({
                "title": title,
                "url": link,
                "date_str": pub_date,
                "summary": desc[:300],
                "category": "GENERAL",
                "sub_category": "ANNOUNCEMENT",
                "institution": "",
                "attachments": []
            })

        return results

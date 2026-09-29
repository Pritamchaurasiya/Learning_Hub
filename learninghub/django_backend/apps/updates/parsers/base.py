"""
Abstract Base Parser for Ingestion Sources.
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any


class BaseUpdateParser(ABC):
    """
    Abstract interface for converting raw HTTP payload into candidate update records.
    """

    @abstractmethod
    def parse(self, content: str, base_url: str = "") -> List[Dict[str, Any]]:
        """
        Parses raw HTML/XML/JSON content into a list of standardized notice dictionaries.
        Each dictionary should contain:
        - title: str
        - url: str
        - date_str: str (or None)
        - summary: str
        - category: str
        - sub_category: str
        - attachments: list of {title, url}
        """
        pass

"""
Semantic Parsing

Natural language to structured output:
1. Intent classification.
2. Entity extraction.
3. SQL generation.
"""

import logging
import random
import re
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class Intent(Enum):
    QUERY = "query"
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    LIST = "list"
    UNKNOWN = "unknown"


@dataclass
class Entity:
    text: str
    type: str
    start: int
    end: int
    value: Any = None


@dataclass
class ParseResult:
    intent: Intent
    entities: List[Entity]
    confidence: float
    sql: Optional[str] = None


class IntentClassifier:
    """Classify user intent from text."""
    def __init__(self):
        self.intent_patterns = {
            Intent.QUERY: ['show', 'get', 'find', 'what', 'display', 'list', 'fetch'],
            Intent.CREATE: ['create', 'add', 'insert', 'new', 'make', 'register'],
            Intent.UPDATE: ['update', 'modify', 'change', 'edit', 'set', 'alter'],
            Intent.DELETE: ['delete', 'remove', 'drop', 'erase', 'cancel'],
            Intent.LIST: ['all', 'every', 'each', 'list all', 'show all']
        }

    def classify(self, text: str) -> Tuple[Intent, float]:
        """Classify intent from text."""
        text_lower = text.lower()
        
        scores = {}
        for intent, patterns in self.intent_patterns.items():
            score = sum(1 for p in patterns if p in text_lower)
            if score > 0:
                scores[intent] = score / len(patterns)
        
        if not scores:
            return Intent.UNKNOWN, 0.0
        
        best_intent = max(scores.items(), key=lambda x: x[1])
        return best_intent[0], min(best_intent[1] * 2, 1.0)


class EntityExtractor:
    """Extract entities from text."""
    def __init__(self):
        self.entity_patterns = {
            'NUMBER': r'\b\d+(?:\.\d+)?\b',
            'DATE': r'\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}/\d{1,2}/\d{2,4}\b',
            'EMAIL': r'\b[\w.-]+@[\w.-]+\.\w+\b',
            'NAME': r'\b[A-Z][a-z]+ [A-Z][a-z]+\b',
            'TABLE': r'\b(?:users?|customers?|orders?|products?|items?)\b',
            'COLUMN': r'\b(?:id|name|email|price|quantity|date|status)\b'
        }

    def extract(self, text: str) -> List[Entity]:
        """Extract all entities from text."""
        entities = []
        
        for entity_type, pattern in self.entity_patterns.items():
            for match in re.finditer(pattern, text, re.IGNORECASE):
                entities.append(Entity(
                    text=match.group(),
                    type=entity_type,
                    start=match.start(),
                    end=match.end(),
                    value=self._parse_value(match.group(), entity_type)
                ))
        
        # Sort by position
        entities.sort(key=lambda e: e.start)
        return entities

    def _parse_value(self, text: str, entity_type: str) -> Any:
        """Parse entity value."""
        if entity_type == 'NUMBER':
            try:
                if '.' in text:
                    return float(text)
                return int(text)
            except ValueError:
                return text
        return text


class SQLGenerator:
    """Generate SQL from parsed intent and entities."""
    def __init__(self):
        self.default_table = "items"

    def _find_table(self, entities: List[Entity]) -> str:
        """Find table name from entities."""
        for entity in entities:
            if entity.type == 'TABLE':
                return entity.text.lower()
        return self.default_table

    def _find_columns(self, entities: List[Entity]) -> List[str]:
        """Find column names from entities."""
        columns = []
        for entity in entities:
            if entity.type == 'COLUMN':
                columns.append(entity.text.lower())
        return columns if columns else ['*']

    def _find_conditions(self, entities: List[Entity], text: str) -> List[str]:
        """Extract WHERE conditions."""
        conditions = []
        
        # Look for comparison patterns
        patterns = [
            r'(\w+)\s*=\s*["\']?(\w+)["\']?',
            r'(\w+)\s*(?:is|equals?)\s*["\']?(\w+)["\']?',
            r'where\s+(\w+)\s*=\s*["\']?(\w+)["\']?',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for col, val in matches:
                if col.lower() in ['id', 'name', 'email', 'status', 'price']:
                    if val.isdigit():
                        conditions.append(f"{col} = {val}")
                    else:
                        conditions.append(f"{col} = '{val}'")
        
        # Add number-based conditions
        for entity in entities:
            if entity.type == 'NUMBER' and 'id' in text.lower():
                conditions.append(f"id = {entity.value}")
        
        return conditions

    def generate(self, intent: Intent, entities: List[Entity], text: str) -> str:
        """Generate SQL query."""
        table = self._find_table(entities)
        columns = self._find_columns(entities)
        conditions = self._find_conditions(entities, text)
        
        if intent == Intent.QUERY or intent == Intent.LIST:
            sql = f"SELECT {', '.join(columns)} FROM {table}"
            if conditions:
                sql += f" WHERE {' AND '.join(conditions)}"
            return sql
        
        elif intent == Intent.CREATE:
            # Extract values for INSERT
            cols = []
            vals = []
            for entity in entities:
                if entity.type in ['NUMBER', 'NAME', 'EMAIL']:
                    cols.append(entity.type.lower())
                    if isinstance(entity.value, str):
                        vals.append(f"'{entity.value}'")
                    else:
                        vals.append(str(entity.value))
            
            if cols:
                return f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({', '.join(vals)})"
            return f"INSERT INTO {table} (column) VALUES (value)"
        
        elif intent == Intent.UPDATE:
            sql = f"UPDATE {table} SET column = value"
            if conditions:
                sql += f" WHERE {' AND '.join(conditions)}"
            return sql
        
        elif intent == Intent.DELETE:
            sql = f"DELETE FROM {table}"
            if conditions:
                sql += f" WHERE {' AND '.join(conditions)}"
            return sql
        
        return f"-- Could not generate SQL for intent: {intent.value}"


class SemanticParser:
    """Complete semantic parsing pipeline."""
    def __init__(self):
        self.intent_classifier = IntentClassifier()
        self.entity_extractor = EntityExtractor()
        self.sql_generator = SQLGenerator()

    def parse(self, text: str) -> ParseResult:
        """Parse natural language to structured output."""
        # Step 1: Classify intent
        intent, intent_confidence = self.intent_classifier.classify(text)
        
        # Step 2: Extract entities
        entities = self.entity_extractor.extract(text)
        
        # Step 3: Generate SQL
        sql = self.sql_generator.generate(intent, entities, text)
        
        return ParseResult(
            intent=intent,
            entities=entities,
            confidence=intent_confidence,
            sql=sql
        )

    def batch_parse(self, texts: List[str]) -> List[ParseResult]:
        """Parse multiple texts."""
        return [self.parse(text) for text in texts]

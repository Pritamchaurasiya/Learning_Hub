"""
Token Management

Tokenization utilities:
1. Token counting.
2. Context management.
3. Truncation strategies.
"""

import re
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from enum import Enum


class TruncationStrategy(Enum):
    LEFT = "left"
    RIGHT = "right"
    MIDDLE = "middle"
    SLIDING = "sliding"


@dataclass
class TokenBudget:
    max_tokens: int
    input_reserved: int = 0
    output_reserved: int = 0

    @property
    def available(self) -> int:
        return self.max_tokens - self.input_reserved - self.output_reserved


class SimpleTokenizer:
    """Simple word-based tokenizer."""
    def __init__(self, vocab_size: int = 50000):
        self.vocab_size = vocab_size
        self.special_tokens = {'<pad>': 0, '<unk>': 1, '<bos>': 2, '<eos>': 3}

    def encode(self, text: str) -> List[int]:
        # Simple word-based encoding
        words = re.findall(r'\w+|[^\w\s]', text.lower())
        return [hash(w) % (self.vocab_size - 4) + 4 for w in words]

    def decode(self, tokens: List[int]) -> str:
        # Simplified - just return placeholder
        return f"[{len(tokens)} tokens]"

    def count(self, text: str) -> int:
        return len(self.encode(text))


class ContextManager:
    """Manage context within token limits."""
    def __init__(self, max_tokens: int = 4096):
        self.max_tokens = max_tokens
        self.tokenizer = SimpleTokenizer()
        self.messages: List[Dict] = []

    def add_message(self, role: str, content: str) -> bool:
        tokens = self.tokenizer.count(content)
        total = sum(self.tokenizer.count(m['content']) for m in self.messages)
        
        if total + tokens > self.max_tokens:
            return False
        
        self.messages.append({'role': role, 'content': content, 'tokens': tokens})
        return True

    def get_context(self) -> List[Dict]:
        return self.messages

    def clear(self):
        self.messages = []

    def trim_to_fit(self, new_tokens: int) -> int:
        removed = 0
        while self.messages and self._total_tokens() + new_tokens > self.max_tokens:
            removed += self.messages.pop(0).get('tokens', 0)
        return removed

    def _total_tokens(self) -> int:
        return sum(m.get('tokens', 0) for m in self.messages)


class Truncator:
    """Truncate text to fit token limits."""
    def __init__(self, tokenizer: SimpleTokenizer = None):
        self.tokenizer = tokenizer or SimpleTokenizer()

    def truncate(
        self,
        text: str,
        max_tokens: int,
        strategy: TruncationStrategy = TruncationStrategy.RIGHT
    ) -> str:
        tokens = self.tokenizer.encode(text)
        if len(tokens) <= max_tokens:
            return text
        
        words = re.findall(r'\w+|[^\w\s]|\s+', text)
        
        if strategy == TruncationStrategy.RIGHT:
            # Keep start
            result = []
            count = 0
            for word in words:
                word_tokens = self.tokenizer.count(word)
                if count + word_tokens > max_tokens:
                    break
                result.append(word)
                count += word_tokens
            return ''.join(result) + '...'
        
        elif strategy == TruncationStrategy.LEFT:
            # Keep end
            result = []
            count = 0
            for word in reversed(words):
                word_tokens = self.tokenizer.count(word)
                if count + word_tokens > max_tokens:
                    break
                result.insert(0, word)
                count += word_tokens
            return '...' + ''.join(result)
        
        elif strategy == TruncationStrategy.MIDDLE:
            # Keep start and end
            half = max_tokens // 2
            start = self.truncate(text, half, TruncationStrategy.RIGHT).rstrip('...')
            end = self.truncate(text, half, TruncationStrategy.LEFT).lstrip('...')
            return start + ' [...] ' + end
        
        return text[:max_tokens * 4]  # Rough approximation


class TokenManager:
    """Complete token management system."""
    def __init__(self, model_max_tokens: int = 4096):
        self.model_max = model_max_tokens
        self.tokenizer = SimpleTokenizer()
        self.truncator = Truncator(self.tokenizer)
        self.context = ContextManager(model_max_tokens)

    def count(self, text: str) -> int:
        return self.tokenizer.count(text)

    def fits(self, text: str, budget: TokenBudget) -> bool:
        return self.count(text) <= budget.available

    def truncate(
        self,
        text: str,
        max_tokens: int,
        strategy: TruncationStrategy = TruncationStrategy.RIGHT
    ) -> str:
        return self.truncator.truncate(text, max_tokens, strategy)

    def allocate_budget(
        self,
        system_prompt: str,
        user_input: str,
        output_reserve: int = 500
    ) -> Dict:
        system_tokens = self.count(system_prompt)
        input_tokens = self.count(user_input)
        
        total_input = system_tokens + input_tokens
        available_output = self.model_max - total_input
        
        if available_output < output_reserve:
            # Need to truncate input
            available_for_input = self.model_max - output_reserve - system_tokens
            truncated_input = self.truncate(user_input, available_for_input)
            input_tokens = self.count(truncated_input)
            user_input = truncated_input
        
        return {
            'system_tokens': system_tokens,
            'input_tokens': input_tokens,
            'output_budget': self.model_max - system_tokens - input_tokens,
            'truncated': user_input if input_tokens < self.count(user_input) else None
        }

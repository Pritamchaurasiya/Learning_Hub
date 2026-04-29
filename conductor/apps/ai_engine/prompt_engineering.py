"""
Prompt Engineering

Advanced prompting:
1. Template management.
2. Few-shot learning.
3. Chain prompting.
"""

import random
import re
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass
from enum import Enum


class PromptStrategy(Enum):
    ZERO_SHOT = "zero_shot"
    FEW_SHOT = "few_shot"
    CHAIN_OF_THOUGHT = "chain_of_thought"
    SELF_CONSISTENCY = "self_consistency"
    TREE_OF_THOUGHT = "tree_of_thought"


@dataclass
class PromptTemplate:
    name: str
    template: str
    variables: List[str]
    strategy: PromptStrategy = PromptStrategy.ZERO_SHOT


@dataclass
class Example:
    input: str
    output: str
    reasoning: Optional[str] = None


class TemplateManager:
    """Manage prompt templates."""
    def __init__(self):
        self.templates: Dict[str, PromptTemplate] = {}
        self._register_defaults()

    def _register_defaults(self):
        self.templates['qa'] = PromptTemplate(
            name='qa',
            template='Question: {question}\nAnswer:',
            variables=['question']
        )
        self.templates['summarize'] = PromptTemplate(
            name='summarize',
            template='Summarize the following text:\n{text}\nSummary:',
            variables=['text']
        )
        self.templates['classify'] = PromptTemplate(
            name='classify',
            template='Classify "{text}" into one of: {categories}\nCategory:',
            variables=['text', 'categories']
        )

    def add(self, template: PromptTemplate):
        self.templates[template.name] = template

    def get(self, name: str) -> Optional[PromptTemplate]:
        return self.templates.get(name)

    def render(self, name: str, **kwargs) -> str:
        template = self.templates.get(name)
        if not template:
            return ''
        result = template.template
        for var in template.variables:
            if var in kwargs:
                result = result.replace(f'{{{var}}}', str(kwargs[var]))
        return result


class FewShotBuilder:
    """Build few-shot prompts."""
    def __init__(self, max_examples: int = 5):
        self.max_examples = max_examples
        self.examples: List[Example] = []

    def add_example(self, example: Example):
        self.examples.append(example)
        if len(self.examples) > self.max_examples:
            self.examples.pop(0)

    def build(self, query: str, include_reasoning: bool = False) -> str:
        parts = []
        for ex in self.examples:
            if include_reasoning and ex.reasoning:
                parts.append(f'Input: {ex.input}\nReasoning: {ex.reasoning}\nOutput: {ex.output}')
            else:
                parts.append(f'Input: {ex.input}\nOutput: {ex.output}')
        parts.append(f'Input: {query}\nOutput:')
        return '\n\n'.join(parts)

    def select_examples(self, query: str, all_examples: List[Example], k: int = 3) -> List[Example]:
        # Simple selection based on word overlap
        query_words = set(query.lower().split())
        scored = []
        for ex in all_examples:
            ex_words = set(ex.input.lower().split())
            overlap = len(query_words & ex_words)
            scored.append((ex, overlap))
        scored.sort(key=lambda x: -x[1])
        return [ex for ex, _ in scored[:k]]


class ChainPrompt:
    """Chain multiple prompts."""
    def __init__(self):
        self.steps: List[Tuple[str, PromptTemplate]] = []

    def add_step(self, name: str, template: PromptTemplate):
        self.steps.append((name, template))

    def execute(self, initial_input: Dict[str, str], executor) -> Dict[str, str]:
        context = initial_input.copy()
        for name, template in self.steps:
            prompt = template.template
            for var in template.variables:
                if var in context:
                    prompt = prompt.replace(f'{{{var}}}', context[var])
            result = executor(prompt)
            context[name] = result
        return context


class SelfConsistency:
    """Self-consistency sampling."""
    def __init__(self, n_samples: int = 5):
        self.n_samples = n_samples

    def sample(self, prompt: str, executor) -> str:
        responses = []
        for _ in range(self.n_samples):
            response = executor(prompt)
            responses.append(response)
        # Majority voting (simplified)
        from collections import Counter
        counts = Counter(responses)
        return counts.most_common(1)[0][0]


class PromptOptimizer:
    """Optimize prompts."""
    def __init__(self):
        self.history: List[Tuple[str, float]] = []

    def evaluate(self, prompt: str, expected: str, actual: str) -> float:
        # Simple exact match
        score = 1.0 if expected.strip().lower() == actual.strip().lower() else 0.0
        self.history.append((prompt, score))
        return score

    def suggest_improvements(self, prompt: str) -> List[str]:
        suggestions = []
        if len(prompt) < 50:
            suggestions.append('Add more context to the prompt')
        if 'step by step' not in prompt.lower():
            suggestions.append('Add "step by step" for better reasoning')
        if not any(word in prompt.lower() for word in ['please', 'provide', 'give']):
            suggestions.append('Use action verbs like "provide" or "give"')
        return suggestions


class PromptEngineer:
    """Complete prompt engineering system."""
    def __init__(self):
        self.templates = TemplateManager()
        self.few_shot = FewShotBuilder()
        self.optimizer = PromptOptimizer()

    def create_prompt(
        self,
        task: str,
        query: str,
        strategy: PromptStrategy = PromptStrategy.ZERO_SHOT,
        examples: Optional[List[Example]] = None,
        **kwargs
    ) -> str:
        if strategy == PromptStrategy.ZERO_SHOT:
            return self.templates.render(task, query=query, **kwargs)
        
        elif strategy == PromptStrategy.FEW_SHOT:
            if examples:
                for ex in examples:
                    self.few_shot.add_example(ex)
            return self.few_shot.build(query)
        
        elif strategy == PromptStrategy.CHAIN_OF_THOUGHT:
            base = self.templates.render(task, query=query, **kwargs)
            return base + "\nLet's think step by step:"
        
        return query

    def optimize(self, prompt: str, feedback: str) -> str:
        suggestions = self.optimizer.suggest_improvements(prompt)
        # Apply first suggestion if available
        if suggestions and 'step by step' in suggestions[0]:
            return prompt + "\nLet's think step by step."
        return prompt

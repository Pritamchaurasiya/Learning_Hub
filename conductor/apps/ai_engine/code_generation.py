"""
Code Generation

Program synthesis capabilities:
1. AST parsing.
2. Code completion.
3. Test generation.
"""

import logging
import random
import re
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class Language(Enum):
    PYTHON = "python"
    JAVASCRIPT = "javascript"
    SQL = "sql"


@dataclass
class ASTNode:
    type: str
    name: Optional[str]
    children: List['ASTNode']
    value: Optional[str] = None
    line: int = 0


@dataclass
class GeneratedCode:
    code: str
    language: Language
    confidence: float
    explanation: str


class ASTParser:
    """Parse code into AST."""
    def __init__(self):
        self.function_pattern = re.compile(
            r'def\s+(\w+)\s*\((.*?)\)\s*(?:->\s*(\w+))?\s*:'
        )
        self.class_pattern = re.compile(r'class\s+(\w+)\s*(?:\((.*?)\))?\s*:')
        self.import_pattern = re.compile(r'(?:from\s+(\w+)\s+)?import\s+(.+)')
        self.assignment_pattern = re.compile(r'(\w+)\s*=\s*(.+)')

    def parse(self, code: str, language: Language = Language.PYTHON) -> ASTNode:
        """Parse code into AST."""
        if language != Language.PYTHON:
            # Simplified handling for other languages
            return ASTNode(type='module', name=None, children=[], value=code)
        
        root = ASTNode(type='module', name=None, children=[])
        lines = code.split('\n')
        
        for i, line in enumerate(lines):
            stripped = line.strip()
            
            # Check for function definition
            func_match = self.function_pattern.match(stripped)
            if func_match:
                node = ASTNode(
                    type='function',
                    name=func_match.group(1),
                    children=[],
                    value=func_match.group(2),  # parameters
                    line=i
                )
                root.children.append(node)
                continue
            
            # Check for class definition
            class_match = self.class_pattern.match(stripped)
            if class_match:
                node = ASTNode(
                    type='class',
                    name=class_match.group(1),
                    children=[],
                    value=class_match.group(2),  # parent classes
                    line=i
                )
                root.children.append(node)
                continue
            
            # Check for imports
            import_match = self.import_pattern.match(stripped)
            if import_match:
                node = ASTNode(
                    type='import',
                    name=import_match.group(2),
                    children=[],
                    value=import_match.group(1),  # from module
                    line=i
                )
                root.children.append(node)
        
        return root

    def find_functions(self, ast: ASTNode) -> List[ASTNode]:
        """Find all function nodes."""
        functions = []
        for child in ast.children:
            if child.type == 'function':
                functions.append(child)
        return functions


class CodeCompleter:
    """Complete partial code."""
    def __init__(self):
        self.completion_templates = {
            'function': [
                '    """Docstring for {name}."""\n    pass',
                '    # TODO: Implement {name}\n    raise NotImplementedError()',
                '    return None'
            ],
            'class': [
                '    """Class {name}."""\n\n    def __init__(self):\n        pass',
                '    pass'
            ],
            'loop': [
                'for i in range(10):\n    pass',
                'while True:\n    break'
            ],
            'conditional': [
                'if condition:\n    pass\nelse:\n    pass',
                'if x is not None:\n    pass'
            ]
        }

    def complete_function(self, function_signature: str) -> str:
        """Complete a function given its signature."""
        # Parse signature
        match = re.match(r'def\s+(\w+)\s*\((.*?)\)', function_signature)
        if not match:
            return function_signature + '\n    pass'
        
        name = match.group(1)
        params = match.group(2)
        
        # Generate docstring
        doc = f'    """'
        if params:
            doc += f'\n    Args:\n'
            for param in params.split(','):
                param = param.strip().split(':')[0].split('=')[0].strip()
                if param and param != 'self':
                    doc += f'        {param}: Description\n'
        doc += f'    """\n'
        
        # Generate body
        body = '    pass'
        
        return f'{function_signature}\n{doc}{body}'

    def suggest_completions(self, code: str, cursor_position: int) -> List[str]:
        """Suggest completions at cursor position."""
        # Get context before cursor
        context = code[:cursor_position]
        lines = context.split('\n')
        current_line = lines[-1] if lines else ''
        
        suggestions = []
        
        # Suggest based on context
        if current_line.strip().startswith('def '):
            suggestions.extend(self.completion_templates['function'])
        elif current_line.strip().startswith('class '):
            suggestions.extend(self.completion_templates['class'])
        elif current_line.strip().startswith('for ') or current_line.strip().startswith('while '):
            suggestions.extend(self.completion_templates['loop'])
        elif current_line.strip().startswith('if '):
            suggestions.extend(self.completion_templates['conditional'])
        else:
            # Generic suggestions
            suggestions = [
                'print()',
                'return',
                'pass',
                'break',
                'continue'
            ]
        
        return suggestions


class TestGenerator:
    """Generate test cases for code."""
    def __init__(self):
        self.test_template = '''
def test_{name}():
    """Test for {name}."""
    # Arrange
    {arrange}
    
    # Act
    {act}
    
    # Assert
    {assertion}
'''

    def _generate_test_inputs(self, params: str) -> Dict[str, str]:
        """Generate test inputs for parameters."""
        inputs = {}
        
        if not params:
            return inputs
        
        for param in params.split(','):
            param = param.strip()
            name = param.split(':')[0].split('=')[0].strip()
            
            if name == 'self':
                continue
            
            # Guess type from name or annotation
            if 'int' in param or 'num' in name or 'count' in name:
                inputs[name] = '1'
            elif 'str' in param or 'name' in name or 'text' in name:
                inputs[name] = '"test"'
            elif 'list' in param or name.endswith('s'):
                inputs[name] = '[]'
            elif 'dict' in param:
                inputs[name] = '{}'
            elif 'bool' in param or name.startswith('is_') or name.startswith('has_'):
                inputs[name] = 'True'
            else:
                inputs[name] = 'None'
        
        return inputs

    def generate_for_function(self, function_node: ASTNode) -> str:
        """Generate test for a function."""
        name = function_node.name or 'unknown'
        params = function_node.value or ''
        
        # Generate test inputs
        inputs = self._generate_test_inputs(params)
        
        # Build arrange section
        arrange_lines = []
        for var, value in inputs.items():
            arrange_lines.append(f'{var} = {value}')
        arrange = '\n    '.join(arrange_lines) if arrange_lines else '# No setup needed'
        
        # Build act section
        args = ', '.join(f'{k}={k}' for k in inputs.keys())
        act = f'result = {name}({args})'
        
        # Build assert section
        assertion = 'assert result is not None  # TODO: Add proper assertion'
        
        return self.test_template.format(
            name=name,
            arrange=arrange,
            act=act,
            assertion=assertion
        )

    def generate_test_file(self, ast: ASTNode) -> str:
        """Generate test file for module."""
        tests = ['import pytest\n']
        
        for child in ast.children:
            if child.type == 'function' and not child.name.startswith('_'):
                test = self.generate_for_function(child)
                tests.append(test)
        
        return '\n'.join(tests)


class CodeGenerator:
    """Complete code generation system."""
    def __init__(self):
        self.parser = ASTParser()
        self.completer = CodeCompleter()
        self.test_gen = TestGenerator()

    def parse_and_analyze(self, code: str) -> Dict[str, Any]:
        """Parse code and return analysis."""
        ast = self.parser.parse(code)
        functions = self.parser.find_functions(ast)
        
        return {
            'ast': ast,
            'functions': [f.name for f in functions],
            'function_count': len(functions),
            'lines': len(code.split('\n'))
        }

    def complete(self, code: str, cursor: int) -> List[str]:
        """Get completions at cursor position."""
        return self.completer.suggest_completions(code, cursor)

    def generate_tests(self, code: str) -> str:
        """Generate tests for code."""
        ast = self.parser.parse(code)
        return self.test_gen.generate_test_file(ast)

    def complete_functions(self, code: str) -> str:
        """Complete all incomplete functions."""
        lines = code.split('\n')
        result_lines = []
        i = 0
        
        while i < len(lines):
            line = lines[i]
            
            # Check if this is an incomplete function
            if re.match(r'\s*def\s+\w+\s*\([^)]*\)\s*:\s*$', line):
                # Check if next line is empty or another def
                if i + 1 >= len(lines) or not lines[i + 1].strip():
                    # Complete it
                    completed = self.completer.complete_function(line.strip())
                    result_lines.extend(completed.split('\n'))
                    i += 1
                    continue
            
            result_lines.append(line)
            i += 1
        
        return '\n'.join(result_lines)

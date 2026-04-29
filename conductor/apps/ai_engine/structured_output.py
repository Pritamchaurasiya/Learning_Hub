"""
Structured Output

JSON generation with validation:
1. Schema validation.
2. Constrained decoding.
3. Type coercion.
"""

import logging
import random
import re
import json
from typing import List, Dict, Tuple, Optional, Any, Union
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class JSONType(Enum):
    STRING = "string"
    NUMBER = "number"
    INTEGER = "integer"
    BOOLEAN = "boolean"
    ARRAY = "array"
    OBJECT = "object"
    NULL = "null"


@dataclass
class SchemaProperty:
    name: str
    type: JSONType
    required: bool = False
    description: str = ""
    enum: Optional[List[Any]] = None
    default: Optional[Any] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    pattern: Optional[str] = None
    items: Optional['JSONSchema'] = None


@dataclass
class JSONSchema:
    type: JSONType
    properties: Dict[str, SchemaProperty] = None
    required: List[str] = None
    title: str = ""
    description: str = ""

    def __post_init__(self):
        if self.properties is None:
            self.properties = {}
        if self.required is None:
            self.required = []


class SchemaValidator:
    """Validate data against JSON schema."""
    def __init__(self):
        self.errors: List[str] = []

    def _validate_type(self, value: Any, expected: JSONType) -> bool:
        """Check if value matches expected type."""
        if expected == JSONType.STRING:
            return isinstance(value, str)
        elif expected == JSONType.NUMBER:
            return isinstance(value, (int, float))
        elif expected == JSONType.INTEGER:
            return isinstance(value, int)
        elif expected == JSONType.BOOLEAN:
            return isinstance(value, bool)
        elif expected == JSONType.ARRAY:
            return isinstance(value, list)
        elif expected == JSONType.OBJECT:
            return isinstance(value, dict)
        elif expected == JSONType.NULL:
            return value is None
        return False

    def _validate_property(self, value: Any, prop: SchemaProperty, path: str) -> bool:
        """Validate a property value."""
        valid = True
        
        # Type check
        if not self._validate_type(value, prop.type):
            self.errors.append(f"{path}: expected {prop.type.value}, got {type(value).__name__}")
            return False
        
        # Enum check
        if prop.enum and value not in prop.enum:
            self.errors.append(f"{path}: value must be one of {prop.enum}")
            valid = False
        
        # Number constraints
        if prop.type in [JSONType.NUMBER, JSONType.INTEGER]:
            if prop.min_value is not None and value < prop.min_value:
                self.errors.append(f"{path}: value must be >= {prop.min_value}")
                valid = False
            if prop.max_value is not None and value > prop.max_value:
                self.errors.append(f"{path}: value must be <= {prop.max_value}")
                valid = False
        
        # String constraints
        if prop.type == JSONType.STRING:
            if prop.min_length is not None and len(value) < prop.min_length:
                self.errors.append(f"{path}: length must be >= {prop.min_length}")
                valid = False
            if prop.max_length is not None and len(value) > prop.max_length:
                self.errors.append(f"{path}: length must be <= {prop.max_length}")
                valid = False
            if prop.pattern and not re.match(prop.pattern, value):
                self.errors.append(f"{path}: must match pattern {prop.pattern}")
                valid = False
        
        return valid

    def validate(self, data: Dict, schema: JSONSchema) -> Tuple[bool, List[str]]:
        """Validate data against schema."""
        self.errors = []
        
        if schema.type != JSONType.OBJECT:
            if not self._validate_type(data, schema.type):
                self.errors.append(f"Root: expected {schema.type.value}")
                return False, self.errors
            return True, []
        
        if not isinstance(data, dict):
            self.errors.append("Root: expected object")
            return False, self.errors
        
        # Check required fields
        for req in schema.required:
            if req not in data:
                self.errors.append(f"Missing required field: {req}")
        
        # Validate each property
        for name, prop in schema.properties.items():
            if name in data:
                self._validate_property(data[name], prop, name)
            elif prop.required:
                self.errors.append(f"Missing required field: {name}")
        
        return len(self.errors) == 0, self.errors


class TypeCoercer:
    """Coerce values to expected types."""
    def coerce(self, value: Any, target: JSONType) -> Any:
        """Coerce value to target type."""
        if target == JSONType.STRING:
            return str(value)
        elif target == JSONType.NUMBER:
            try:
                return float(value)
            except (ValueError, TypeError):
                return 0.0
        elif target == JSONType.INTEGER:
            try:
                return int(float(value))
            except (ValueError, TypeError):
                return 0
        elif target == JSONType.BOOLEAN:
            if isinstance(value, str):
                return value.lower() in ('true', 'yes', '1')
            return bool(value)
        elif target == JSONType.ARRAY:
            if isinstance(value, list):
                return value
            if isinstance(value, str):
                try:
                    parsed = json.loads(value)
                    if isinstance(parsed, list):
                        return parsed
                except json.JSONDecodeError:
                    pass
            return [value]
        elif target == JSONType.OBJECT:
            if isinstance(value, dict):
                return value
            if isinstance(value, str):
                try:
                    parsed = json.loads(value)
                    if isinstance(parsed, dict):
                        return parsed
                except json.JSONDecodeError:
                    pass
            return {'value': value}
        elif target == JSONType.NULL:
            return None
        return value


class ConstrainedDecoder:
    """Generate text with structural constraints."""
    def __init__(self):
        self.type_coercer = TypeCoercer()

    def _generate_value(self, prop: SchemaProperty) -> Any:
        """Generate a valid value for property."""
        if prop.enum:
            return random.choice(prop.enum)
        
        if prop.default is not None:
            return prop.default
        
        if prop.type == JSONType.STRING:
            length = prop.min_length or 10
            if prop.max_length:
                length = min(length, prop.max_length)
            return ''.join(random.choices('abcdefghij', k=length))
        
        elif prop.type == JSONType.INTEGER:
            min_v = int(prop.min_value or 0)
            max_v = int(prop.max_value or 100)
            return random.randint(min_v, max_v)
        
        elif prop.type == JSONType.NUMBER:
            min_v = prop.min_value or 0.0
            max_v = prop.max_value or 100.0
            return random.uniform(min_v, max_v)
        
        elif prop.type == JSONType.BOOLEAN:
            return random.choice([True, False])
        
        elif prop.type == JSONType.ARRAY:
            return []
        
        elif prop.type == JSONType.OBJECT:
            return {}
        
        return None

    def generate(self, schema: JSONSchema) -> Dict:
        """Generate JSON conforming to schema."""
        result = {}
        
        for name, prop in schema.properties.items():
            result[name] = self._generate_value(prop)
        
        return result

    def constrain_output(
        self, 
        raw_output: str, 
        schema: JSONSchema
    ) -> Dict:
        """Parse and constrain raw output to schema."""
        # Try to extract JSON
        try:
            # Find JSON in text
            match = re.search(r'\{[^{}]*\}', raw_output, re.DOTALL)
            if match:
                data = json.loads(match.group())
            else:
                data = json.loads(raw_output)
        except json.JSONDecodeError:
            # Generate from schema
            data = self.generate(schema)
        
        # Coerce types
        result = {}
        for name, prop in schema.properties.items():
            if name in data:
                result[name] = self.type_coercer.coerce(data[name], prop.type)
            elif prop.required or prop.default is not None:
                result[name] = prop.default if prop.default is not None else self._generate_value(prop)
        
        return result


class StructuredOutputGenerator:
    """Complete structured output system."""
    def __init__(self):
        self.validator = SchemaValidator()
        self.decoder = ConstrainedDecoder()
        self.coercer = TypeCoercer()

    def create_schema(self, spec: Dict) -> JSONSchema:
        """Create schema from specification."""
        properties = {}
        required = spec.get('required', [])
        
        for name, prop_spec in spec.get('properties', {}).items():
            prop_type = JSONType(prop_spec.get('type', 'string'))
            
            properties[name] = SchemaProperty(
                name=name,
                type=prop_type,
                required=name in required,
                description=prop_spec.get('description', ''),
                enum=prop_spec.get('enum'),
                default=prop_spec.get('default'),
                min_value=prop_spec.get('minimum'),
                max_value=prop_spec.get('maximum'),
                min_length=prop_spec.get('minLength'),
                max_length=prop_spec.get('maxLength'),
                pattern=prop_spec.get('pattern')
            )
        
        return JSONSchema(
            type=JSONType.OBJECT,
            properties=properties,
            required=required,
            title=spec.get('title', ''),
            description=spec.get('description', '')
        )

    def generate(self, schema: JSONSchema) -> Dict:
        """Generate structured output."""
        return self.decoder.generate(schema)

    def parse(self, text: str, schema: JSONSchema) -> Tuple[Dict, bool, List[str]]:
        """Parse text to structured output."""
        data = self.decoder.constrain_output(text, schema)
        is_valid, errors = self.validator.validate(data, schema)
        return data, is_valid, errors

    def validate(self, data: Dict, schema: JSONSchema) -> Tuple[bool, List[str]]:
        """Validate data against schema."""
        return self.validator.validate(data, schema)

"""
AI Guardrails

Safety and moderation:
1. Input validation.
2. Output filtering.
3. Policy enforcement.
"""

import logging
import random
import re
from typing import List, Dict, Tuple, Optional, Any, Set
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class RiskLevel(Enum):
    SAFE = "safe"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ViolationType(Enum):
    HARMFUL = "harmful"
    HATE_SPEECH = "hate_speech"
    VIOLENCE = "violence"
    SEXUAL = "sexual"
    PII = "pii"
    JAILBREAK = "jailbreak"
    INJECTION = "injection"


@dataclass
class GuardrailResult:
    is_safe: bool
    risk_level: RiskLevel
    violations: List[ViolationType]
    score: float
    details: Dict[str, Any]


class InputValidator:
    """Validate and sanitize input."""
    def __init__(self):
        self.max_length = 100000
        self.blocked_patterns = [
            # Standard prompt injections
            r'ignore\s+(previous|all)\s+instructions',
            r'pretend\s+you\s+are',
            r'you\s+are\s+now\s+in',
            r'roleplay\s+as',
            r'act\s+as\s+if\s+you',
            # DAN and jailbreak attempts
            r'do\s+anything\s+now',
            r'\bdan\s+mode\b',
            r'developer\s+mode',
            r'unrestricted\s+mode',
            r'jailbreak',
            r'bypass\s+(filters?|safety|restrictions?)',
            # Instruction override attempts  
            r'disregard\s+(previous|above|your)',
            r'forget\s+(everything|all|previous)',
            r'new\s+instructions?:',
            r'system\s+prompt:',
            # XSS/Injection
            r'<script>',
            r'javascript:',
            r'data:text/html',
            r'on\w+=',  # onclick, onerror, etc.
        ]

    def validate(self, text: str) -> Tuple[bool, List[str]]:
        """Validate input text."""
        issues = []
        
        # Length check
        if len(text) > self.max_length:
            issues.append(f"Input exceeds max length ({self.max_length})")
        
        # Empty check
        if not text or not text.strip():
            issues.append("Input is empty")
            return True, issues  # Empty is safe but noted
        
        # Pattern matching
        text_lower = text.lower()
        for pattern in self.blocked_patterns:
            if re.search(pattern, text_lower):
                issues.append(f"Blocked pattern detected: {pattern[:20]}...")
        
        return len(issues) == 0 or all('length' in i or 'empty' in i for i in issues), issues

    def sanitize(self, text: str) -> str:
        """Sanitize input text."""
        import unicodedata
        
        # Unicode normalization (prevents bypass via homoglyphs)
        text = unicodedata.normalize("NFKC", text)
        
        # Remove control characters
        sanitized = ''.join(c for c in text if c.isprintable() or c in '\n\t')
        
        # Truncate if needed
        if len(sanitized) > self.max_length:
            sanitized = sanitized[:self.max_length]
        
        return sanitized


class ContentClassifier:
    """Classify content for safety issues."""
    def __init__(self):
        self.harmful_keywords = {
            'violence': ['kill', 'murder', 'attack', 'weapon', 'bomb', 'hurt'],
            'hate': ['racist', 'bigot', 'slur', 'discriminate'],
            'sexual': ['explicit', 'nude', 'nsfw'],
            'dangerous': ['hack', 'exploit', 'bypass']
        }

    def classify(self, text: str) -> Dict[str, float]:
        """Classify text for harmful content."""
        text_lower = text.lower()
        scores = {}
        
        for category, keywords in self.harmful_keywords.items():
            count = sum(1 for kw in keywords if kw in text_lower)
            scores[category] = min(1.0, count * 0.3)
        
        return scores


class PIIDetector:
    """Detect personally identifiable information."""
    def __init__(self):
        self.patterns = {
            'email': r'\b[\w.-]+@[\w.-]+\.\w+\b',
            'phone': r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',
            'ssn': r'\b\d{3}-\d{2}-\d{4}\b',
            'credit_card': r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',
            'ip_address': r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b',
            # Additional patterns
            'passport': r'\b[A-Z]{1,2}\d{6,9}\b',  # Common passport formats
            'date_of_birth': r'\b(0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])[-/](19|20)\d{2}\b',
            'indian_aadhaar': r'\b\d{4}\s?\d{4}\s?\d{4}\b',  # Indian Aadhaar
            'pan_card': r'\b[A-Z]{5}\d{4}[A-Z]\b',  # Indian PAN
        }

    def detect(self, text: str) -> Dict[str, List[str]]:
        """Detect PII in text."""
        found = {}
        
        for pii_type, pattern in self.patterns.items():
            matches = re.findall(pattern, text)
            if matches:
                found[pii_type] = matches
        
        return found

    def redact(self, text: str) -> str:
        """Redact PII from text."""
        redacted = text
        
        for pii_type, pattern in self.patterns.items():
            if pii_type == 'email':
                redacted = re.sub(pattern, '[EMAIL]', redacted)
            elif pii_type == 'phone':
                redacted = re.sub(pattern, '[PHONE]', redacted)
            elif pii_type == 'ssn':
                redacted = re.sub(pattern, '[SSN]', redacted)
            elif pii_type == 'credit_card':
                redacted = re.sub(pattern, '[CARD]', redacted)
            elif pii_type == 'ip_address':
                redacted = re.sub(pattern, '[IP]', redacted)
        
        return redacted


class OutputFilter:
    """Filter model outputs."""
    def __init__(self):
        self.classifier = ContentClassifier()
        self.pii_detector = PIIDetector()
        self.blacklist: Set[str] = set()

    def add_to_blacklist(self, terms: List[str]):
        """Add terms to blacklist."""
        self.blacklist.update(t.lower() for t in terms)

    def filter(self, output: str) -> Tuple[str, List[str]]:
        """Filter output for safety."""
        issues = []
        filtered = output
        
        # Check content classification
        scores = self.classifier.classify(output)
        high_risk = [cat for cat, score in scores.items() if score > 0.5]
        if high_risk:
            issues.append(f"High risk content: {', '.join(high_risk)}")
        
        # Blacklist check
        output_lower = output.lower()
        for term in self.blacklist:
            if term in output_lower:
                issues.append(f"Blacklisted term found")
                filtered = output_lower.replace(term, '[FILTERED]')
        
        # PII redaction
        pii_found = self.pii_detector.detect(output)
        if pii_found:
            issues.append(f"PII detected: {list(pii_found.keys())}")
            filtered = self.pii_detector.redact(filtered)
        
        return filtered, issues


class PolicyEnforcer:
    """Enforce content policies."""
    def __init__(self):
        self.policies: List[Dict[str, Any]] = []
        self.default_thresholds = {
            RiskLevel.LOW: 0.2,
            RiskLevel.MEDIUM: 0.4,
            RiskLevel.HIGH: 0.6,
            RiskLevel.CRITICAL: 0.8
        }

    def add_policy(self, name: str, rules: Dict[str, Any]):
        """Add a content policy."""
        self.policies.append({'name': name, **rules})

    def evaluate(self, content: str, scores: Dict[str, float]) -> RiskLevel:
        """Evaluate risk level based on scores."""
        max_score = max(scores.values()) if scores else 0
        
        if max_score >= self.default_thresholds[RiskLevel.CRITICAL]:
            return RiskLevel.CRITICAL
        elif max_score >= self.default_thresholds[RiskLevel.HIGH]:
            return RiskLevel.HIGH
        elif max_score >= self.default_thresholds[RiskLevel.MEDIUM]:
            return RiskLevel.MEDIUM
        elif max_score >= self.default_thresholds[RiskLevel.LOW]:
            return RiskLevel.LOW
        return RiskLevel.SAFE


class AIGuardrails:
    """Complete guardrails system."""
    def __init__(self):
        self.input_validator = InputValidator()
        self.classifier = ContentClassifier()
        self.output_filter = OutputFilter()
        self.pii_detector = PIIDetector()
        self.policy_enforcer = PolicyEnforcer()

    def check_input(self, text: str) -> GuardrailResult:
        """Check input for safety."""
        # Validate
        is_valid, validation_issues = self.input_validator.validate(text)
        
        # Classify
        scores = self.classifier.classify(text)
        
        # Check PII
        pii_found = self.pii_detector.detect(text)
        
        # Determine violations
        violations = []
        if not is_valid:
            violations.append(ViolationType.INJECTION)
        if pii_found:
            violations.append(ViolationType.PII)
        if scores.get('violence', 0) > 0.5:
            violations.append(ViolationType.VIOLENCE)
        if scores.get('hate', 0) > 0.5:
            violations.append(ViolationType.HATE_SPEECH)
        
        # Determine risk level
        risk_level = self.policy_enforcer.evaluate(text, scores)
        
        is_safe = len(violations) == 0 and risk_level in [RiskLevel.SAFE, RiskLevel.LOW]
        
        return GuardrailResult(
            is_safe=is_safe,
            risk_level=risk_level,
            violations=violations,
            score=max(scores.values()) if scores else 0,
            details={'validation': validation_issues, 'scores': scores, 'pii': pii_found}
        )

    def check_output(self, text: str) -> GuardrailResult:
        """Check output for safety."""
        # Filter
        filtered, issues = self.output_filter.filter(text)
        
        # Classify
        scores = self.classifier.classify(text)
        
        # Determine violations
        violations = []
        if scores.get('violence', 0) > 0.3:
            violations.append(ViolationType.VIOLENCE)
        if scores.get('sexual', 0) > 0.3:
            violations.append(ViolationType.SEXUAL)
        
        risk_level = self.policy_enforcer.evaluate(text, scores)
        is_safe = len(violations) == 0
        
        return GuardrailResult(
            is_safe=is_safe,
            risk_level=risk_level,
            violations=violations,
            score=max(scores.values()) if scores else 0,
            details={'issues': issues, 'scores': scores, 'filtered': filtered != text}
        )

    def process(
        self, 
        input_text: str, 
        output_text: Optional[str] = None
    ) -> Dict[str, GuardrailResult]:
        """Process input and optionally output."""
        results = {
            'input': self.check_input(input_text)
        }
        
        if output_text:
            results['output'] = self.check_output(output_text)
        
        return results


# =============================================================================
# PHASE 5: USER GUARDRAILS MANAGER FOR PRODUCTION
# =============================================================================

class UserGuardrailsManager:
    """
    Production guardrails manager with user-specific settings.
    Provides API-friendly methods for content safety.
    """
    
    def __init__(self, user=None):
        """
        Initialize with optional user context.
        
        Args:
            user: Django User object (optional)
        """
        self.user = user
        self.guardrails = AIGuardrails()
        self.check_history = []
        
        # User-specific settings
        self.strict_mode = False
        self.pii_auto_redact = True
    
    def check_content(self, content: str, content_type: str = "input") -> Dict:
        """
        Check content for safety violations.
        
        Args:
            content: Text content to check
            content_type: "input" or "output"
        
        Returns:
            Safety assessment result
        """
        if content_type == "output":
            result = self.guardrails.check_output(content)
        else:
            result = self.guardrails.check_input(content)
        
        # Build response
        assessment = {
            "is_safe": result.is_safe,
            "risk_level": result.risk_level.value,
            "risk_score": round(result.score, 2),
            "violations": [v.value for v in result.violations],
            "details": {
                "scores": result.details.get('scores', {}),
                "pii_detected": bool(result.details.get('pii', {}))
            },
            "recommendation": self._get_recommendation(result)
        }
        
        # Track history
        self.check_history.append({
            "content_type": content_type,
            "is_safe": result.is_safe,
            "risk_level": result.risk_level.value
        })
        
        return assessment
    
    def _get_recommendation(self, result: GuardrailResult) -> str:
        """Get recommendation based on result."""
        if result.is_safe:
            return "Content is safe to use"
        
        if result.risk_level == RiskLevel.CRITICAL:
            return "Content should be blocked - critical safety violations"
        elif result.risk_level == RiskLevel.HIGH:
            return "Content requires review before use"
        elif ViolationType.PII in result.violations:
            return "Content contains PII - redaction recommended"
        else:
            return "Content may need modification before use"
    
    def redact_pii(self, content: str) -> Dict:
        """
        Redact PII from content.
        
        Args:
            content: Text content to redact
        
        Returns:
            Redaction result with details
        """
        # Detect PII first
        pii_found = self.guardrails.pii_detector.detect(content)
        
        # Redact
        redacted_content = self.guardrails.pii_detector.redact(content)
        
        # Build report
        pii_types = list(pii_found.keys()) if pii_found else []
        total_redactions = sum(len(v) for v in pii_found.values())
        
        return {
            "original_length": len(content),
            "redacted_content": redacted_content,
            "pii_types_found": pii_types,
            "total_redactions": total_redactions,
            "was_modified": content != redacted_content,
            "privacy_safe": total_redactions == 0
        }
    
    def get_risk_assessment(self, content: str) -> Dict:
        """
        Get comprehensive risk assessment.
        
        Args:
            content: Content to assess
        
        Returns:
            Full risk assessment
        """
        # Run full guardrails check
        input_result = self.guardrails.check_input(content)
        
        # Get classification scores
        scores = self.guardrails.classifier.classify(content)
        
        # Detect PII
        pii = self.guardrails.pii_detector.detect(content)
        
        return {
            "overall_risk": input_result.risk_level.value,
            "risk_score": round(input_result.score, 2),
            "category_scores": {k: round(v, 2) for k, v in scores.items()},
            "pii_analysis": {
                "has_pii": bool(pii),
                "pii_types": list(pii.keys()) if pii else [],
                "pii_count": sum(len(v) for v in pii.values())
            },
            "violations": [v.value for v in input_result.violations],
            "is_safe": input_result.is_safe,
            "needs_review": input_result.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]
        }
    
    def get_guardrails_stats(self) -> Dict:
        """Get guardrails usage statistics."""
        if not self.check_history:
            return {
                "total_checks": 0,
                "safe_count": 0,
                "unsafe_count": 0,
                "safety_rate": 0.0
            }
        
        safe_count = sum(1 for c in self.check_history if c['is_safe'])
        
        risk_distribution = {}
        for check in self.check_history:
            level = check['risk_level']
            risk_distribution[level] = risk_distribution.get(level, 0) + 1
        
        return {
            "total_checks": len(self.check_history),
            "safe_count": safe_count,
            "unsafe_count": len(self.check_history) - safe_count,
            "safety_rate": round(safe_count / len(self.check_history), 2),
            "risk_distribution": risk_distribution
        }


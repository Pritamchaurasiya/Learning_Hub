"""
Assessment Telemetry and Anti-Cheat Integrity Engine for LearningHub.
Computes real-time risk scores, tracks behavioral violations (tab switch, window blur,
DevTools, copy/paste, fullscreen exit), and generates cryptographic audit proofs.
"""
import hashlib
import hmac
import json
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


class AssessmentIntegrityEngine:
    VIOLATION_WEIGHTS = {
        'DEV_TOOLS': 35.0,
        'MULTIPLE_FACES': 25.0,
        'NO_FACE': 20.0,
        'COPY_PASTE': 15.0,
        'FULLSCREEN_EXIT': 10.0,
        'TAB_SWITCH': 10.0,
        'WINDOW_BLUR': 5.0,
        'CONTEXT_MENU': 5.0,
    }

    VIOLATION_CAPS = {
        'COPY_PASTE': 30.0,
        'TAB_SWITCH': 40.0,
        'WINDOW_BLUR': 20.0,
        'FULLSCREEN_EXIT': 20.0,
        'CONTEXT_MENU': 15.0,
    }

    @classmethod
    def evaluate_violations(cls, violations: list, attempt_id: str = '') -> dict:
        """
        Calculates an integrity score (0-100) and risk level based on recorded violations.
        """
        if not isinstance(violations, list):
            violations = []

        total_violations = len(violations)
        violation_counts = {}
        deductions_per_type = {}

        for event in violations:
            if not isinstance(event, dict):
                continue
            v_type = str(event.get('type', 'UNKNOWN')).upper()
            violation_counts[v_type] = violation_counts.get(v_type, 0) + 1
            weight = cls.VIOLATION_WEIGHTS.get(v_type, 5.0)
            deductions_per_type[v_type] = deductions_per_type.get(v_type, 0.0) + weight

        # Apply caps per violation category
        total_deduction = 0.0
        for v_type, raw_deduction in deductions_per_type.items():
            cap = cls.VIOLATION_CAPS.get(v_type, 50.0)
            total_deduction += min(raw_deduction, cap)

        integrity_score = max(0.0, min(100.0, round(100.0 - total_deduction, 1)))

        if integrity_score >= 90.0:
            risk_level = 'EXCELLENT'
        elif integrity_score >= 75.0:
            risk_level = 'LOW_RISK'
        elif integrity_score >= 50.0:
            risk_level = 'MODERATE_RISK'
        else:
            risk_level = 'HIGH_RISK'

        # Flag for manual proctor review if high risk or dev tools opened
        flagged_for_review = risk_level == 'HIGH_RISK' or violation_counts.get('DEV_TOOLS', 0) > 0

        # Cryptographic audit hash
        secret = getattr(settings, 'SECRET_KEY', 'anti-cheat-secret').encode('utf-8')
        event_payload = json.dumps(
            {'attempt_id': attempt_id, 'counts': violation_counts, 'score': integrity_score},
            sort_keys=True
        )
        audit_hash = hmac.new(secret, event_payload.encode('utf-8'), hashlib.sha256).hexdigest()

        return {
            'integrity_score': integrity_score,
            'risk_level': risk_level,
            'total_violations': total_violations,
            'violation_counts': violation_counts,
            'flagged_for_review': flagged_for_review,
            'audit_hash': f"lh-proof-{audit_hash[:16]}",
            'events_logged': min(total_violations, 100),
        }

"""
Pytest configuration and compatibility fixtures for LearningHub Django backend.
"""

import pytest
import django.template.context

# Python 3.14 compatibility patch for Django BaseContext.__copy__
def _patched_base_context_copy(self):
    duplicate = object.__new__(self.__class__)
    duplicate.__dict__.update(self.__dict__)
    duplicate.dicts = self.dicts[:]
    return duplicate

try:
    django.template.context.BaseContext.__copy__ = _patched_base_context_copy
except Exception:
    pass

import pytest

def test_import_ai_client():
    try:
        from apps.ai_engine import ai_client
        assert True
    except Exception as e:
        pytest.fail(f"Import failed: {e}")

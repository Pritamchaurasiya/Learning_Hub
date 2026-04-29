"""
Tests for Agentic Action Service (Tool Registry).
"""
import pytest
from unittest.mock import MagicMock, patch
from apps.ai_engine.action_service import ActionService, ToolRegistry
from apps.users.models import User

@pytest.fixture
def mock_user():
    user = MagicMock(spec=User)
    user.username = "test_agent_user"
    user.is_staff = True
    return user

@patch('apps.ai_engine.action_service.AIClient.generate_text')
def test_agent_search_intent(mock_generate, mock_user):
    # Mock AI response to select SEARCH_COURSE tool
    mock_generate.return_value = '{"tool": "SEARCH_COURSE", "params": {"query": "python"}, "confidence": 0.9}'
    
    # Mock Tool Execution
    # Since we can't easily mock the tool_search_course because it's decorated/registered at import time,
    # we can trust the Registry or mock the specific tool func in the registry.
    
    # However, for integration test, let's mock the internal tool function logic or the DB access
    with patch('apps.ai_engine.action_service.Course.objects.filter') as mock_filter:
        mock_filter.return_value = []
        result = ActionService._execute_command_sync(mock_user, "Find python courses")
        
        assert result['status'] == 'success'
        assert result['status'] == 'success'
        assert mock_generate.called

@patch('apps.ai_engine.action_service.AIClient.generate_text')
def test_agent_unknown_intent(mock_generate, mock_user):
    mock_generate.return_value = '{"tool": "UNKNOWN", "confidence": 0.2}'
    
    result = ActionService._execute_command_sync(mock_user, "Do something weird")
    assert result['status'] == 'error'
    assert 'Tool not found' in result['message']

def test_registry_schema():
    schema = ToolRegistry.get_schema()
    assert "SEARCH_COURSE" in schema
    assert "ENROLL_COURSE" in schema

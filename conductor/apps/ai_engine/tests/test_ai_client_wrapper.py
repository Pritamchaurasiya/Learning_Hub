from django.test import TestCase
from unittest.mock import Mock, patch, MagicMock
from apps.ai_engine.ai_client import AIClient


class TestAIClient(TestCase):
    """Tests for the AIClient wrapper using google-genai."""

    def setUp(self):
        # Clear client before each test
        AIClient._client = None

    @patch('apps.ai_engine.ai_client.genai.Client')
    @patch('apps.ai_engine.ai_client.os.getenv')
    def test_get_client_initialization_success(self, mock_getenv, mock_client_cls):
        """Test client initializes correctly with API key."""
        mock_getenv.return_value = 'fake-api-key'

        client = AIClient.get_client()

        self.assertIsNotNone(client)
        mock_client_cls.assert_called_once_with(api_key='fake-api-key')
        self.assertEqual(AIClient._client, client)

    @patch('apps.ai_engine.ai_client.os.getenv')
    def test_get_client_no_api_key(self, mock_getenv):
        """Test client returns None if no API key is set."""
        mock_getenv.return_value = None

        client = AIClient.get_client()

        self.assertIsNone(client)

    @patch('django.core.cache.cache')
    @patch('apps.ai_engine.ai_client.genai.Client')
    @patch('apps.ai_engine.ai_client.os.getenv')
    def test_generate_code_review_success(self, mock_getenv, mock_client_cls, mock_cache):
        """Test code review generation with valid response."""
        mock_getenv.return_value = 'fake-api-key'
        mock_cache.get.return_value = None  # Cache miss

        # Setup mock client and response
        mock_client_instance = mock_client_cls.return_value
        mock_response = Mock()
        mock_response.text = '{"feedback": "Good job", "complexity": {"time": "O(N)", "space": "O(1)"}, "suggestions": []}'
        mock_client_instance.models.generate_content.return_value = mock_response

        result = AIClient.generate_code_review(
            "Two Sum",
            "Find indices...",
            "def two_sum(): pass"
        )

        self.assertIsNotNone(result)
        assert result is not None  # Hint for MyPy
        # Under the Multi-Agent LLM Chain architecture, it generates:
        # 1) Draft, 2) Critique, 3) Final Revision
        self.assertEqual(mock_client_instance.models.generate_content.call_count, 3)
        args, kwargs = mock_client_instance.models.generate_content.call_args
        self.assertEqual(kwargs['model'], 'gemini-2.0-flash')

    @patch('django.core.cache.cache')
    @patch('apps.ai_engine.ai_client.genai.Client')
    @patch('apps.ai_engine.ai_client.os.getenv')
    def test_generate_code_review_api_error(self, mock_getenv, mock_client_cls, mock_cache):
        """Test graceful handling of API errors."""
        mock_getenv.return_value = 'fake-api-key'
        mock_cache.get.return_value = None

        mock_client_instance = mock_client_cls.return_value
        mock_client_instance.models.generate_content.side_effect = Exception("API Error")

        result = AIClient.generate_code_review("Problem", "Desc", "Code")

        self.assertIsNone(result)

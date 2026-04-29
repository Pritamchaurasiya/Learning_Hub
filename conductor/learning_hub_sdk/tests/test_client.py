"""
Tests for Learning Hub SDK Client
"""

import pytest
from unittest.mock import Mock, patch
from learning_hub_sdk import LearningHubClient
from learning_hub_sdk.exceptions import AuthenticationError, APIError

class TestLearningHubClient:
    """Test cases for LearningHubClient."""
    
    def setup_method(self):
        """Setup test client."""
        self.base_url = "https://api.learninghub.com"
        self.api_key = "test-api-key"
        
    @patch('learning_hub_sdk.client.Auth')
    def test_init_with_api_key(self, mock_auth):
        """Test client initialization with API key."""
        client = LearningHubClient(self.base_url, api_key=self.api_key)
        
        assert client.base_url == self.base_url
        assert client.timeout == 30
        mock_auth.assert_called_once_with(self.base_url, self.api_key, None, None)
    
    @patch('learning_hub_sdk.client.Auth')
    def test_init_with_credentials(self, mock_auth):
        """Test client initialization with credentials."""
        client = LearningHubClient(
            self.base_url, 
            username="testuser", 
            password="testpass"
        )
        
        mock_auth.assert_called_once_with(
            self.base_url, None, "testuser", "testpass"
        )
    
    @patch('learning_hub_sdk.client.requests.request')
    @patch('learning_hub_sdk.client.Auth')
    def test_health_check(self, mock_auth, mock_request):
        """Test health check."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "ok"}
        mock_request.return_value = mock_response
        
        client = LearningHubClient(self.base_url, api_key=self.api_key)
        result = client.health_check()
        
        assert result == {"status": "ok"}
        mock_request.assert_called_once()
    
    @patch('learning_hub_sdk.client.requests.request')
    @patch('learning_hub_sdk.client.Auth')
    def test_authentication_error(self, mock_auth, mock_request):
        """Test authentication error handling."""
        mock_response = Mock()
        mock_response.status_code = 401
        mock_request.return_value = mock_response
        
        client = LearningHubClient(self.base_url, api_key=self.api_key)
        
        with pytest.raises(AuthenticationError):
            client.health_check()

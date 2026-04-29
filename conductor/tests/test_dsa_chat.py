
import os
import django
from django.conf import settings

# Force setting modules before other imports
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

import pytest
from unittest.mock import patch, MagicMock
from channels.testing import WebsocketCommunicator
from apps.dsa.ai_chat_consumer import AIChatConsumer
from apps.dsa.models import Submission, Problem
from django.contrib.auth import get_user_model
from django.test import override_settings
from asgiref.sync import sync_to_async

User = get_user_model()

@override_settings(CHANNEL_LAYERS={"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}})
@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_ai_chat_flow():
    # 1. Setup Data
    user = await sync_to_async(User.objects.create_user)(email='test@example.com', username='testchatuser', password='password')
    problem = await sync_to_async(Problem.objects.create)(
        title="Test Problem",
        slug="test-problem",
        difficulty="EASY",
        description="Solve 1+1"
    )
    submission = await sync_to_async(Submission.objects.create)(
        user=user,
        problem=problem,
        code="print(1+1)",
        status="PASSED",
        ai_feedback={"feedback": "Good job"}
    )

    # 2. Mock AIClient at the consumer's import path
    with patch("apps.dsa.ai_chat_consumer.AIClient") as MockAIClass:
        MockAIClass.generate_dsa_chat_response.return_value = "This is a mocked AI response."

        # 3. Connect to Consumer
        communicator = WebsocketCommunicator(
            AIChatConsumer.as_asgi(), 
            f"/ws/dsa/chat/{submission.id}/"
        )
        # Add scope (simulating URL route kwargs which usually happens in routing)
        communicator.scope['url_route'] = {
            'kwargs': {'submission_id': submission.id}
        }
        # Inject authenticated user into scope (simulating AuthMiddleware)
        communicator.scope['user'] = user
        
        connected, _ = await communicator.connect()
        assert connected

        # 4. Send Message
        await communicator.send_json_to({
            'message': 'How can I optimize this?'
        })

        # 5. Receive Response
        response = await communicator.receive_json_from()
        
        # 6. Verify
        assert response['type'] == 'ai_message'
        assert response['message'] == "This is a mocked AI response."
        
        # Verify AI called with correct context
        MockAIClass.generate_dsa_chat_response.assert_called_once()
        call_args = MockAIClass.generate_dsa_chat_response.call_args
        assert "Test Problem" in call_args.kwargs['context_prompt']
        assert "print(1+1)" in call_args.kwargs['context_prompt']
        assert "How can I optimize this?" in call_args.kwargs['user_question']

        await communicator.disconnect()

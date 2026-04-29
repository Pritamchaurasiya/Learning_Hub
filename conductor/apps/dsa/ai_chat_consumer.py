import json
from channels.generic.websocket import AsyncWebsocketConsumer
from .models import Submission
from apps.ai_engine.ai_client import AIClient
from channels.db import database_sync_to_async


class AIChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.submission_id = self.scope['url_route']['kwargs']['submission_id']
        self.room_group_name = f'chat_submission_{self.submission_id}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json['message']

        # 1. Fetch context
        submission_data = await self.get_submission_context(self.submission_id)
        if not submission_data:
            await self.send(text_data=json.dumps({
                'error': 'Submission not found or context unavailable.'
            }))
            return

        # 2. Call Gemini for contextual follow-up
        response_text = await self.get_ai_response(
            problem_title=submission_data['problem_title'],
            code=submission_data['code'],
            previous_feedback=submission_data['ai_feedback'],
            user_question=message
        )

        # 3. Send message to room group
        await self.send(text_data=json.dumps({
            'type': 'ai_message',
            'message': response_text
        }))

    @database_sync_to_async
    def get_submission_context(self, submission_id):
        try:
            submission = Submission.objects.select_related('problem').get(id=submission_id)
            # Security verification: Ensure request user owns the submission
            if submission.user != self.scope['user']:
                return None
            return {
                'problem_title': submission.problem.title,
                'code': submission.code,
                'ai_feedback': submission.ai_feedback
            }
        except Submission.DoesNotExist:
            return None

    async def get_ai_response(self, problem_title, code, previous_feedback, user_question):
        # Construct the context prompt
        context_prompt = f"""
You are a senior coding mentor helping a student with their solution for '{problem_title}'.

Student's Code:
{code}

Previous AI Critic Feedback:
{json.dumps(previous_feedback)}

The student is asking a follow-up question.
Provide a helpful, precise, and encouraging response. Keep it concise.
"""
        # Call the centralized AI Client
        # Note: We run this in a sync_to_async wrapper if the client implementation was sync,
        # but since we made it synchronous wrapper around an async-capable library or used a sync client,
        # we can wrap it. The AIClient.generate_dsa_chat_response is synchronous (blocking),
        # so we MUST wrap it to avoid blocking the asyncio loop.
        response = await database_sync_to_async(AIClient.generate_dsa_chat_response)(
            context_prompt=context_prompt,
            user_question=user_question
        )
        return response

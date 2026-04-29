import pytest

try:
    from hypothesis import given, settings, strategies as st
    HAS_HYPOTHESIS = True
except ImportError:
    HAS_HYPOTHESIS = False

from rest_framework.test import APIClient
from django.urls import reverse, NoReverseMatch

# Setup DRF test client
client = APIClient()


def _url_exists(name):
    """Check if a URL name is registered."""
    try:
        reverse(name)
        return True
    except NoReverseMatch:
        return False


@pytest.mark.django_db
@pytest.mark.skipif(not HAS_HYPOTHESIS, reason="hypothesis not installed")
class TestFuzzingAIEngine:
    """
    Autonomous API Fuzzing Suite using Hypothesis.
    Pounds the AI endpoints with unexpected, extreme, or malformed data 
    to ensure the backend gracefully rejects it (400) instead of crashing (500).
    """

    @pytest.mark.skipif(not _url_exists('summarize'), reason="summarize URL not registered")
    @settings(max_examples=50, deadline=1000)
    @given(
        text=st.text(min_size=0, max_size=100000), 
    )
    def test_fuzz_summarize_content(self, text):
        """
        Fuzzes the summary endpoint with random garbage strings up to 100kb.
        """
        url = reverse('summarize')
        response = client.post(url, {"text": text}, format='json')
        
        assert response.status_code in [200, 400, 401, 403, 429], (
            f"Fuzzing caused a crash! Status Code: {response.status_code}. Text length: {len(text)}"
        )

    @pytest.mark.skipif(not _url_exists('explain_code'), reason="explain_code URL not registered")
    @settings(max_examples=50, deadline=1000)
    @given(
        code=st.text(alphabet=st.characters(blacklist_categories=('Cs',)), max_size=50000),
        context=st.text(max_size=1000)
    )
    def test_fuzz_explain_code(self, code, context):
        """
        Fuzzes the /ai/explain/ code with random structural noise.
        """
        url = reverse('explain_code')
        response = client.post(url, {
            "code": code,
            "context": context
        }, format='json')
        
        assert response.status_code in [200, 400, 401, 403, 429], (
            f"Fuzzing crash on explain_code! Code: {response.status_code}"
        )

    @pytest.mark.skipif(not _url_exists('ask_tutor'), reason="ask_tutor URL not registered")
    @settings(max_examples=50, deadline=1000)
    @given(
        question=st.text(max_size=5000),
        module=st.text(max_size=1000)
    )
    def test_fuzz_ask_tutor(self, question, module):
        """
        Fuzzes the Chatbot API.
        """
        url = reverse('ask_tutor')
        response = client.post(url, {
            "question": question,
            "module_filename": module
        }, format='json')
        
        assert response.status_code in [200, 400, 401, 403, 429], (
            f"Fuzzing crash on ask_tutor! Code: {response.status_code}"
        )

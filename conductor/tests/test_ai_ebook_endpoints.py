import pytest
from rest_framework import status


@pytest.mark.django_db
class TestAIEbookEndpoints:
    """Test suite verifying AI Ebook Smart Reading Companion parity endpoints."""

    def test_summarize_ebook_chapter_with_content(self, api_client):
        content = (
            "# Chapter 1: Foundations\n\n"
            "This chapter introduces asymptotic complexity and performance.\n\n"
            "- Big-O defines the tight upper bound of algorithmic complexity.\n"
            "- Amortized analysis guarantees long-term operational efficiency.\n\n"
            "**Big-O Notation**: Mathematical notation describing the limiting behavior of a function.\n"
            "**Amortized Cost**: Average cost of an operation over a large sequence of events.\n"
        )
        payload = {
            "chapterTitle": "Asymptotic Analysis Foundations",
            "chapterContent": content,
        }

        response = api_client.post("/api/v1/ai/ebook/summarize-chapter/", data=payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "success"
        assert "summary" in data
        assert "keyTakeaways" in data
        assert isinstance(data["keyTakeaways"], list)
        assert len(data["keyTakeaways"]) >= 1
        assert "definitions" in data
        assert isinstance(data["definitions"], list)
        assert len(data["definitions"]) >= 2
        # Check parsed definition terms
        terms = [d["term"].strip() for d in data["definitions"]]
        assert any("Big-O" in t for t in terms)

    def test_summarize_ebook_chapter_fallback(self, api_client):
        payload = {
            "chapterTitle": "Distributed Consensus & Raft",
            "chapterContent": "",
        }
        response = api_client.post("/api/v1/ai/ebook/summarize-chapter/", data=payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "success"
        assert "Distributed Consensus & Raft" in data["summary"]
        assert len(data["keyTakeaways"]) >= 2
        assert len(data["definitions"]) >= 2

    def test_explain_ebook_paragraph(self, api_client):
        payload = {
            "paragraphText": "When an array reaches its capacity, allocating a new buffer of 2C requires O(N) time.",
            "chapterContext": "Dynamic Array Resizing",
        }
        response = api_client.post("/api/v1/ai/ebook/explain-paragraph/", data=payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "success"
        assert "explanation" in data
        assert "analogy" in data
        assert "bulletPoints" in data
        assert isinstance(data["bulletPoints"], list)
        assert len(data["bulletPoints"]) >= 2

    def test_noslash_ebook_endpoints(self, api_client):
        payload = {
            "chapterTitle": "No Slash Test",
            "chapterContent": "Testing route without trailing slash.",
        }
        res_sum = api_client.post("/api/v1/ai/ebook/summarize-chapter", data=payload, format="json")
        assert res_sum.status_code == status.HTTP_200_OK

        payload_exp = {
            "paragraphText": "Testing paragraph explanation without trailing slash.",
        }
        res_exp = api_client.post("/api/v1/ai/ebook/explain-paragraph", data=payload_exp, format="json")
        assert res_exp.status_code == status.HTTP_200_OK

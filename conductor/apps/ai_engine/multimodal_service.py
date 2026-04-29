import logging
from typing import Dict, Any, Optional
from django.core.files.base import ContentFile
from apps.ai_engine.ai_client import AIClient

logger = logging.getLogger(__name__)

class MultimodalAssessmentService:
    """
    Service to orchestrate Multimodal Assessments (Vision AI).
    """

    @staticmethod
    def process_assessment_submission(user, image_file, subject_context: str = "") -> Dict[str, Any]:
        """
        Handles the submission and evaluation of a visual assessment.
        """
        try:
            # 1. Read bytes from image file
            image_bytes = image_file.read()
            mime_type = image_file.content_type if hasattr(image_file, 'content_type') else "image/jpeg"

            # 2. Call AI Client for Multimodal Evaluation
            result = AIClient.evaluate_multimodal_assessment(
                image_bytes=image_bytes,
                context_text=subject_context,
                mime_type=mime_type
            )

            if "error" in result:
                logger.error(f"Assessment error for user {user.id}: {result['error']}")
                return {"status": "error", "message": result["error"]}

            # 3. Log Activity (Behavior Tracking)
            try:
                from apps.ai_engine.services import UserBehaviorService
                UserBehaviorService.track_activity(
                    user=user,
                    action="MULTIMODAL_ASSESSMENT_SUBMITTED",
                    metadata={
                        "score": result.get("score"),
                        "subject": subject_context
                    }
                )
            except Exception as e:
                logger.warning(f"Failed to log assessment activity: {e}")

            return {
                "status": "success",
                "evaluation": result
            }

        except Exception as e:
            logger.error(f"Multimodal assessment service failure: {e}")
            return {"status": "error", "message": str(e)}

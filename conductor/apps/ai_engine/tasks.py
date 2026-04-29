import logging
from celery import shared_task
from django.contrib.auth import get_user_model
from apps.ai_engine.action_service import ActionService

logger = logging.getLogger(__name__)
User = get_user_model()

@shared_task(bind=True, queue='ai_queue', autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={'max_retries': 2})
def perform_ai_action_task(self, user_id, command_text):
    """
    Celery task to execute AI actions asynchronously.
    """
    try:
        user = User.objects.get(id=user_id)
        logger.info("Task %s: Executing AI command for user %s", self.request.id, user.username)
        
        from apps.ai_engine.action_service import ActionService
        from apps.ai_engine.monitoring import monitor, ModelMetrics

        start_time = monitor.start_timer()
        success = False
        error_msg = None
        
        try:
            # Execute the command using the synchronous method in ActionService
            result = ActionService._execute_command_sync(user, command_text)
            success = result.get("status") != "error"
            if not success:
                error_msg = result.get("message")
            else:
                # Disptach success result via WebSockets so the frontend receives the AI response
                try:
                    from channels.layers import get_channel_layer
                    from asgiref.sync import async_to_sync
                    channel_layer = get_channel_layer()
                    async_to_sync(channel_layer.group_send)(
                        f"user_{user.id}",
                        {
                            "type": "ai_action_result",
                            "data": {
                                "command": command_text,
                                "result": result
                            }
                        }
                    )
                except Exception as ws_err:
                    logger.error("Failed to broadcast AI action result: %s", ws_err)

            return result
        except Exception as e:
            error_msg = str(e)
            raise e
        finally:
            latency = monitor.stop_timer(start_time)
            token_count = len(command_text.split()) + (len(str(result)) if 'result' in locals() else 0) // 4
            
            monitor.log_inference(ModelMetrics(
                model_name="action_engine_v1",
                latency_ms=latency,
                token_usage={"total": token_count},
                success=success,
                error=error_msg
            ))

    except User.DoesNotExist:
        logger.error("User %s not found for AI task", user_id)
        return {"status": "error", "message": "User not found"}
    except Exception as e:
        logger.error("AI Task failed: %s", e)
        return {"status": "error", "message": str(e)}

@shared_task(bind=True, queue='ai_queue', max_retries=3)
def update_course_embedding(self, course_id):
    """
    Generate or update the AI vector embedding for a course asynchronously.
    """
    try:
        from apps.courses.models import Course
        from apps.ai_engine.vector_service import VectorService
        
        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            logger.warning("Task %s: Course %s deleted before embedding generation. Exiting gracefully.", self.request.id, course_id)
            return {"status": "skipped", "reason": "Course not found"}
        
        # Combine semantic metadata for dense embedding representation
        text_chunk = f"{course.title}. {course.description}. Category: {course.category.name if course.category else 'Learning'}"
        
        # Store securely via VectorService (Gemini API internal)
        embedding_obj = VectorService.store_content_embedding(course, text_chunk)
        
        if embedding_obj:
            logger.info("Task %s: Course %s vector generated.", self.request.id, course_id)
            return {"status": "success", "course_id": course_id}
        else:
            raise RuntimeError("VectorService returned None.")
            
    except Exception as e:
        logger.error("Failed to generate embedding for Course %s: %s", course_id, str(e))
        # Retry with exponential backoff on API rate limit or transient error
        self.retry(exc=e, countdown=2 ** self.request.retries * 60)

@shared_task(bind=True, queue='ai_queue', max_retries=1)
def run_causal_discovery_task(self):
    """
    Periodic Celery task to execute Causal Discovery over recent ActivityLogs.
    Identifies true causal drivers of student success and generates LearningInsights.
    """
    try:
        from apps.ai_engine.causal_service import CausalAnalyticsService
        logger.info("Task %s: Running Causal Discovery across student population.", self.request.id)
        
        results = CausalAnalyticsService.run_causal_discovery(days_back=30)
        edges = results.get("edges", [])
        
        logger.info("Causal Discovery computed. Discovered %d causal edges.", len(edges))
        return {"status": "success", "edges_discovered": len(edges)}
        
    except Exception as e:
        logger.error("Failed to run Causal Discovery Task: %s", str(e))
        return {"status": "error", "message": str(e)}

@shared_task(bind=True, queue='ai_queue', max_retries=1)
def monitor_ml_drift_task(self):
    """
    Periodic Celery task executing tracking Population Stability Index (PSI).
    Monitors if the foundational data distribution the ML engines rely upon 
    has shifted significantly over time.
    """
    try:
        from apps.ai_engine.monitoring import DriftDetector
        from apps.ai_engine.models import ActivityLog
        from django.utils import timezone
        from datetime import timedelta
        
        logger.info("Task %s: Running ML Data Drift Detection across ActivityLogs.", self.request.id)
        
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)
        sixty_days_ago = now - timedelta(days=60)
        
        # We compare the last 30 days of Quiz Scores vs the previous 30 days
        recent_qs = ActivityLog.objects.filter(
            action=ActivityLog.ActionType.QUIZ_COMPLETE, 
            timestamp__gte=thirty_days_ago
        )
        historical_qs = ActivityLog.objects.filter(
            action=ActivityLog.ActionType.QUIZ_COMPLETE, 
            timestamp__gte=sixty_days_ago, 
            timestamp__lt=thirty_days_ago
        )
        
        # We assume the metadata JSON field has 'score' stored as a float/int.
        # For demonstration of the API hook, we pull out the metadata__score.
        # A more robust DB setup would cast this via ORM Cast or pull the dicts.
        
        # Extracting the raw values efficiently via list comprehension:
        recent_scores = np.array([log.metadata.get('score', 0) for log in recent_qs if isinstance(log.metadata, dict) and 'score' in log.metadata], dtype=float)
        historical_scores = np.array([log.metadata.get('score', 0) for log in historical_qs if isinstance(log.metadata, dict) and 'score' in log.metadata], dtype=float)
        
        if len(historical_scores) < 10 or len(recent_scores) < 10:
            logger.warning("Insufficient Quiz Score data for Drift Detection.")
            return {"status": "insufficient_data"}
            
        psi = DriftDetector.calculate_psi(historical_scores, recent_scores)
        
        is_drifted = psi > 0.2
        logger.info("ML Observability: Quiz Score PSI = %.3f. Model Retraining Required: %s", psi, is_drifted)
        
        if is_drifted:
            logger.error("🚨 CRITICAL ML DRIFT DETECTED: PSI exceeds 0.2 threshold. Data distributions have shifted violently.")
            
            # Phase 52: Trigger Autonomous SOAR Remediation Runbook
            from apps.ai_engine.soar_engine import AutonomousSOAREngine
            soar_result = AutonomousSOAREngine.handle_drift_alert(psi_score=float(psi), field="quiz_score")
            
            return {
                "status": "success", 
                "psi": float(psi), 
                "drifted": is_drifted, 
                "soar_remediation": soar_result
            }
        
        return {"status": "success", "psi": float(psi), "drifted": is_drifted}
        
    except Exception as e:
        logger.error("Failed to run ML Drift Monitor Task: %s", str(e))
        return {"status": "error", "message": str(e)}


# =============================================================================
# PHASE 53: RLHF & DIRECT PREFERENCE OPTIMIZATION (DPO) BACKGROUND LOOP
# =============================================================================

@shared_task
def execute_dpo_training_loop():
    """
    Nightly Celery beat task.
    Consumes unapplied Human Preference datasets (Thumbs Up/Down).
    Constructs PreferencePairs and batches them through the DPO Train Step,
    saving the adjusted mathematical policy to local disk.
    Over time, this aligns generic LLM capabilities strictly towards
    what works best for the specific learners in the system.
    """
    logger.info("Initializing Direct Preference Optimization (DPO) Training Loop...")
    try:
        from apps.ai_engine.models import HumanPreference
        from apps.ai_engine.preference_learning import PreferenceLearning, PreferencePair
        
        # 1. Gather pending telemetry
        unprocessed_prefs = HumanPreference.objects.filter(applied_to_dpo=False)[:100] # Batch size 100
        
        if not unprocessed_prefs.exists():
            logger.info("No new Human Preferences to process. DPO Loop skipped.")
            return {"status": "skipped", "reason": "No pending data"}
            
        # 2. Structure the pairs
        preference_pairs = []
        for pref in unprocessed_prefs:
            preference_pairs.append(
                PreferencePair(
                    prompt=pref.prompt,
                    chosen=pref.chosen,
                    rejected=pref.rejected,
                    metadata=pref.metadata
                )
            )
            
        # 3. Spin up the Learning System (DPO configuration)
        pl_system = PreferenceLearning(method='dpo')
        
        # 4. Train
        average_loss = pl_system.train(preference_pairs)
        
        # 5. Save State
        pl_system.dpo.save() if hasattr(pl_system.dpo, 'save') else None
        
        # 6. Mark consumed
        HumanPreference.objects.filter(id__in=[p.id for p in unprocessed_prefs]).update(applied_to_dpo=True)
        
        logger.info(f"DPO Training Cycle Complete. Batches Processed: {len(preference_pairs)}. Average Loss: {average_loss:.4f}")
        return {
            "status": "success", 
            "batches_processed": len(preference_pairs),
            "average_loss": float(average_loss)
        }
        
    except Exception as e:
        logger.error(f"FATAL DPO Training Loop error: {str(e)}")
        return {"status": "error", "message": str(e)}

# =============================================================================
# PHASE 134: AUTONOMOUS AGENTIC WORKFLOWS (LARGE ACTION MODELS)
# =============================================================================

@shared_task(bind=True, queue='ai_queue', max_retries=1)
def run_autonomous_course_generator(self, topic: str, admin_user_id: int):
    """
    Celery task that triggers the Autonomous Course Generator Agent.
    Can be scheduled via Celery Beat to run nightly (e.g., pulling trending
    topics from Twitter/HackerNews and generating a new course).
    """
    try:
        from apps.ai_engine.multi_agent import CourseAutoGenerator
        logger.info(f"Task {self.request.id}: Triggering LAM Agents for topic '{topic}'")
        
        course_id = CourseAutoGenerator.generate_and_publish_course(
            topic=topic, 
            user_id=admin_user_id
        )
        
        if course_id:
            logger.info(f"LAM Execution Success. Generated Course ID: {course_id}")
            return {"status": "success", "course_id": course_id, "topic": topic}
        else:
            logger.error("LAM Execution Failed. Agent returned None.")
            return {"status": "error", "message": "Agent failed to generate course."}
            
    except Exception as e:
        logger.error(f"Failed to run Autonomous Course Generator Task: {str(e)}")
        return {"status": "error", "message": str(e)}

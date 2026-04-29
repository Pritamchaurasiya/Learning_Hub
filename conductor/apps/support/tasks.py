from celery import shared_task
import logging
from .models import Feedback

logger = logging.getLogger(__name__)

@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={'max_retries': 3})
def auto_triage_support_ticket(self, ticket_id):
    """
    Asynchronously analyzes new support tickets bypassing HTTP wait times.
    Determines severity, calculates urgency, and attempts Auto-Resolution using AI/Heuristics.
    """
    logger.info(f"CELERY TASK START: AI Triage beginning for Ticket {ticket_id}...")
    
    try:
        ticket = Feedback.objects.get(id=ticket_id)
        
        # Simulated AI Processing Engine Setup (Gemini/Keyword Heuristics)
        urgency = 1
        content = (ticket.subject + " " + ticket.message).lower()
        
        # 1. Severity Routing Phase
        if any(word in content for word in ['crash', 'payment', 'fraud', 'hacked', 'down', 'error 500']):
            urgency = 9 # Critical Escalar P1 
            ticket.status = Feedback.Status.ESCALATED
        elif any(word in content for word in ['refund', 'cancel', 'urgent']):
            urgency = 6 # High Priority P2
            ticket.status = Feedback.Status.OPEN
        else:
            urgency = 2 # General Queue P3
            ticket.status = Feedback.Status.OPEN
            
        ticket.urgency_score = urgency
        
        # 2. Automated Resolution Phase (Auto-Reply Engine)
        if "password" in content and "reset" in content:
            ticket.ai_suggested_response = "It looks like you need a password reset. Please visit our automated portal at /reset_password to instantly regain access."
            # We don't mark completely resolved just in case, but we drop it to IN_PROGRESS so an agent only verifies.
            ticket.status = Feedback.Status.IN_PROGRESS
            
        elif "download" in content and "offline" in content:
            ticket.ai_suggested_response = "To access offline downloads, please tap the three-dots on the Mobile App next to a video and select 'Make Available Offline'."
            ticket.status = Feedback.Status.IN_PROGRESS
            
        elif urgency >= 8:
            ticket.ai_suggested_response = "WARNING: System has flagged this as highly critical. Support lead has been paged."

        ticket.save(update_fields=['urgency_score', 'status', 'ai_suggested_response'])
        logger.info(f"CELERY TASK COMPLETE: Triage finished. Ticket {ticket_id} is now Urgency {urgency} | Status: {ticket.status}")
        
    except Feedback.DoesNotExist:
        logger.error(f"Triage Task failed: Ticket {ticket_id} no longer exists.")
    except Exception as e:
        logger.error(f"Triage Task encountered an unexpected error: {str(e)}")

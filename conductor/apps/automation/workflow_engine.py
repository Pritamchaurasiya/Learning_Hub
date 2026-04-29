"""
Workflow Automation Engine

Internal Zapier-like automation system.
1. DAG (Directed Acyclic Graph) Execution
2. Event-based Triggers
3. Action Executors
"""

import logging
import uuid
import time
from typing import Dict, Any, List, Callable, Optional
from enum import Enum
from dataclasses import dataclass

logger = logging.getLogger(__name__)


class NodeStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class WorkflowContext:
    workflow_id: str
    run_id: str
    payload: Dict[str, Any]
    results: Dict[str, Any]


from abc import ABC, abstractmethod

class WorkflowAction(ABC):
    """Base class for all automation actions."""
    
    @abstractmethod
    def execute(self, context: WorkflowContext, input_data: Dict) -> Dict:
        pass


class SendEmailAction(WorkflowAction):
    def execute(self, context: WorkflowContext, input_data: Dict) -> Dict:
        email = input_data.get('email')
        subject = input_data.get('subject')
        message = input_data.get('message', 'Automated workflow email.')
        
        logger.info(f"Executing SendEmailAction to {email} with subject '{subject}'")
        
        try:
            from apps.notifications.tasks import send_email_async
            send_email_async.delay(subject=subject, message=message, recipient_list=[email])
            return {"status": "sent", "timestamp": time.time(), "channel": "celery"}
        except Exception as e:
            logger.error(f"SendEmailAction failed: {e}")
            return {"status": "failed", "error": str(e)}


class UpdateRecordAction(WorkflowAction):
    def execute(self, context: WorkflowContext, input_data: Dict) -> Dict:
        table = input_data.get('table')
        record_id = input_data.get('id')
        updates = input_data.get('updates', {})
        
        logger.info(f"UpdateRecordAction for {table}:{record_id}")
        
        # Security Note: Dynamic model loading should be restricted
        # Implementation is abstracted for now but wired for actual execution logging
        return {"status": "updated", "table": table, "id": record_id, "fields": list(updates.keys())}


class WorkflowEngine:
    """
    Executes automation workflows triggered by system events.
    """
    
    _registry: Dict[str, WorkflowAction] = {
        "send_email": SendEmailAction(),
        "update_db": UpdateRecordAction(),
    }
    
    @classmethod
    def register_action(cls, name: str, action: WorkflowAction):
        cls._registry[name] = action

    @classmethod
    def execute_workflow(cls, workflow_def: Dict[str, Any], initial_payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a defined workflow.
        workflow_def structure:
        {
            "id": "wf_1",
            "steps": [
                {"id": "step_1", "action": "send_email", "params": {...}, "next": ["step_2"]},
                {"id": "step_2", "action": "update_db", "params": {...}}
            ]
        }
        """
        run_id = str(uuid.uuid4())
        context = WorkflowContext(
            workflow_id=workflow_def["id"],
            run_id=run_id,
            payload=initial_payload,
            results={}
        )
        
        logger.info(f"Starting workflow {workflow_def['id']} run {run_id}")
        
        # Convert list to map for graph traversal
        steps_map = {step["id"]: step for step in workflow_def["steps"]}
        
        # Determine start node (simplified: first in list or explicit start)
        current_step_id = workflow_def["steps"][0]["id"]
        
        # Linear execution for MVP (Graph traversal would be recursive/queue-based)
        while current_step_id:
            step = steps_map.get(current_step_id)
            if not step: break
            
            action_name = step["action"]
            action = cls._registry.get(action_name)
            
            if action:
                try:
                    # Resolve params using context (rudimentary template substitution)
                    # e.g. params could reference context.payload.user_id
                    input_data = step.get("params", {}).copy()
                    input_data.update(context.payload) # Simple merge
                    
                    result = action.execute(context, input_data)
                    context.results[current_step_id] = result
                    
                    # Move next
                    next_steps = step.get("next", [])
                    current_step_id = next_steps[0] if next_steps else None
                    
                except Exception as e:
                    logger.error(f"Workflow failed at step {current_step_id}: {e}")
                    return {"status": "failed", "run_id": run_id, "error": str(e)}
            else:
                logger.error(f"Unknown action {action_name}")
                break
                
        return {"status": "completed", "run_id": run_id, "results": context.results}

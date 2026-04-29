"""
Agentic Loop

Autonomous agent execution:
1. Reasoning loop.
2. Action execution.
3. Error recovery.
"""

import logging
import random
from typing import List, Dict, Tuple, Optional, Any, Callable
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime

logger = logging.getLogger(__name__)


class AgentState(Enum):
    IDLE = "idle"
    THINKING = "thinking"
    ACTING = "acting"
    WAITING = "waiting"
    ERROR = "error"
    COMPLETED = "completed"


@dataclass
class Action:
    type: str # Tool name
    name: str # e.g. search_action
    parameters: Dict[str, Any]
    result: Optional[Any] = None
    error: Optional[str] = None
    duration_ms: int = 0


@dataclass
class ThoughtStep:
    thought: str
    reasoning: str
    action: Optional[Action]
    observation: Optional[str]
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class AgentMemory:
    short_term: List[ThoughtStep] = field(default_factory=list)
    long_term: Dict[str, Any] = field(default_factory=dict)
    context: str = ""
    max_short_term: int = 20

    def add_step(self, step: ThoughtStep):
        self.short_term.append(step)
        if len(self.short_term) > self.max_short_term:
            self.short_term.pop(0)

    def get_recent(self, n: int = 5) -> List[ThoughtStep]:
        return self.short_term[-n:]


class Reasoner:
    """Generate reasoning and plan actions."""
    def __init__(self):
        self.reasoning_templates = [
            "Given {context}, I should {action} because {reason}.",
            "To solve {goal}, the next step is to {action}.",
            "Based on {observation}, I need to {action}.",
            "The information suggests {inference}, so I will {action}."
        ]

    def think(
        self, 
        goal: str, 
        context: str, 
        observations: List[str]
    ) -> Tuple[str, str]:
        """Generate thought and reasoning via LLM."""
        from apps.ai_engine.ai_client import AIClient
        
        prompt = f"""
        You are an Autonomous AI reasoning about your next move.
        Context: {context}
        Goal: {goal}
        Recent observations: {observations[-3:] if observations else 'None'}
        
        Provide a brief thought (what you are focusing on right now) and a short reasoning (why you are doing it).
        Output strict JSON: {{"thought": "...", "reasoning": "..."}}
        """
        try:
            import json
            res = AIClient.generate_text(prompt)
            data = json.loads(res.strip().replace("```json", "").replace("```", ""))
            return data.get("thought", "Analyzing situation."), data.get("reasoning", "Determining next step based on goal.")
        except Exception as e:
            logger.error(f"Reasoner.think failed: {e}")
            return f"Working on: {goal[:50]}", "Proceeding to next logical step."

    def decide_action(
        self, 
        goal: str, 
        available_tools_schema: str,
        recent_history: str
    ) -> Tuple[str, Dict[str, Any]]:
        """Decide which action to take using LLM routing."""
        from apps.ai_engine.ai_client import AIClient
        
        prompt = f"""
        You are an Autonomous Action Agent.
        Goal: "{goal}"
        Recent Action History: "{recent_history}"

        Available Tools Schema:
        {available_tools_schema}

        Select the next tool. If no tools apply or the goal is fully achieved, output tool: "FINISHED".
        Output strict JSON ONLY:
        {{
            "tool": "TOOL_NAME",
            "params": {{ "param_name": "value" }}
        }}
        """
        try:
            import json
            res = AIClient.generate_text(prompt)
            data = json.loads(res.strip().replace("```json", "").replace("```", ""))
            return data.get("tool", "FINISHED"), data.get("params", {})
        except Exception as e:
            logger.error(f"Reasoner.decide_action failed: {e}")
            return "FINISHED", {}

class ActionExecutor:
    """Execute decided actions via ToolRegistry."""
    def execute(self, action: Action, user: Any = None) -> Action:
        """Execute a tool from ActionService.ToolRegistry."""
        start = datetime.now()
        
        if action.type == "FINISHED":
            action.result = {"status": "success", "message": "Task complete."}
            action.duration_ms = int((datetime.now() - start).total_seconds() * 1000)
            return action
            
        from apps.ai_engine.action_service import ToolRegistry
        tool_def = ToolRegistry.get_tool(action.type)
        
        if not tool_def:
            action.error = f"Tool not found: {action.type}"
            action.duration_ms = int((datetime.now() - start).total_seconds() * 1000)
            return action
        
        try:
            params = action.parameters.copy()
            if 'user' in tool_def['func'].__code__.co_varnames and user:
                params['user'] = user

            result = tool_def['func'](**params)
            action.result = result
        except Exception as e:
            action.error = str(e)
            logger.error(f"ActionExecutor failed on {action.type}: {e}")
        
        action.duration_ms = int((datetime.now() - start).total_seconds() * 1000)
        return action


class ErrorRecovery:
    """Handle errors and recovery strategies."""
    def __init__(self, max_retries: int = 3):
        self.max_retries = max_retries
        self.retry_counts: Dict[str, int] = {}

    def should_retry(self, action_name: str) -> bool:
        """Check if action should be retried."""
        count = self.retry_counts.get(action_name, 0)
        return count < self.max_retries

    def record_error(self, action_name: str, error: str):
        """Record an error."""
        self.retry_counts[action_name] = self.retry_counts.get(action_name, 0) + 1
        logger.warning(f"Error in {action_name} (attempt {self.retry_counts[action_name]}): {error}")

    def get_recovery_strategy(self, error: str) -> str:
        """Get recovery strategy for error."""
        if 'timeout' in error.lower():
            return 'retry_with_backoff'
        elif 'not found' in error.lower():
            return 'try_alternative'
        elif 'permission' in error.lower():
            return 'escalate'
        else:
            return 'retry'

    def reset(self, action_name: str):
        """Reset retry count for action."""
        self.retry_counts[action_name] = 0


class AgenticLoop:
    """Main agentic execution loop."""
    def __init__(self, max_steps: int = 50):
        self.max_steps = max_steps
        self.reasoner = Reasoner()
        self.executor = ActionExecutor()
        self.recovery = ErrorRecovery()
        self.memory = AgentMemory()
        self.state = AgentState.IDLE

    def _is_goal_achieved(self, goal: str, steps: List[ThoughtStep]) -> bool:
        """Check if goal is achieved."""
        if len(steps) >= self.max_steps:
            return True  # Max steps reached
        
        # Check recent observations for success indicators
        recent = steps[-3:] if len(steps) >= 3 else steps
        for step in recent:
            if step.observation and 'success' in step.observation.lower():
                return True
        
        return False

    def _format_observation(self, action: Action) -> str:
        """Format action result as observation."""
        if action.error:
            return f"Error: {action.error}"
        
        result = action.result
        if isinstance(result, dict):
            return f"Result: {str(result)[:200]}"
        return f"Result: {str(result)[:200]}"

    def run(self, goal: str, context: str = "", user: Any = None) -> Dict[str, Any]:
        """Run the agentic loop."""
        from apps.ai_engine.action_service import ToolRegistry
        
        self.state = AgentState.THINKING
        self.memory.context = context
        steps: List[ThoughtStep] = []
        observations: List[str] = []
        
        while not self._is_goal_achieved(goal, steps):
            # Think
            thought, reasoning = self.reasoner.think(goal, context, observations)
            
            # Decide action
            recent_history = " | ".join([s.action.type for s in steps[-3:] if s.action])
            schema = ToolRegistry.get_schema()
            
            action_type, params = self.reasoner.decide_action(goal, schema, recent_history)
            action = Action(type=action_type, name=f"{action_type}_action", parameters=params)
            
            # Execute
            self.state = AgentState.ACTING
            action = self.executor.execute(action, user=user)
            
            if action.type == "FINISHED":
                observation = "Goal achieved."
                steps.append(ThoughtStep(thought=thought, reasoning=reasoning, action=action, observation=observation))
                break
                
            # Handle errors
            if action.error:
                self.state = AgentState.ERROR
                self.recovery.record_error(action.name, action.error)
                
                if self.recovery.should_retry(action.name):
                    strategy = self.recovery.get_recovery_strategy(action.error)
                    observations.append(f"Error, applying {strategy}")
                    continue
            else:
                self.recovery.reset(action.name)
            
            # Record observation
            observation = self._format_observation(action)
            observations.append(observation)
            
            # Create step
            step = ThoughtStep(
                thought=thought,
                reasoning=reasoning,
                action=action,
                observation=observation
            )
            steps.append(step)
            self.memory.add_step(step)
            
            self.state = AgentState.THINKING
        
        self.state = AgentState.COMPLETED
        
        return {
            'goal': goal,
            'steps_taken': len(steps),
            'final_observation': observations[-1] if observations else None,
            'state': self.state.value,
            'success': not any(s.action.error for s in steps if s.action),
            'thought_process': [
                {
                    "step": i+1,
                    "thought": s.thought,
                    "reasoning": s.reasoning,
                    "action": s.action.type if s.action else None,
                    "parameters": s.action.parameters if s.action else None,
                    "observation": s.observation
                } for i, s in enumerate(steps)
            ]
        }

    def step(self, goal: str) -> ThoughtStep:
        """Execute a single step."""
        from apps.ai_engine.action_service import ToolRegistry
        
        observations = [s.observation for s in self.memory.get_recent() if s.observation]
        thought, reasoning = self.reasoner.think(goal, self.memory.context, observations)
        
        recent_history = " | ".join([s.action.type for s in self.memory.get_recent() if s.action])
        schema = ToolRegistry.get_schema()
        
        action_type, params = self.reasoner.decide_action(goal, schema, recent_history)
        action = Action(type=action_type, name=f"{action_type}_action", parameters=params)
        action = self.executor.execute(action)
        observation = self._format_observation(action)
        
        step = ThoughtStep(
            thought=thought,
            reasoning=reasoning,
            action=action,
            observation=observation
        )
        
        self.memory.add_step(step)
        return step

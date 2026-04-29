"""
Multi-Agent Systems Module (Phase 26).
Enables coordination between multiple AI agents for complex tasks.
"""
import logging
import random
import uuid
from typing import List, Dict, Any, Optional, Callable, Set
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict
import time

logger = logging.getLogger(__name__)


class MessageType(Enum):
    """Types of inter-agent messages."""
    REQUEST = "request"
    RESPONSE = "response"
    BROADCAST = "broadcast"
    DELEGATE = "delegate"
    STATUS = "status"
    RESULT = "result"


@dataclass
class Message:
    """Message between agents."""
    id: str
    sender: str
    receiver: str  # "*" for broadcast
    msg_type: MessageType
    content: Dict[str, Any]
    timestamp: float = field(default_factory=time.time)
    reply_to: Optional[str] = None


@dataclass
class Task:
    """A decomposable task."""
    id: str
    name: str
    description: str
    subtasks: List['Task'] = field(default_factory=list)
    assigned_to: Optional[str] = None
    status: str = "pending"
    result: Any = None
    priority: int = 1


class MessageBus:
    """Central message broker for agent communication."""
    
    def __init__(self):
        self.queues: Dict[str, List[Message]] = defaultdict(list)
        self.broadcast_queue: List[Message] = []
        self.message_log: List[Message] = []
    
    def send(self, message: Message):
        """Send a message to an agent or broadcast."""
        self.message_log.append(message)
        
        if message.receiver == "*":
            self.broadcast_queue.append(message)
        else:
            self.queues[message.receiver].append(message)
    
    def receive(self, agent_id: str) -> List[Message]:
        """Receive all pending messages for an agent."""
        messages = self.queues[agent_id].copy()
        messages.extend([m for m in self.broadcast_queue if m.sender != agent_id])
        self.queues[agent_id].clear()
        return messages
    
    def clear_broadcasts(self):
        """Clear old broadcasts."""
        self.broadcast_queue.clear()


class BaseAgent:
    """Base class for autonomous agents."""
    
    def __init__(self, agent_id: str, capabilities: List[str], bus: MessageBus):
        self.id = agent_id
        self.capabilities = set(capabilities)
        self.bus = bus
        self.pending_responses: Dict[str, Message] = {}
        self.state: Dict[str, Any] = {}
    
    def send_message(
        self, 
        receiver: str, 
        msg_type: MessageType, 
        content: Dict[str, Any],
        reply_to: Optional[str] = None
    ) -> str:
        """Send a message and return its ID."""
        msg_id = str(uuid.uuid4())[:8]
        message = Message(
            id=msg_id,
            sender=self.id,
            receiver=receiver,
            msg_type=msg_type,
            content=content,
            reply_to=reply_to
        )
        self.bus.send(message)
        return msg_id
    
    def process_messages(self) -> List[Dict[str, Any]]:
        """Process incoming messages."""
        messages = self.bus.receive(self.id)
        results = []
        
        for msg in messages:
            result = self.handle_message(msg)
            if result:
                results.append(result)
        
        return results
    
    def handle_message(self, message: Message) -> Optional[Dict[str, Any]]:
        """Handle a single message. Override in subclasses."""
        if message.msg_type == MessageType.REQUEST:
            return self._handle_request(message)
        elif message.msg_type == MessageType.RESPONSE:
            return self._handle_response(message)
        elif message.msg_type == MessageType.DELEGATE:
            return self._handle_delegation(message)
        return None
    
    def _handle_request(self, message: Message) -> Optional[Dict[str, Any]]:
        """Handle incoming request."""
        action = message.content.get("action")
        if action and action in self.capabilities:
            result = self.execute_capability(action, message.content.get("params", {}))
            self.send_message(
                message.sender,
                MessageType.RESPONSE,
                {"result": result, "action": action},
                reply_to=message.id
            )
            return {"handled": action, "result": result}
        return None
    
    def _handle_response(self, message: Message) -> Optional[Dict[str, Any]]:
        """Handle response to our request."""
        if message.reply_to in self.pending_responses:
            del self.pending_responses[message.reply_to]
        return {"received_response": message.content}
    
    def _handle_delegation(self, message: Message) -> Optional[Dict[str, Any]]:
        """Handle delegated task."""
        task_data = message.content.get("task")
        if task_data:
            result = self.execute_task(task_data)
            self.send_message(
                message.sender,
                MessageType.RESULT,
                {"task_id": task_data.get("id"), "result": result}
            )
            return {"delegated_task_completed": task_data.get("id")}
        return None
    
    def execute_capability(self, action: str, params: Dict) -> Any:
        """Execute a capability. Override in subclasses."""
        return f"Executed {action} with {params}"
    
    def execute_task(self, task_data: Dict) -> Any:
        """Execute a delegated task."""
        return f"Task {task_data.get('name', 'unknown')} completed"


class CoordinatorAgent(BaseAgent):
    """Agent that coordinates other agents and decomposes goals."""
    
    def __init__(self, agent_id: str, bus: MessageBus):
        super().__init__(agent_id, ["coordinate", "decompose", "assign"], bus)
        self.agents: Dict[str, Set[str]] = {}  # agent_id -> capabilities
        self.tasks: Dict[str, Task] = {}
    
    def register_agent(self, agent_id: str, capabilities: Set[str]):
        """Register an agent with its capabilities."""
        self.agents[agent_id] = capabilities
        logger.info(f"Registered agent {agent_id} with capabilities: {capabilities}")
    
    def decompose_goal(self, goal: str, depth: int = 2) -> Task:
        """Decompose a high-level goal into subtasks."""
        root_task = Task(
            id=str(uuid.uuid4())[:8],
            name=goal,
            description=f"Main goal: {goal}"
        )
        
        # Simple heuristic decomposition
        subtask_templates = [
            ("research", f"Research requirements for {goal}"),
            ("plan", f"Create plan for {goal}"),
            ("execute", f"Execute {goal}"),
            ("verify", f"Verify {goal} completion")
        ]
        
        for name, desc in subtask_templates:
            subtask = Task(
                id=str(uuid.uuid4())[:8],
                name=name,
                description=desc,
                priority=subtask_templates.index((name, desc)) + 1
            )
            root_task.subtasks.append(subtask)
        
        self.tasks[root_task.id] = root_task
        return root_task
    
    def assign_task(self, task: Task) -> Optional[str]:
        """Assign a task to the most suitable agent."""
        best_agent = None
        best_score = -1
        
        for agent_id, capabilities in self.agents.items():
            # Simple capability matching
            score = len([c for c in capabilities if c in task.name.lower()])
            if score > best_score or (score == best_score and random.random() > 0.5):
                best_score = score
                best_agent = agent_id
        
        if best_agent:
            task.assigned_to = best_agent
            task.status = "assigned"
            
            self.send_message(
                best_agent,
                MessageType.DELEGATE,
                {"task": {"id": task.id, "name": task.name, "description": task.description}}
            )
            
            return best_agent
        return None
    
    def execute_goal(self, goal: str) -> Dict[str, Any]:
        """Decompose and execute a goal using available agents."""
        root_task = self.decompose_goal(goal)
        results = []
        
        for subtask in root_task.subtasks:
            assigned = self.assign_task(subtask)
            if assigned:
                results.append({
                    "subtask": subtask.name,
                    "assigned_to": assigned,
                    "status": "delegated"
                })
        
        return {
            "goal": goal,
            "task_id": root_task.id,
            "subtasks_delegated": len(results),
            "assignments": results
        }


class WorkerAgent(BaseAgent):
    """Specialized worker agent with specific capabilities."""
    
    def __init__(self, agent_id: str, specialization: str, bus: MessageBus):
        capabilities = self._get_capabilities_for_specialization(specialization)
        super().__init__(agent_id, capabilities, bus)
        self.specialization = specialization
    
    def _get_capabilities_for_specialization(self, spec: str) -> List[str]:
        """Get capabilities based on specialization."""
        specs = {
            "researcher": ["research", "analyze", "summarize"],
            "planner": ["plan", "schedule", "prioritize"],
            "executor": ["execute", "build", "implement"],
            "verifier": ["verify", "test", "validate"]
        }
        return specs.get(spec, ["general"])
    
    def execute_capability(self, action: str, params: Dict) -> Any:
        """Execute specialized capability."""
        return {
            "agent": self.id,
            "action": action,
            "specialization": self.specialization,
            "result": f"Completed {action} successfully",
            "quality_score": random.uniform(0.7, 1.0)
        }


class ConsensusProtocol:
    """Protocol for reaching agreement among agents."""
    
    def __init__(self, agents: List[BaseAgent], threshold: float = 0.67):
        self.agents = agents
        self.threshold = threshold
    
    def propose_and_vote(self, proposal: Dict[str, Any]) -> Dict[str, Any]:
        """Have agents vote on a proposal."""
        votes = {}
        
        for agent in self.agents:
            # Simulate agent decision (in real system, would be based on agent's logic)
            vote = random.random() > 0.3  # 70% approval rate
            votes[agent.id] = vote
        
        approval_rate = sum(votes.values()) / len(votes)
        accepted = approval_rate >= self.threshold
        
        return {
            "proposal": proposal,
            "votes": votes,
            "approval_rate": approval_rate,
            "accepted": accepted,
            "threshold": self.threshold
        }


class MultiAgentSystem:
    """Complete multi-agent system with coordination."""
    
    def __init__(self):
        self.bus = MessageBus()
        self.coordinator: Optional[CoordinatorAgent] = None
        self.workers: List[WorkerAgent] = []
    
    def setup(self, n_workers: int = 4):
        """Set up the multi-agent system."""
        # Create coordinator
        self.coordinator = CoordinatorAgent("coordinator", self.bus)
        
        # Create specialized workers
        specializations = ["researcher", "planner", "executor", "verifier"]
        for i in range(n_workers):
            spec = specializations[i % len(specializations)]
            worker = WorkerAgent(f"worker_{i}", spec, self.bus)
            self.workers.append(worker)
            self.coordinator.register_agent(worker.id, worker.capabilities)
        
        logger.info(f"MAS initialized with 1 coordinator and {n_workers} workers")
    
    def execute_goal(self, goal: str) -> Dict[str, Any]:
        """Execute a goal using the multi-agent system."""
        if not self.coordinator:
            self.setup()
        
        # Coordinator decomposes and assigns
        delegation_result = self.coordinator.execute_goal(goal)
        
        # Workers process their tasks
        worker_results = []
        for worker in self.workers:
            results = worker.process_messages()
            worker_results.extend(results)
        
        return {
            "goal": goal,
            "delegation": delegation_result,
            "worker_results": worker_results,
            "message_count": len(self.bus.message_log)
        }
    
    def run_consensus(self, proposal: Dict[str, Any]) -> Dict[str, Any]:
        """Run consensus protocol among all agents."""
        all_agents = [self.coordinator] + self.workers if self.coordinator else self.workers
        protocol = ConsensusProtocol(all_agents)
        return protocol.propose_and_vote(proposal)


def demo_multi_agent():
    """Demo the multi-agent system."""
    print("=== Multi-Agent System Demo ===")
    
    mas = MultiAgentSystem()
    mas.setup(n_workers=4)
    
    # Execute a complex goal
    result = mas.execute_goal("Build a recommendation system")
    print(f"Goal: {result['goal']}")
    print(f"Subtasks delegated: {result['delegation']['subtasks_delegated']}")
    print(f"Worker results: {len(result['worker_results'])}")
    
    # Run consensus
    consensus = mas.run_consensus({"action": "deploy_to_production", "risk": "medium"})
    print(f"\nConsensus: {'ACCEPTED' if consensus['accepted'] else 'REJECTED'}")
    print(f"Approval rate: {consensus['approval_rate']:.1%}")
    
    return result, consensus


# =============================================================================
# PHASE 9: LEARNING AGENT COORDINATOR FOR PRODUCTION
# =============================================================================

class ExplainerAgent(BaseAgent):
    """
    Agent specialized in explaining concepts clearly.
    Uses various teaching strategies based on user needs.
    """
    
    def __init__(self, agent_id: str, bus: MessageBus):
        super().__init__(agent_id, ["explain", "simplify", "analogize", "teach"], bus)
        self.teaching_styles = ["visual", "textual", "example-based", "step-by-step"]
    
    def execute_capability(self, action: str, params: Dict) -> Any:
        """Generate explanations based on action."""
        topic = params.get("topic", "unknown concept")
        level = params.get("level", "intermediate")
        style = params.get("style", random.choice(self.teaching_styles))
        
        if action == "explain":
            return {
                "agent": self.id,
                "action": "explanation",
                "topic": topic,
                "level": level,
                "style": style,
                "content": f"Let me explain {topic} in a {style} way for {level} learners...",
                "follow_up_questions": [
                    f"What specific part of {topic} would you like more detail on?",
                    f"Would you like a practical example of {topic}?"
                ]
            }
        elif action == "simplify":
            return {
                "agent": self.id,
                "action": "simplification",
                "topic": topic,
                "original_level": level,
                "simplified": f"In simple terms, {topic} is like...",
                "analogy": f"Think of {topic} as..."
            }
        elif action == "analogize":
            return {
                "agent": self.id,
                "action": "analogy",
                "topic": topic,
                "analogy": f"Imagine {topic} as a real-world scenario where..."
            }
        return {"action": action, "completed": True}
    
    def execute_task(self, task_data: Dict) -> Any:
        """Execute explanation task."""
        topic = task_data.get("topic", "general concept")
        return self.execute_capability("explain", {"topic": topic, "level": "beginner"})


class QuizAgent(BaseAgent):
    """
    Agent specialized in generating and evaluating quizzes.
    Creates adaptive questions based on user performance.
    """
    
    def __init__(self, agent_id: str, bus: MessageBus):
        super().__init__(agent_id, ["quiz", "assess", "generate_questions", "evaluate"], bus)
        self.question_types = ["multiple_choice", "true_false", "fill_blank", "short_answer"]
    
    def execute_capability(self, action: str, params: Dict) -> Any:
        """Generate or evaluate quiz content."""
        topic = params.get("topic", "general")
        difficulty = params.get("difficulty", "medium")
        count = params.get("count", 3)
        
        if action in ["quiz", "generate_questions"]:
            questions = []
            for i in range(count):
                q_type = random.choice(self.question_types)
                questions.append({
                    "id": f"q_{i+1}",
                    "type": q_type,
                    "difficulty": difficulty,
                    "question": f"Question {i+1} about {topic}: ...",
                    "options": ["A", "B", "C", "D"] if q_type == "multiple_choice" else None,
                    "correct_answer": random.choice(["A", "B", "C", "D"]) if q_type == "multiple_choice" else "sample_answer"
                })
            return {
                "agent": self.id,
                "action": "quiz_generated",
                "topic": topic,
                "questions": questions,
                "estimated_time_minutes": count * 2
            }
        elif action == "evaluate":
            answers = params.get("answers", [])
            score = random.uniform(0.6, 1.0)  # Simulated evaluation
            return {
                "agent": self.id,
                "action": "evaluation",
                "score": round(score, 2),
                "percentage": f"{int(score*100)}%",
                "feedback": "Good effort! Focus on..." if score < 0.8 else "Excellent work!",
                "areas_to_improve": ["concept A", "concept B"] if score < 0.9 else []
            }
        return {"action": action, "completed": True}
    
    def execute_task(self, task_data: Dict) -> Any:
        """Execute quiz task."""
        topic = task_data.get("topic", "general")
        return self.execute_capability("quiz", {"topic": topic, "count": 5})


class CodeReviewAgent(BaseAgent):
    """
    Agent specialized in reviewing and suggesting code improvements.
    Provides feedback on code quality, patterns, and best practices.
    """
    
    def __init__(self, agent_id: str, bus: MessageBus):
        super().__init__(agent_id, ["review", "suggest", "debug", "optimize"], bus)
        self.review_aspects = ["readability", "performance", "security", "best_practices"]
    
    def execute_capability(self, action: str, params: Dict) -> Any:
        """Review or suggest code improvements."""
        code = params.get("code", "")
        language = params.get("language", "python")
        
        if action == "review":
            issues = []
            for aspect in self.review_aspects:
                if random.random() > 0.5:  # Simulated issue detection
                    issues.append({
                        "aspect": aspect,
                        "severity": random.choice(["low", "medium", "high"]),
                        "description": f"Consider improving {aspect} in line X",
                        "suggestion": f"Try using... for better {aspect}"
                    })
            return {
                "agent": self.id,
                "action": "code_review",
                "language": language,
                "issues_found": len(issues),
                "issues": issues,
                "overall_score": round(random.uniform(0.7, 1.0), 2),
                "summary": f"Found {len(issues)} potential improvements"
            }
        elif action == "suggest":
            return {
                "agent": self.id,
                "action": "code_suggestion",
                "language": language,
                "suggestions": [
                    {"type": "pattern", "description": "Consider using X pattern"},
                    {"type": "optimization", "description": "This loop can be optimized"}
                ]
            }
        elif action == "debug":
            return {
                "agent": self.id,
                "action": "debug_analysis",
                "potential_bugs": random.randint(0, 3),
                "recommendations": ["Check null handling", "Verify edge cases"]
            }
        return {"action": action, "completed": True}
    
    def execute_task(self, task_data: Dict) -> Any:
        """Execute code review task."""
        code = task_data.get("code", "")
        return self.execute_capability("review", {"code": code})


class LearningAgentCoordinator:
    """
    Coordinator for learning-focused multi-agent system.
    Manages ExplainerAgent, QuizAgent, and CodeReviewAgent.
    """
    
    def __init__(self, user=None):
        """
        Initialize with optional user for personalization.
        
        Args:
            user: Django User object (optional)
        """
        self.user = user
        self.bus = MessageBus()
        self.coordinator = CoordinatorAgent("learning_coordinator", self.bus)
        
        # Create specialized learning agents
        self.explainer = ExplainerAgent("explainer", self.bus)
        self.quiz_agent = QuizAgent("quiz_master", self.bus)
        self.code_reviewer = CodeReviewAgent("code_reviewer", self.bus)
        
        # Register agents
        self.coordinator.register_agent(self.explainer.id, self.explainer.capabilities)
        self.coordinator.register_agent(self.quiz_agent.id, self.quiz_agent.capabilities)
        self.coordinator.register_agent(self.code_reviewer.id, self.code_reviewer.capabilities)
        
        self.agents = {
            "explainer": self.explainer,
            "quiz": self.quiz_agent,
            "code_review": self.code_reviewer
        }
    
    def get_tutoring_response(self, query: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Get a coordinated tutoring response from multiple agents.
        
        Args:
            query: User's question or request
            context: Additional context (topic, level, code, etc.)
        
        Returns:
            Combined response from relevant agents
        """
        context = context or {}
        topic = context.get("topic", "general")
        query_lower = query.lower()
        
        responses = []
        
        # Determine which agents should respond
        if any(kw in query_lower for kw in ["explain", "what is", "how does", "why", "teach"]):
            exp_result = self.explainer.execute_capability("explain", {
                "topic": topic,
                "level": context.get("level", "intermediate")
            })
            responses.append({"agent": "explainer", "response": exp_result})
        
        if any(kw in query_lower for kw in ["quiz", "test", "practice", "assess"]):
            quiz_result = self.quiz_agent.execute_capability("quiz", {
                "topic": topic,
                "difficulty": context.get("difficulty", "medium"),
                "count": context.get("question_count", 3)
            })
            responses.append({"agent": "quiz", "response": quiz_result})
        
        if any(kw in query_lower for kw in ["code", "review", "debug", "optimize", "fix"]):
            code = context.get("code", "")
            review_result = self.code_reviewer.execute_capability("review", {
                "code": code,
                "language": context.get("language", "python")
            })
            responses.append({"agent": "code_review", "response": review_result})
        
        # If no specific agent matched, use explainer as default
        if not responses:
            exp_result = self.explainer.execute_capability("explain", {"topic": query})
            responses.append({"agent": "explainer", "response": exp_result})
        
        return {
            "status": "success",
            "query": query,
            "agents_consulted": len(responses),
            "responses": responses,
            "combined_response": self._combine_responses(responses),
            "message_count": len(self.bus.message_log)
        }
    
    def _combine_responses(self, responses: List[Dict]) -> str:
        """Combine multiple agent responses into a coherent answer."""
        parts = []
        for resp in responses:
            agent = resp["agent"]
            content = resp["response"]
            
            if agent == "explainer":
                parts.append(content.get("content", ""))
            elif agent == "quiz":
                parts.append(f"I've prepared {len(content.get('questions', []))} practice questions for you.")
            elif agent == "code_review":
                issues = content.get("issues_found", 0)
                parts.append(f"Code review complete. Found {issues} potential improvements.")
        
        return " ".join(parts) if parts else "I'm here to help with your learning!"
    
    def get_agent_status(self) -> Dict[str, Any]:
        """Get status of all learning agents."""
        return {
            "coordinator_id": self.coordinator.id,
            "agents": [
                {
                    "id": agent.id,
                    "type": agent_type,
                    "capabilities": list(agent.capabilities),
                    "status": "available"
                }
                for agent_type, agent in self.agents.items()
            ],
            "total_messages": len(self.bus.message_log)
        }
    
    def request_explanation(self, topic: str, level: str = "intermediate") -> Dict[str, Any]:
        """Request an explanation from the explainer agent."""
        return self.explainer.execute_capability("explain", {"topic": topic, "level": level})
    
    def request_quiz(self, topic: str, count: int = 5, difficulty: str = "medium") -> Dict[str, Any]:
        """Request a quiz from the quiz agent."""
        return self.quiz_agent.execute_capability("quiz", {
            "topic": topic,
            "count": count,
            "difficulty": difficulty
        })
    
    def request_code_review(self, code: str, language: str = "python") -> Dict[str, Any]:
        """Request a code review from the code review agent."""
        return self.code_reviewer.execute_capability("review", {
            "code": code,
            "language": language
        })


# =============================================================================
# PHASE 51: EXPERT CHAIN CODE REVIEW (CODER vs CRITIC DEBATE)
# =============================================================================

class CodeReviewExpertChain:
    """
    Multi-Agent architecture orchestrating two instances of LLMs.
    Iteratively critiques and refines generated code reviews before surfacing them 
    to the student, preventing hallucinations and security oversights.
    """

    @classmethod
    def execute(cls, problem_title: str, problem_description: str, code: str, max_iterations: int = 2) -> Optional[Dict[str, Any]]:
        """
        Runs the dual-agent loop: Coder Agent -> Critic Agent -> Coder Agent (v2).
        """
        import json
        from google import genai
        from google.genai import types
        from apps.ai_engine.ai_client import AIClient, CodeReviewOutput

        client = AIClient.get_client()
        if not client:
            return None

        # --- STEP 1: The Initial Draft (Coder Agent) ---
        draft_prompt = f"""
        You are a senior Software Engineer reviewing a Junior Developer's code.
        Create an initial technical review for the problem '{problem_title}'.
        
        Problem Description:
        {problem_description}
        
        User Code:
        {code}
        """

        try:
            with AIClient.ai_request_latency.labels(model='gemini-2.0-flash', operation='multi_agent_draft').time():
                draft_response = client.models.generate_content(
                    model='gemini-2.0-flash',
                    contents=draft_prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=CodeReviewOutput,
                        temperature=0.2,
                    ),
                )
            
            if not draft_response.text:
                return None
            
            draft_json = json.loads(draft_response.text)
            logger.info("Multi-Agent Chain: Initial draft generated.")

            # --- STEP 2: The Brutal Review (Critic Agent) ---
            critic_prompt = f"""
            You are an elite Security Architect and Principal Engineer.
            Critique the following code review generated by a peer. Your job is to find what they missed.

            Original Problem: {problem_title}
            Original Code: 
            ```
            {code}
            ```

            Peer's Review Draft (JSON format):
            {json.dumps(draft_json, indent=2)}

            Identify:
            1. Did they miss any security vulnerabilities (e.g. injection, OOM vectors)?
            2. Did they miss any Big-O performance bottlenecks?
            3. Are they hallucinating any edge cases?
            4. Be extremely brief, concise, and brutal. If the base code is perfect and the review is accurate, just say "Approved".
            """

            with AIClient.ai_request_latency.labels(model='gemini-2.0-flash', operation='multi_agent_critic').time():
                critic_response = client.models.generate_content(
                    model='gemini-2.0-flash',
                    contents=critic_prompt,
                    config=types.GenerateContentConfig(temperature=0.0)
                )

            critic_feedback = critic_response.text
            logger.info(f"Multi-Agent Chain: Critic Feedback received. Length: {len(critic_feedback)} chars.")

            if "Approved" in critic_feedback and len(critic_feedback) < 20:
                logger.info("Multi-Agent Chain: Critic explicitly approved initial draft.")
                return draft_json

            # --- STEP 3: Final Optimization (Coder Agent v2) ---
            final_prompt = f"""
            You are the senior Software Engineer from earlier. 
            A Principal Architect reviewed your initial code review draft and provided brutal feedback.
            
            Your original draft:
            {json.dumps(draft_json, indent=2)}

            Architect's Feedback:
            {critic_feedback}

            Incorporate their feedback and generate an updated, bullet-proof review adhering to the strict JSON schema.
            """

            with AIClient.ai_request_latency.labels(model='gemini-2.0-flash', operation='multi_agent_final').time():
                final_response = client.models.generate_content(
                    model='gemini-2.0-flash',
                    contents=final_prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=CodeReviewOutput,
                        temperature=0.1,
                    ),
                )
            
            if not final_response.text:
                return draft_json # Fallback to draft
            
            final_json = json.loads(final_response.text)
            logger.info("Multi-Agent Chain: Optimized final review generated.")
            
            AIClient._record_success()
            return final_json

        except Exception as e:
            AIClient._record_failure()
            logger.error(f"Multi-Agent Chain Failed: {str(e)}")
            return None


# =============================================================================
# PHASE 134: AUTONOMOUS AGENTIC WORKFLOWS (LARGE ACTION MODELS)
# =============================================================================

class CourseAutoGenerator:
    """
    Autonomous AI Agent that researches a given topic and generates a
    complete structural curriculum and markdown lesson content, then 
    saves it directly into the database as a new Course.
    """

    @classmethod
    def generate_and_publish_course(cls, topic: str, user_id: int) -> Optional[int]:
        """
        Orchestrates the generation of a course based on a topic.
        Returns the ID of the newly created Course.
        """
        import json
        from django.utils.text import slugify
        from django.db import transaction
        from apps.courses.models import Course, Module, Lesson, Category
        from apps.users.models import User
        from apps.ai_engine.ai_client import AIClient
        from google import genai
        from google.genai import types

        client = AIClient.get_client()
        if not client:
            logger.error("CourseAutoGenerator: AIClient not available.")
            return None

        # Fetch the root "AI Generated" category, create if missing
        cat, _ = Category.objects.get_or_create(
            name="AI Generated",
            defaults={"description": "Autonomously generated by AI agents.", "slug": "ai-generated"}
        )
        
        try:
            author = User.objects.get(id=user_id)
        except User.DoesNotExist:
            logger.error(f"CourseAutoGenerator: User {user_id} not found.")
            return None

        logger.info(f"CourseAutoGenerator: Starting research & generation for topic '{topic}'")

        schema = {
            "type": "OBJECT",
            "properties": {
                "title": {"type": "STRING", "description": "Engaging course title"},
                "short_description": {"type": "STRING", "description": "1 sentence hook"},
                "description": {"type": "STRING", "description": "Full HTML or Markdown course description"},
                "difficulty": {"type": "STRING", "description": "beginner, intermediate, or advanced"},
                "modules": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "module_title": {"type": "STRING"},
                            "lessons": {
                                "type": "ARRAY",
                                "items": {
                                    "type": "OBJECT",
                                    "properties": {
                                        "lesson_title": {"type": "STRING"},
                                        "content_markdown": {"type": "STRING", "description": "Rich markdown tutorial content for the lesson. Min 500 words."}
                                    },
                                    "required": ["lesson_title", "content_markdown"]
                                }
                            }
                        },
                        "required": ["module_title", "lessons"]
                    }
                }
            },
            "required": ["title", "short_description", "description", "difficulty", "modules"]
        }

        agent_prompt = f"""
        You are an elite autonomous instructional designer and domain expert. 
        Your task is to create a complete, high-quality, production-ready course on the topic: '{topic}'.
        
        Requirements:
        1. Title and Description should be engaging and professional.
        2. Create 3 to 5 Modules.
        3. Inside each Module, create 2 to 4 Lessons.
        4. For each Lesson, write extremely comprehensive, high-quality markdown content ('content_markdown'). Assume the role of a senior teacher. Include code snippets, analogies, and detailed explanations.
        
        Output MUST be fully compliant with the requested JSON schema.
        """

        try:
            with AIClient.ai_request_latency.labels(model='gemini-2.0-flash', operation='agent_course_gen').time():
                response = client.models.generate_content(
                    model='gemini-2.0-flash',
                    contents=agent_prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=schema,
                        temperature=0.4,
                    ),
                )
            
            if not response.text:
                logger.error("CourseAutoGenerator: Empty response from AI.")
                return None
                
            course_data = json.loads(response.text)
            
            # Save to Database Transactions
            with transaction.atomic():
                course = Course.objects.create(
                    title=course_data["title"],
                    slug=slugify(course_data["title"]) + "-" + str(uuid.uuid4())[:6],
                    short_description=course_data["short_description"],
                    description=course_data["description"],
                    difficulty=course_data.get("difficulty", "beginner").lower(),
                    instructor=author,
                    category=cat,
                    is_published=True,
                    price=0.00,
                    is_free=True
                )

                module_order = 1
                for mod_data in course_data.get("modules", []):
                    module = Module.objects.create(
                        course=course,
                        title=mod_data["module_title"],
                        order=module_order
                    )
                    module_order += 1

                    lesson_order = 1
                    for less_data in mod_data.get("lessons", []):
                        Lesson.objects.create(
                            module=module,
                            title=less_data["lesson_title"],
                            slug=slugify(less_data["lesson_title"]) + "-" + str(uuid.uuid4())[:6],
                            content_type="text",
                            text_content=less_data["content_markdown"],
                            order=lesson_order
                        )
                        lesson_order += 1

                # Update course aggregates
                course.lessons_count = sum(len(m.get("lessons", [])) for m in course_data.get("modules", []))
                course.save(update_fields=["lessons_count"])
                
            logger.info(f"CourseAutoGenerator: Successfully created course '{course.title}' (ID: {course.id})")
            AIClient._record_success()
            return course.id

        except Exception as e:
            AIClient._record_failure()
            logger.error(f"CourseAutoGenerator Failed: {str(e)}")
            return None


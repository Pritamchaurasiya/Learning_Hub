import json
import logging
from typing import List, Dict, Callable, Any

logger = logging.getLogger(__name__)

class AgentTool:
    """
    Phase 69: Abstraction for tools that the LLM can call.
    """
    def __init__(self, name: str, description: str, func: Callable):
        self.name = name
        self.description = description
        self.func = func
        
    def execute(self, **kwargs) -> str:
        try:
            result = self.func(**kwargs)
            return str(result)
        except Exception as e:
            return f"Error executing tool {self.name}: {str(e)}"

# Define available tools
def get_student_score(student_id: str) -> float:
    # Mock database lookup
    mock_db = {"stu_001": 85.5, "stu_002": 92.0, "stu_003": 45.0}
    return mock_db.get(student_id, 0.0)

def search_course_catalog(query: str) -> str:
    # Mock search
    catalog = {
        "math": ["algebra_101", "calculus_101", "statistics_101"],
        "coding": ["python_101", "machine_learning", "data_structures"]
    }
    for k, v in catalog.items():
        if k in query.lower():
            return f"Found related courses: {', '.join(v)}"
    return "No courses found matching the query."


class ReActAgent:
    """
    Phase 69: Reason + Act (ReAct) LLM Orchestrator.
    
    This agent simulates an LLM orchestration loop using a mock AI provider.
    Instead of just answering directly, the agent is trained to "Reason" 
    about the user's request, choose an "Action" (Tool), observe the "Observation",
    and repeat until a final answer is generated.
    
    Prompt Format:
    Thought: ...
    Action: ToolName
    Action Input: {"arg_name": "value"}
    Observation: ...
    """
    def __init__(self):
        self.tools = {
            "get_student_score": AgentTool(
                name="get_student_score",
                description="Fetches the current grade for a student. Arg: student_id (str)",
                func=get_student_score
            ),
            "search_course_catalog": AgentTool(
                name="search_course_catalog",
                description="Searches the curriculum for courses matching a topic. Arg: query (str)",
                func=search_course_catalog
            )
        }
        
    def _mock_llm_generate(self, prompt: str, history: List[str]) -> str:
        """
        Simulates an LLM response based on the conversation history.
        In production, this would call the Gemini / OpenAI API.
        """
        # A highly simplified, hardcoded mock ReAct trace for demonstration
        if "How is stu_001 doing?" in prompt and len(history) == 0:
            return 'Thought: I need to find the score for student stu_001.\nAction: get_student_score\nAction Input: {"student_id": "stu_001"}'
            
        if "Observation: 85.5" in "\n".join(history):
            return 'Thought: I now have the score. I can answer the user.\nFinal Answer: Student stu_001 currently has a score of 85.5. They are doing quite well.'
            
        if "find math courses" in prompt.lower() and len(history) == 0:
             return 'Thought: I need to search the catalog for math courses.\nAction: search_course_catalog\nAction Input: {"query": "math"}'
             
        if "Observation: Found related courses: algebra_101, calculus_101, statistics_101" in "\n".join(history):
             return 'Thought: I have found the courses requested.\nFinal Answer: I found three math courses for you: algebra_101, calculus_101, and statistics_101.'
             
        # Fallback step
        return "Thought: I am unable to parse this request.\nFinal Answer: I'm sorry, I couldn't fulfill that request with my current tools."

    def run(self, user_query: str, max_iterations: int = 3) -> Dict:
        """
        Executes the ReAct reasoning loop.
        """
        history = []
        current_step = 1
        
        while current_step <= max_iterations:
            # 1. Ask LLM what to do next
            llm_response = self._mock_llm_generate(user_query, history)
            history.append(f"LLM: {llm_response}")
            
            # 2. Check if LLM arrived at Final Answer
            if "Final Answer:" in llm_response:
                answer = llm_response.split("Final Answer:")[1].strip()
                return {
                    "query": user_query,
                    "final_answer": answer,
                    "reasoning_trace": history,
                    "status": "success"
                }
                
            # 3. Parse action and input
            try:
                # Naive parsing for demonstration
                action_line = [line for line in llm_response.split('\n') if line.startswith("Action:")][0]
                input_line = [line for line in llm_response.split('\n') if line.startswith("Action Input:")][0]
                
                tool_name = action_line.replace("Action:", "").strip()
                input_str = input_line.replace("Action Input:", "").strip()
                tool_args = json.loads(input_str)
                
            except Exception as e:
                obs = f"Observation: Parsing error ({str(e)}). Ensure format is correct."
                history.append(obs)
                current_step += 1
                continue
                
            # 4. Execute the tool
            target_tool = self.tools.get(tool_name)
            if not target_tool:
                obs = f"Observation: Tool {tool_name} not found."
            else:
                obs = f"Observation: {target_tool.execute(**tool_args)}"
                
            history.append(obs)
            current_step += 1
            
        return {
            "query": user_query,
            "final_answer": "Agent reached maximum iteration limit without finding an answer.",
            "reasoning_trace": history,
            "status": "timeout"
        }

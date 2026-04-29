# 🤖 AI AGENTS ORCHESTRATION: LANGCHAIN & BEYOND

> [!IMPORTANT]
> The future of AI is not just "Chatbots" but **Agents**—systems that use LLMs as reasoning engines to perform actions.

---

## 1. WHAT ARE AI AGENTS?

An Agent checks:

1.  **Perception**: Input (User query, Environment state).
2.  **Brain (LLM)**: Reasoning (ReAct, Chain of Thought).
3.  **Action**: Tool calling (Search, Database, Calculator).
4.  **Observation**: Result of the tool.
5.  **Loop**: Iterate until goal satisfied.

---

## 2. KEY FRAMEWORKS

### 2.1 LangChain / LangGraph

The most popular Python/JS framework.

- **Chains**: Linear sequence of steps.
- **Agents**: LLM decides the sequence.
- **LangGraph**: Stateful, cyclic graphs for complex multi-agent flows.

### 2.2 AutoGPT / BabyAGI

Autonomous loops that generate their own sub-tasks.

### 2.3 CrewAI

Orchestrates a "crew" of specialized agents (Reviewer, Researcher, Writer) working together.

---

## 3. CORE CONCEPTS

### 3.1 ReAct Pattern (Reasoning + Acting)

Prompt:

```text
Question: What is the weather in Tokyo?
Thought: I need to check the weather API.
Action: WeatherAPI(Tokyo)
Observation: 15°C, Raining.
Thought: The user wants to know the temperature.
Final Answer: It is 15°C and raining in Tokyo.
```

### 3.2 Tools (Function Calling)

Modern LLMs (GPT-4, Gemini 1.5) support native function calling. You define the schema (JSON), the LLM outputs the arguments.

### 3.3 Memory (Context Window vs Vector DB)

- **Short-term**: Context window (limited tokens).
- **Long-term**: Vector Database (Pinecone, ChromaDB, pgvector). RAG (Retrieval Augmented Generation).

---

## 4. MULTI-AGENT ARCHITECTURE

### 4.1 Supervisor Pattern

A "Manager" agent delegates tasks to specialized "Worker" agents (e.g., Coder, Tester, Designer).

### 4.2 Hierarchical Teams

CEO -> CTO -> Senior Dev -> Junior Dev.

---

## 5. BUILDING A SIMPLE AGENT (Pseudocode)

```python
class Agent:
    def __init__(self, llm, tools):
        self.llm = llm
        self.tools = tools

    def run(self, prompt):
        history = [SystemMessage("You are a helpful assistant.")]
        history.append(UserMessage(prompt))

        while True:
            response = self.llm.predict(history)
            if response.is_final_answer:
                return response.content

            # Tool usage
            tool_name = response.tool_call
            tool_output = self.tools[tool_name].run(response.args)

            history.append(ToolMeasurement(tool_output))
```

---

## 6. CHALLENGES

- **Loops**: Agents getting stuck repeating actions.
- **Cost**: Millions of tokens for simple tasks.
- **Latency**: Multiple LLM calls take time.
- **Reliability**: Non-deterministic outputs.

---

## 🎓 EXERCISE

1.  Use `langchain`.
2.  Create a "Web Research Agent".
3.  Tools: `DuckDuckGoSearch`, `Wikipedia`.
4.  Goal: "Research the history of the CAP theorem and write a 1 paragraph summary."

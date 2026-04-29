
import os
import django
import sys
from pathlib import Path

# Setup Django Context
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
sys.path.append(str(BASE_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from apps.ai_engine.tutor_service import TutorService
from apps.ai_engine.vector_service import VectorService
import google.generativeai as genai

# Configuration
GENAI_API_KEY = os.getenv("GENAI_API_KEY")
genai.configure(api_key=GENAI_API_KEY)
JUDGE_MODEL = 'gemini-2.0-flash'

TEST_CASES = [
    {
        "question": "What is the difference between TCP and UDP?",
        "ground_truth": "TCP is connection-oriented and reliable, guaranteeing delivery. UDP is connectionless and faster but unreliable/lossy."
    },
    {
        "question": "Explain consistency in database transactions.",
        "ground_truth": "Consistency ensures the database moves from one valid state to another, adhering to constraints and rules."
    }
]

def evaluate_answer(question, generated_answer, ground_truth):
    """
    Uses LLM-as-a-Judge to score the answer.
    """
    judge_prompt = f"""
    You are an impartial judge. Rate the Generated Answer on a scale of 1 to 5 based on the Ground Truth.
    
    Question: {question}
    Ground Truth: {ground_truth}
    Generated Answer: {generated_answer}
    
    Format: SCORE: <number> | REASON: <text>
    """
    
    model = genai.GenerativeModel(JUDGE_MODEL)
    response = model.generate_content(judge_prompt)
    return response.text.strip()

def run_evaluation():
    print("🚀 Starting RAG Evaluation (LLM-as-a-Judge)...")
    print("-" * 60)
    
    total_score = 0
    count = 0
    
    for case in TEST_CASES:
        q = case['question']
        gt = case['ground_truth']
        
        print(f"🔹 Evaluator: User asks '{q}'")
        
        # 1. Get Answer from RAG System
        # We simulate the service call (TutorService uses RAG internally now)
        try:
            generated_answer = TutorService.get_answer('eval_mode', q)
            # Clip for display
            display_ans = generated_answer[:100].replace('\n', ' ') + "..."
            print(f"   🤖 RAG Answer: {display_ans}")
            
            # 2. Judge
            judgment = evaluate_answer(q, generated_answer, gt)
            print(f"   ⚖️  Judgment: {judgment}")
            
            # Simple parsing for average
            if "SCORE:" in judgment:
                try:
                    score = int(judgment.split("SCORE:")[1].split("|")[0].strip())
                    total_score += score
                    count += 1
                except:
                    pass
                    
        except Exception as e:
            print(f"   ❌ Error: {e}")
            
        print("-" * 60)
        
    if count > 0:
        avg = total_score / count
        print(f"✅ Evaluation Complete. Average RAG Accuracy Score: {avg:.2f}/5.0")
    else:
        print("⚠️ No valid scores parsed.")

if __name__ == "__main__":
    run_evaluation()

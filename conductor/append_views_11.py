# append_views_11.py
views_content = """

# =============================================================================
# PHASE 159-163: ULTIMATE ML AGENTIC ARCHITECTURES (2025)
# =============================================================================

@extend_schema(description="Run Multi-Agent Swarm.")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def run_multi_agent_swarm(request):
    \"\"\"Executes an advanced Multi-Agent Swarm simulation.\"\"\"
    from .multi_agent_swarm import run_swarm_experiment
    try:
        result = run_swarm_experiment()
        return Response({"status": "success", "data": result})
    except Exception as e:
        logger.error(f"Swarm Error: {str(e)}")
        return Response({"status": "error", "message": str(e)}, status=drf_status.HTTP_500_INTERNAL_SERVER_ERROR)

@extend_schema(description="Run GraphRAG Engine.")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def run_graph_rag(request):
    \"\"\"Executes Graph Retrieval-Augmented Generation.\"\"\"
    from .graph_rag import run_graphrag_experiment
    try:
        result = run_graphrag_experiment()
        return Response({"status": "success", "data": result})
    except Exception as e:
        logger.error(f"GraphRAG Error: {str(e)}")
        return Response({"status": "error", "message": str(e)}, status=drf_status.HTTP_500_INTERNAL_SERVER_ERROR)

@extend_schema(description="Run DPO (Direct Preference Optimization).")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def run_dpo(request):
    \"\"\"Executes DPO alignment without a reward model.\"\"\"
    from .dpo_engine import run_dpo_experiment
    try:
        result = run_dpo_experiment()
        return Response({"status": "success", "data": result})
    except Exception as e:
        logger.error(f"DPO Error: {str(e)}")
        return Response({"status": "error", "message": str(e)}, status=drf_status.HTTP_500_INTERNAL_SERVER_ERROR)

@extend_schema(description="Run Liquid Neural Network (LNN).")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def run_lnn(request):
    \"\"\"Executes a continuous-time Liquid Neural Network.\"\"\"
    from .liquid_neural_network import run_lnn_experiment
    try:
        result = run_lnn_experiment()
        return Response({"status": "success", "data": result})
    except Exception as e:
        logger.error(f"LNN Error: {str(e)}")
        return Response({"status": "error", "message": str(e)}, status=drf_status.HTTP_500_INTERNAL_SERVER_ERROR)

@extend_schema(description="Run Jamba Hybrid Architecture.")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def run_jamba(request):
    \"\"\"Executes Jamba (Transformer + Mamba SSM + MoE).\"\"\"
    from .jamba_hybrid import run_jamba_experiment
    try:
        result = run_jamba_experiment()
        return Response({"status": "success", "data": result})
    except Exception as e:
        logger.error(f"Jamba Error: {str(e)}")
        return Response({"status": "error", "message": str(e)}, status=drf_status.HTTP_500_INTERNAL_SERVER_ERROR)
"""

with open(r'c:\Users\shiva\Desktop\windows_app\conductor\apps\ai_engine\views.py', 'a', encoding='utf-8') as f:
    f.write(views_content)

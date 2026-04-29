"""
AI Engine URL configuration.
"""

from django.urls import path
from . import views


urlpatterns = [
    path(
        'recommendations/',
        views.get_recommendations,
        name='ai-recommendations'
    ),
    path(
        'trending/',
        views.get_trending,
        name='ai-trending'
    ),
    path(
        'learning-stats/',
        views.get_learning_stats,
        name='ai-learning-stats'
    ),
    path(
        'popular-categories/',
        views.get_popular_categories,
        name='ai-popular-categories'
    ),
    path(
        'curriculum/',
        views.get_curriculum,
        name='ai-curriculum'
    ),
    path(
        'curriculum/<str:filename>/',
        views.get_module_content,
        name='ai-module-content'
    ),
    path(
        'curriculum/generate/',
        views.generate_curriculum,
        name='ai-curriculum-generate'
    ),

    # Phase 7: Quiz & Progress
    path(
        'quiz/<str:module_slug>/',
        views.get_quiz,
        name='ai-quiz'
    ),
    path(
        'quiz/<str:module_slug>/submit/',
        views.submit_quiz,
        name='ai-quiz-submit'
    ),
    path(
        'progress/',
        views.get_all_progress,
        name='ai-progress'
    ),
    path('tutor/ask/', views.ask_tutor, name='ask_tutor'),
    path('tutor/stream/', views.stream_ask_tutor, name='stream_ask_tutor'),
    path('summarize/', views.summarize_content, name='summarize_content'),
    path('voice/transcribe/', views.transcribe_audio_view, name='voice_transcribe'),
    path('voice/speak/', views.generate_speech, name='voice_speak'),
    path('proctor/analyze/', views.analyze_proctoring, name='proctor_analyze'),
    path('tutor/explain/', views.explain_code, name='explain_code'),
    path('agent/execute/', views.execute_agent_action, name='execute_agent'),
    path('agent/generate-plan/', views.generate_study_plan, name='generate_study_plan'),
    
    # Phase 6: Analytics & Challenges
    path('analytics/', views.get_user_analytics, name='user_analytics'),
    path('analytics/track/', views.track_activity, name='track_activity'),
    path('analytics/heatmap/', views.get_activity_heatmap, name='activity_heatmap'),
    path('challenges/', views.get_challenges, name='challenges'),
    path('challenges/generate-daily/', views.generate_daily_challenge, name='generate_daily_challenge'),
    path('challenges/<int:challenge_id>/join/', views.join_challenge, name='join_challenge'),
    path('challenges/stats/', views.get_challenge_stats, name='challenge_stats'),
    
    # Phase 7: Adaptive Learning Engine
    path('adaptive/skill-assessment/', views.assess_skill, name='skill_assessment'),
    path('adaptive/generate-path/', views.generate_learning_path, name='generate_learning_path'),
    path('adaptive/schedule/', views.get_learning_schedule, name='learning_schedule'),
    path('adaptive/adjust/', views.adjust_learning_path, name='adjust_learning_path'),
    path('adaptive/knowledge-gaps/', views.get_knowledge_gaps, name='knowledge_gaps'),
    path('adaptive/review-items/', views.get_review_items, name='review_items'),
    path('adaptive/ai-recommendations/', views.get_ai_recommendations, name='ai_recommendations'),
    
    # Phase 7: Smart Notifications
    path('notifications/', views.get_notifications, name='notifications'),
    path('notifications/<uuid:notification_id>/read/', views.mark_notification_read, name='mark_notification_read'),
    path('notifications/read-all/', views.mark_all_notifications_read, name='mark_all_notifications_read'),
    path('notifications/<uuid:notification_id>/dismiss/', views.dismiss_notification, name='dismiss_notification'),
    path('notifications/stats/', views.get_notification_stats, name='notification_stats'),
    
    # Phase 34: God Mode AI
    path('world-models/state/', views.get_world_model_state, name='world_model_state'),
    path('causal/graph/', views.get_causal_graph, name='causal_graph'),
    path('causal/intervene/', views.perform_intervention, name='causal_intervention'),
    
    # Phase 7.2: Test-Time Adaptation & Session APIs
    path('session/attempt/', views.record_session_attempt, name='record_session_attempt'),
    path('session/summary/', views.get_session_summary, name='get_session_summary'),
    path('session/end/', views.end_session, name='end_session'),
    path('user-model/', views.get_user_model, name='get_user_model'),
    
    # Phase 8: Knowledge Graph Visualization
    path('knowledge-graph/', views.get_knowledge_graph_visualization, name='knowledge_graph'),
    path('knowledge-graph/learning-path/', views.get_learning_path_api, name='learning_path'),
    path('knowledge-graph/populate/', views.populate_knowledge_graph, name='populate_kg'),
    path('knowledge-graph/prerequisites/<str:concept_id>/', views.get_concept_prerequisites, name='concept_prerequisites'),
    
    # Phase 8: Explainable AI
    path('explain/<int:course_id>/', views.explain_recommendation, name='explain_recommendation'),
    path('explain/prediction/', views.explain_prediction_api, name='explain_prediction'),
    path('explain/text/', views.explain_text_api, name='explain_text'),
    
    # Phase 8: Curriculum-Based Learning
    path('curriculum/next/', views.get_curriculum_next, name='curriculum_next'),
    path('curriculum/update/', views.update_curriculum_progress, name='curriculum_update'),
    path('curriculum/stats/', views.get_curriculum_stats_api, name='curriculum_stats'),
    
    # Phase 8: Knowledge Gaps (Uncertainty-Driven)
    path('gaps/', views.get_knowledge_gaps, name='knowledge_gaps'),
    path('gaps/priorities/', views.get_priority_topics, name='priority_topics'),
    
    # Phase 9: Multi-Agent Tutoring System
    path('agents/tutor/', views.get_multi_agent_tutor, name='multi_agent_tutor'),
    path('agents/status/', views.get_agent_status, name='agent_status'),
    
    # Phase 9: Meta-Learning / Style Adaptation
    path('adapt/style/', views.adapt_user_style, name='adapt_style'),
    path('adapt/preferences/', views.get_user_preferences, name='user_preferences'),
    
    # Phase 9: Continual Learning Memory
    path('memory/consolidate/', views.consolidate_memories, name='consolidate_memories'),
    path('memory/recall/', views.recall_patterns, name='recall_patterns'),
    
    # Phase 9: Self-Improving AI Coach
    path('coach/reflect/', views.coach_reflect, name='coach_reflect'),
    path('coach/insights/', views.get_coach_insights, name='coach_insights'),
    
    # Phase 5: Constitutional AI
    path('safety/moderate/', views.moderate_content, name='moderate_content'),
    path('safety/constitution/', views.get_constitution, name='get_constitution'),
    
    # Phase 5: AI Guardrails
    path('guardrails/check/', views.check_guardrails, name='check_guardrails'),
    path('guardrails/redact/', views.redact_pii, name='redact_pii'),
    
    # Phase 5: Adversarial Security
    path('security/analyze/', views.analyze_security, name='analyze_security'),
    path('security/score/', views.get_security_score, name='get_security_score'),

    # Phase 52: Federated Edge Learning
    path('federated/weights/', views.federated_weights_download, name='federated_weights_download'),
    path('federated/gradient-upload/', views.federated_gradient_upload, name='federated_gradient_upload'),

    # Phase 53: RLHF & Direct Preference Optimization
    path('preferences/submit/', views.submit_human_preference, name='submit_human_preference'),

    # Phase 55: Deep Knowledge Tracing & Generative Content
    path('mastery/', views.get_student_mastery, name='student_mastery'),
    path('generate-quiz/', views.generate_adaptive_quiz, name='generate_adaptive_quiz'),
    path('generate-flashcards/', views.generate_flashcards_view, name='generate_flashcards'),

    # Phase 56: Self-Attention Engagement Predictor & Smart Scheduling
    path('engagement-risk/', views.get_engagement_risk, name='engagement_risk'),
    path('smart-schedule/', views.get_smart_schedule, name='smart_schedule'),
    path('spaced-repetition/', views.get_spaced_repetition, name='spaced_repetition'),

    # Phase 57: Graph Neural Networks & Collaborative Filtering
    path('graph-recommend/', views.get_graph_recommendations, name='graph_recommendations'),

    # Phase 58: Anomaly Detection & AutoML Tuning
    path('anomaly-summary/', views.get_anomaly_summary, name='anomaly_summary'),
    path('automl-tune/', views.run_automl_tuning, name='automl_tuning'),

    # Phase 59: Neural Architecture Search & Ensemble Learning
    path('nas-search/', views.run_architecture_search, name='nas_search'),
    path('ensemble-predict/', views.run_ensemble_prediction, name='ensemble_predict'),

    # Phase 60: Explainable AI & Counterfactual Reasoning
    path('counterfactual/', views.get_counterfactual_explanation, name='counterfactual'),

    # Phase 61: Reinforcement Learning & Multi-Armed Bandits
    path('rl-path/', views.get_rl_learning_path, name='rl_learning_path'),
    path('bandit-optimize/', views.run_bandit_optimization, name='bandit_optimize'),

    # Phase 62: Transformer & Sequence Models
    path('transformer-predict/', views.predict_with_transformer, name='transformer_predict'),
    path('seq2seq-predict/', views.predict_with_seq2seq, name='seq2seq_predict'),

    # Phase 63: Deep Generative Models (VAEs & GANs)
    path('vae-cluster/', views.run_vae_clustering, name='vae_cluster'),
    path('gan-synthesize/', views.run_gan_synthesizer, name='gan_synthesize'),

    # Phase 64: Neuro-Symbolic AI Engine
    path('neuro-symbolic/', views.neuro_symbolic_recommendation, name='neuro_symbolic'),

    # Phase 65 & 66: Self-Supervised Contrastive Learning & Meta-Learning
    path('contrastive-train/', views.run_contrastive_training, name='contrastive_train'),
    path('meta-adapt/', views.run_meta_learning_adaptation, name='meta_adapt'),

    # Phase 67 & 68: Graph Neural Networks & Federated Learning
    path('gnn-knowledge-trace/', views.run_gnn_knowledge_tracing, name='gnn_knowledge_trace'),
    path('federated-round/', views.run_federated_round, name='federated_round'),

    # Phase 69 & 70: LLM Orchestrator & Active Learning
    path('llm-react-agent/', views.run_llm_react_agent, name='llm_react_agent'),
    path('active-learning-query/', views.run_active_learning_query, name='active_learning_query'),

    # Phase 71 & 72: Continual Learning & Knowledge Distillation
    path('continual-learning-ewc/', views.run_continual_learning_ewc, name='continual_learning_ewc'),
    path('knowledge-distillation/', views.run_knowledge_distillation, name='knowledge_distillation'),

    # Phase 73 & 74: Multimodal ML & Differential Privacy
    path('multimodal-fusion/', views.run_multimodal_fusion, name='multimodal_fusion'),
    path('dp-sgd/', views.run_differential_privacy_sgd, name='dp_sgd_multimodal'),

    # Phase 75 & 76: Swarm Intelligence & Mixture of Experts
    path('swarm-intelligence-pso/', views.run_swarm_intelligence_pso, name='swarm_intelligence_pso'),
    path('mixture-of-experts/', views.run_mixture_of_experts, name='mixture_of_experts'),

    # Phase 77 & 78: Neural Architecture Search & Bayesian Optimization
    path('neural-architecture-search/', views.run_neural_architecture_search, name='neural_architecture_search'),
    path('bayesian-optimization/', views.run_bayesian_optimization, name='bayesian_optimization'),

    # Phase 79 & 80: Causal Inference & Diffusion Models
    path('causal-inference/', views.run_causal_inference, name='causal_inference'),
    path('diffusion-generation/', views.run_diffusion_generation, name='diffusion_generation'),

    # Phase 81 & 82: World Models & Neuro-Symbolic
    path('world-model-planning/', views.run_world_model_planning, name='world_model_planning'),
    path('neuro-symbolic-reasoning/', views.run_neuro_symbolic_reasoning, name='neuro_symbolic_reasoning'),

    # Phase 83 & 84: Ensemble Stacking & Curriculum Learning
    path('ensemble-stacking/', views.run_ensemble_stacking, name='ensemble_stacking'),
    path('curriculum-learning/', views.run_curriculum_learning, name='curriculum_learning'),

    # Phase 85 & 86: Contrastive Learning & Graph Attention Networks
    path('contrastive-learning/', views.run_contrastive_learning, name='contrastive_learning'),
    path('graph-attention/', views.run_graph_attention, name='graph_attention'),

    # Phase 87-90: MAML, QML, Hypernetworks, EBMs
    path('meta-learning/', views.run_meta_learning, name='meta_learning'),
    path('quantum-ml-v1/', views.run_quantum_ml, name='quantum_ml_v1'),
    path('hypernetworks/', views.run_hypernetworks, name='hypernetworks'),
    path('energy-based-models/', views.run_ebm_sampling, name='energy_based_models'),

    # Phase 91-95: Extreme Next-Gen Architectures
    path('spiking-nn/', views.run_spiking_nn, name='spiking_nn'),
    path('neural-ode/', views.run_neural_ode, name='neural_ode'),
    path('liquid-networks/', views.run_liquid_network, name='liquid_networks'),
    path('sparse-distributed-memory/', views.run_sdm, name='sparse_distributed_memory'),
    path('capsule-networks/', views.run_capsnet, name='capsule_networks'),

    # Phase 96-100: The Final Tier & AGI Orchestrator
    path('neural-cellular-automata/', views.run_neural_cellular_automata, name='neural_cellular_automata'),
    path('tensor-networks/', views.run_tensor_networks, name='tensor_networks'),
    path('flow-matching/', views.run_flow_matching, name='flow_matching'),
    path('kolmogorov-arnold/', views.run_kolmogorov_arnold, name='kolmogorov_arnold'),
    path('agi-orchestrator/', views.run_agi_orchestrator, name='agi_orchestrator'),
    
    # Phase 101-105: Bioinformatics & Genomic AI
    path('dna-transformer/', views.run_dna_transformer, name='dna_transformer'),
    path('protein-folding/', views.run_protein_folding, name='protein_folding'),
    path('scrna-autoencoder/', views.run_scrna_autoencoder, name='scrna_autoencoder'),
    path('dti-graph/', views.run_dti_graph, name='dti_graph'),
    path('spatial-transcriptomics/', views.run_spatial_transcriptomics, name='spatial_transcriptomics'),
    
    # Phase 106-110: Deep Reinforcement Learning & Continuous Control
    path('rl-ppo/', views.run_rl_ppo, name='rl_ppo'),
    path('rl-sac/', views.run_rl_sac, name='rl_sac'),
    path('rl-maddpg/', views.run_rl_maddpg, name='rl_maddpg'),
    path('rl-her/', views.run_rl_her, name='rl_her'),
    path('rl-irl/', views.run_rl_irl, name='rl_irl'),
    
    # Phase 111-115: Neuromorphic & Bio-Inspired Computing
    path('neuromorphic-lsm/', views.run_neuromorphic_lsm, name='neuromorphic_lsm'),
    path('neuromorphic-htm/', views.run_neuromorphic_htm, name='neuromorphic_htm'),
    path('swarm-aco/', views.run_swarm_aco, name='swarm_aco'),
    path('swarm-pso/', views.run_swarm_pso, name='swarm_pso'),
    path('genetic-algorithm/', views.run_genetic_algorithm, name='genetic_algorithm'),
    
    # Phase 116-120: Advanced Paradigms & Privacy Preserving ML
    path('fl-fedavg/', views.run_fl_fedavg, name='fl_fedavg'),
    path('dp-sgd-v2/', views.run_dp_sgd, name='dp_sgd'),
    path('simclr-engine/', views.run_simclr_engine, name='simclr_engine'),
    path('rl-gail/', views.run_rl_gail, name='rl_gail'),
    path('graph-node2vec/', views.run_graph_node2vec, name='graph_node2vec'),
    
    # Phase 141: Vision AI & Multimodal Assessment
    path('multimodal/evaluate/', views.evaluate_multimodal_assessment_view, name='multimodal_evaluate'),
    
    # Phase 142: Graph Neural Networks & Knowledge Tracing
    path('gnn/curriculum-analysis/', views.run_gnn_curriculum_analysis, name='gnn_curriculum_analysis'),
    
    # Phase 143: RLHF & Preference Alignment
    path('rlhf/preference/', views.submit_rlhf_preference, name='submit_rlhf_preference'),
    path('rlhf/ppo-update/', views.run_ppo_update_sim, name='run_ppo_update_sim'),
    
    # Phase 144-148: Next-Level ML Research Paradigms
    path('moe-router/', views.run_moe_router, name='moe_router'),
    path('transformer-engine/', views.run_transformer_engine, name='transformer_engine'),
    path('mlops-registry/', views.run_mlops_registry, name='mlops_registry'),
    path('raft-engine/', views.run_raft_engine, name='raft_engine'),
    path('bkt-engine/', views.run_bkt_engine, name='bkt_engine'),
    
    # Phase 149-153: Frontier ML 2025 Paradigms
    path('mamba-ssm/', views.run_mamba_ssm, name='mamba_ssm'),
    path('ddpm-engine/', views.run_ddpm_engine, name='ddpm_engine'),
    path('nas-engine/', views.run_nas_engine, name='nas_engine'),
    path('kan-network/', views.run_kan_network, name='kan_network'),
    path('test-time-compute/', views.run_test_time_compute, name='test_time_compute'),
    
    # Phase 154-158: Production ML Engineering
    path('sparse-autoencoder/', views.run_sparse_autoencoder, name='sparse_autoencoder'),
    path('mixture-of-depths/', views.run_mixture_of_depths, name='mixture_of_depths'),
    path('quantization/', views.run_quantization, name='quantization'),
    path('speculative-decoding/', views.run_speculative_decode, name='speculative_decoding'),
    path('synthetic-data/', views.run_synthetic_data, name='synthetic_data'),
    
    # Phase 159-163: Ultimate ML & Agentic Architecture
    path('multi-agent-swarm/', views.run_multi_agent_swarm, name='multi_agent_swarm'),
    path('graphrag/', views.run_graph_rag, name='graphrag_engine'),
    path('dpo-engine/', views.run_dpo, name='dpo_engine'),
    path('liquid-network/', views.run_liquid_network, name='liquid_network'),
    path('jamba-hybrid/', views.run_jamba, name='jamba_hybrid'),

    # Phase 164-168: Quantum AI & Neuromorphic Computing
    path('quantum-ml/', views.run_quantum_ml, name='quantum_ml'),
    path('neuromorphic-snn/', views.run_neuromorphic_snn, name='neuromorphic_snn'),
    path('energy-based-model/', views.run_energy_based_model, name='energy_based_model'),
    path('neurosymbolic-ai/', views.run_neurosymbolic_ai, name='neurosymbolic_ai'),
    path('hyperdimensional-comp/', views.run_hyperdimensional_comp, name='hyperdimensional_comp'),

    # Phase 169-173: Multimodal GenAI & Advanced Reasoning
    path('vla-engine/', views.run_vla_engine, name='vla_engine'),
    path('tree-of-thought/', views.run_tree_of_thought, name='tree_of_thought'),
    path('gaussian-splatting/', views.run_gaussian_splatting, name='gaussian_splatting'),
    path('audio-bridge/', views.run_audio_bridge, name='audio_bridge'),
    path('fim-code-gen/', views.run_fim_code_gen, name='fim_code_gen'),
]

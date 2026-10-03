import math
from typing import Dict, Any, List, Optional
from django.utils import timezone
from .models import ConceptSkill, SkillPrerequisite, UserSkillMastery


class BayesianKnowledgeTracingEngine:
    """
    Production-grade Bayesian Knowledge Tracing (BKT) Engine with
    DAG prerequisite dependency propagation and Next Best Action (NBA) sequencing.
    Based on Corbett & Anderson (1995) latent knowledge tracing models.
    """

    MASTERY_THRESHOLD = 0.85
    UNLOCKED_THRESHOLD = 0.70

    @staticmethod
    def update_knowledge_probability(
        p_prev: float,
        is_correct: bool,
        p_transit: float = 0.20,
        p_guess: float = 0.20,
        p_slip: float = 0.10
    ) -> float:
        """
        Applies standard Corbett & Anderson BKT equations:
        1. Posterior calculation P(L_{t-1} | Obs_t)
        2. Transition learning update P(L_t) = P(L_{t-1} | Obs_t) + (1 - P(L_{t-1} | Obs_t)) * P(T)
        """
        # Clamp prior between 0.001 and 0.999 to prevent numerical instability
        p_prev = max(0.001, min(0.999, p_prev))
        p_transit = max(0.01, min(0.50, p_transit))
        p_guess = max(0.01, min(0.40, p_guess))
        p_slip = max(0.01, min(0.30, p_slip))

        if is_correct:
            p_obs_known = 1.0 - p_slip
            p_obs_unknown = p_guess
        else:
            p_obs_known = p_slip
            p_obs_unknown = 1.0 - p_guess

        p_obs = (p_prev * p_obs_known) + ((1.0 - p_prev) * p_obs_unknown)
        p_posterior = (p_prev * p_obs_known) / max(p_obs, 1e-7)

        # Transition update
        p_next = p_posterior + ((1.0 - p_posterior) * p_transit)
        return round(max(0.01, min(0.99, p_next)), 4)

    @classmethod
    def record_interaction(
        cls,
        user,
        skill_id_or_slug: str,
        is_correct: bool
    ) -> Dict[str, Any]:
        """
        Records a learning attempt, updates student mastery using BKT,
        and cascades prerequisite unlocking across dependent skills in the DAG.
        """
        try:
            skill = ConceptSkill.objects.get(id=skill_id_or_slug)
        except ConceptSkill.DoesNotExist:
            skill = ConceptSkill.objects.get(slug=skill_id_or_slug)

        mastery, created = UserSkillMastery.objects.get_or_create(
            user=user,
            skill=skill,
            defaults={
                'p_mastery': skill.p_init,
                'status': 'IN_PROGRESS',
            }
        )

        p_old = mastery.p_mastery
        p_new = cls.update_knowledge_probability(
            p_prev=p_old,
            is_correct=is_correct,
            p_transit=skill.p_transit,
            p_guess=skill.p_guess,
            p_slip=skill.p_slip,
        )

        mastery.p_mastery = p_new
        mastery.practice_count += 1
        if is_correct:
            mastery.correct_count += 1
            mastery.streak += 1
        else:
            mastery.streak = 0

        # Update status
        if p_new >= cls.MASTERY_THRESHOLD:
            mastery.status = 'MASTERED'
        else:
            mastery.status = 'IN_PROGRESS'

        mastery.last_practiced_at = timezone.now()
        mastery.save()

        # Cascade unlocking to dependent skills
        unlocked_dependents = cls.evaluate_dependent_unlocks(user, skill)

        return {
            'skill_id': skill.id,
            'skill_name': skill.name,
            'previous_probability': p_old,
            'updated_probability': p_new,
            'delta': round(p_new - p_old, 4),
            'status': mastery.status,
            'streak': mastery.streak,
            'practice_count': mastery.practice_count,
            'unlocked_dependents': unlocked_dependents,
        }

    @classmethod
    def evaluate_dependent_unlocks(cls, user, skill: ConceptSkill) -> List[str]:
        """
        Checks all downstream skills that depend on this skill.
        If all hard prerequisites meet their minimum mastery threshold, unlocks the child skill.
        """
        unlocked_skill_names = []
        dependents = SkillPrerequisite.objects.filter(prerequisite=skill).select_related('skill')

        for dep in dependents:
            child = dep.skill
            child_mastery, _ = UserSkillMastery.objects.get_or_create(
                user=user,
                skill=child,
                defaults={'p_mastery': child.p_init, 'status': 'LOCKED'}
            )

            if child_mastery.status == 'LOCKED':
                # Check all prerequisites for child
                prereqs = SkillPrerequisite.objects.filter(skill=child, strength='HARD').select_related('prerequisite')
                all_satisfied = True
                for p in prereqs:
                    prereq_mastery = UserSkillMastery.objects.filter(
                        user=user,
                        skill=p.prerequisite
                    ).first()
                    current_prob = prereq_mastery.p_mastery if prereq_mastery else p.prerequisite.p_init
                    if current_prob < p.minimum_mastery:
                        all_satisfied = False
                        break

                if all_satisfied:
                    child_mastery.status = 'UNLOCKED'
                    child_mastery.save(update_fields=['status'])
                    unlocked_skill_names.append(child.name)

        return unlocked_skill_names

    @classmethod
    def get_skill_dag(cls, user=None) -> Dict[str, Any]:
        """
        Generates the full curriculum Knowledge Graph DAG with student mastery and unlocking states.
        """
        skills = list(ConceptSkill.objects.all().order_by('level', 'order'))
        if not skills:
            cls.seed_default_curriculum()
            skills = list(ConceptSkill.objects.all().order_by('level', 'order'))

        prereqs = list(SkillPrerequisite.objects.all().select_related('skill', 'prerequisite'))

        # Fetch user masteries if authenticated
        mastery_map = {}
        if user and user.is_authenticated:
            user_records = UserSkillMastery.objects.filter(user=user).select_related('skill')
            for rec in user_records:
                mastery_map[rec.skill_id] = rec

        nodes = []
        mastered_count = 0

        for skill in skills:
            rec = mastery_map.get(skill.id)
            if rec:
                p_val = rec.p_mastery
                status = rec.status
            else:
                # Skill has no user interaction yet. Check if root (level == 0)
                p_val = skill.p_init
                has_prereqs = any(p.skill_id == skill.id for p in prereqs)
                status = 'UNLOCKED' if not has_prereqs else 'LOCKED'

            if status == 'MASTERED':
                mastered_count += 1

            parent_ids = [p.prerequisite_id for p in prereqs if p.skill_id == skill.id]

            nodes.append({
                'id': skill.id,
                'name': skill.name,
                'slug': skill.slug,
                'category': skill.category,
                'description': skill.description,
                'level': skill.level,
                'order': skill.order,
                'probability_mastery': round(p_val, 4),
                'status': status,
                'prerequisite_ids': parent_ids,
                'is_recommended': False,
            })

        edges = [
            {
                'id': f"edge-{p.prerequisite_id}-{p.skill_id}",
                'from': p.prerequisite_id,
                'to': p.skill_id,
                'strength': p.strength,
                'minimum_mastery': p.minimum_mastery,
            }
            for p in prereqs
        ]

        # Recommendation selection (Zone of Proximal Development)
        recommended_id = None
        candidates = [n for n in nodes if n['status'] in ('UNLOCKED', 'IN_PROGRESS')]
        if candidates:
            # Sort by level ascending, then probability ascending (ready to learn, room to grow)
            candidates.sort(key=lambda x: (x['level'], x['probability_mastery']))
            recommended_id = candidates[0]['id']
            candidates[0]['is_recommended'] = True

        total_nodes = len(nodes)
        progress_pct = round((mastered_count / total_nodes * 100), 1) if total_nodes > 0 else 0.0

        return {
            'nodes': nodes,
            'edges': edges,
            'recommended_concept_id': recommended_id,
            'total_skills': total_nodes,
            'mastered_skills': mastered_count,
            'overall_progress_percentage': progress_pct,
        }

    @classmethod
    def seed_default_curriculum(cls):
        """
        Bootstrap the Core DSA & Systems curriculum DAG with foundational concepts.
        """
        curriculum = [
            # Level 0 (Foundations - Unlocked by default)
            {"id": "skill-arrays", "name": "Arrays & Dynamic Sizing", "slug": "arrays-dynamic-sizing", "category": "DSA", "level": 0, "order": 1, "description": "Contiguous memory layout, cache locality, and amortized $O(1)$ push back."},
            {"id": "skill-recursion", "name": "Recursion & Call Stack", "slug": "recursion-call-stack", "category": "DSA", "level": 0, "order": 2, "description": "Base cases, call stack unwinding, activation records, and recurrence relations."},
            {"id": "skill-bit-manip", "name": "Bit Manipulation", "slug": "bit-manipulation", "category": "DSA", "level": 0, "order": 3, "description": "Bitwise AND, OR, XOR, mask shifts, and power-of-two invariants."},

            # Level 1 (Intermediate)
            {"id": "skill-binary-search", "name": "Binary Search", "slug": "binary-search", "category": "DSA", "level": 1, "order": 1, "description": "Monotonic search space reduction, lower bound, and upper bound."},
            {"id": "skill-two-pointers", "name": "Two Pointers & Sliding Window", "slug": "two-pointers-sliding-window", "category": "DSA", "level": 1, "order": 2, "description": "Opposite ends, fast/slow runners, and dynamic window expansion/shrinkage."},
            {"id": "skill-trees-traversal", "name": "Binary Trees & Traversals", "slug": "binary-trees-traversals", "category": "DSA", "level": 1, "order": 3, "description": "In-order, pre-order, post-order, and level-order BFS traversal."},

            # Level 2 (Advanced)
            {"id": "skill-dp-foundations", "name": "Dynamic Programming (1D / 2D)", "slug": "dp-foundations", "category": "DSA", "level": 2, "order": 1, "description": "Optimal substructure, overlapping subproblems, memoization vs tabulation."},
            {"id": "skill-graphs-shortest-path", "name": "Graph Shortest Path (Dijkstra / BFS)", "slug": "graph-shortest-path", "category": "DSA", "level": 2, "order": 2, "description": "Adjacency representation, priority queue relaxation, and greedy shortest paths."},
            {"id": "skill-trie", "name": "Trie & Prefix Trees", "slug": "trie-prefix-trees", "category": "DSA", "level": 2, "order": 3, "description": "Prefix-based retrieval, character branching, and string dictionary search."},
        ]

        for item in curriculum:
            ConceptSkill.objects.get_or_create(
                id=item["id"],
                defaults={
                    "name": item["name"],
                    "slug": item["slug"],
                    "category": item["category"],
                    "level": item["level"],
                    "order": item["order"],
                    "description": item["description"],
                }
            )

        # Prerequisites: parent -> child
        prereq_edges = [
            ("skill-arrays", "skill-binary-search"),
            ("skill-arrays", "skill-two-pointers"),
            ("skill-recursion", "skill-trees-traversal"),
            ("skill-recursion", "skill-dp-foundations"),
            ("skill-trees-traversal", "skill-graphs-shortest-path"),
            ("skill-trees-traversal", "skill-trie"),
        ]

        for p_id, c_id in prereq_edges:
            try:
                parent = ConceptSkill.objects.get(id=p_id)
                child = ConceptSkill.objects.get(id=c_id)
                SkillPrerequisite.objects.get_or_create(
                    skill=child,
                    prerequisite=parent,
                    defaults={"strength": "HARD", "minimum_mastery": 0.70}
                )
            except ConceptSkill.DoesNotExist:
                continue

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.tests_engine.models import ConceptSkill, SkillPrerequisite, UserSkillMastery
from apps.tests_engine.bkt_engine import BayesianKnowledgeTracingEngine

User = get_user_model()


@pytest.fixture
def auth_user():
    user = User.objects.create_user(
        email='bkt_student@example.com',
        username='bkt_student',
        password='SecurePassword123!',
        first_name='BKT',
        last_name='Learner'
    )
    return user


@pytest.fixture
def api_client(auth_user):
    client = APIClient()
    client.force_authenticate(user=auth_user)
    return client


@pytest.mark.django_db
class TestBayesianKnowledgeTracingMath:
    def test_bkt_correct_answer_increases_probability(self):
        """A correct answer should sharply increase the posterior probability of knowing the skill."""
        p_init = 0.20
        p_next = BayesianKnowledgeTracingEngine.update_knowledge_probability(
            p_prev=p_init,
            is_correct=True,
            p_transit=0.20,
            p_guess=0.20,
            p_slip=0.10
        )
        assert p_next > p_init
        assert 0.40 <= p_next <= 0.70

    def test_bkt_incorrect_answer_decreases_probability(self):
        """An incorrect answer should depress the posterior probability."""
        p_init = 0.70
        p_next = BayesianKnowledgeTracingEngine.update_knowledge_probability(
            p_prev=p_init,
            is_correct=False,
            p_transit=0.15,
            p_guess=0.20,
            p_slip=0.10
        )
        assert p_next < p_init
        assert 0.20 <= p_next <= 0.45

    def test_bkt_streak_crosses_mastery_threshold(self):
        """Repeated correct answers converge toward mastery threshold >= 0.85."""
        p = 0.15
        for _ in range(5):
            p = BayesianKnowledgeTracingEngine.update_knowledge_probability(p, is_correct=True)

        assert p >= BayesianKnowledgeTracingEngine.MASTERY_THRESHOLD


@pytest.mark.django_db
class TestSkillDAGPrerequisites:
    def test_dag_dependent_unlocking(self, auth_user):
        """Mastering parent prerequisite unlocks downstream dependent skills."""
        parent = ConceptSkill.objects.create(
            id="skill-test-arrays",
            name="Test Arrays",
            slug="test-arrays",
            level=0,
            p_init=0.20,
            p_transit=0.30
        )
        child = ConceptSkill.objects.create(
            id="skill-test-sliding-window",
            name="Test Sliding Window",
            slug="test-sliding-window",
            level=1,
            p_init=0.10
        )
        SkillPrerequisite.objects.create(
            skill=child,
            prerequisite=parent,
            strength='HARD',
            minimum_mastery=0.70
        )

        # Initially child should be LOCKED
        dag_initial = BayesianKnowledgeTracingEngine.get_skill_dag(user=auth_user)
        child_node = next(n for n in dag_initial['nodes'] if n['id'] == child.id)
        assert child_node['status'] == 'LOCKED'

        # User practices parent with repeated success
        for _ in range(3):
            BayesianKnowledgeTracingEngine.record_interaction(auth_user, parent.id, is_correct=True)

        # Child should now be UNLOCKED
        child_mastery = UserSkillMastery.objects.get(user=auth_user, skill=child)
        assert child_mastery.status == 'UNLOCKED'


@pytest.mark.django_db
class TestSkillEndpoints:
    def test_get_skill_graph(self, api_client):
        response = api_client.get('/api/v1/skills/graph')
        assert response.status_code == 200
        data = response.json()['data']
        assert 'nodes' in data
        assert 'edges' in data
        assert len(data['nodes']) >= 3
        assert 'overall_progress_percentage' in data

    def test_record_skill_interaction(self, api_client, auth_user):
        skill = ConceptSkill.objects.create(
            id="skill-test-recursion",
            name="Test Recursion",
            slug="test-recursion",
            level=0,
            p_init=0.20
        )
        payload = {
            'skill_id': skill.id,
            'is_correct': True,
        }
        response = api_client.post('/api/v1/skills/interaction', data=payload, format='json')
        assert response.status_code == 200
        data = response.json()['data']
        assert data['skill_id'] == skill.id
        assert data['updated_probability'] > data['previous_probability']
        assert data['streak'] == 1
        assert data['practice_count'] == 1

    def test_get_next_best_action(self, api_client):
        response = api_client.get('/api/v1/skills/next-action')
        assert response.status_code == 200
        data = response.json()['data']
        assert 'recommended_concept' in data
        assert 'overall_progress_percentage' in data

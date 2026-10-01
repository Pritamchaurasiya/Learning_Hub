from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.users.models import User, Profile
from apps.courses.models import Course, Chapter, Lesson
from apps.problems.models import Problem, TestCase
from apps.tests_engine.models import Test, Question, Option
from apps.gamification.models import Badge
from apps.ecommerce.models import Coupon, Contest
from apps.social.models import Discussion, Comment, LiveSession, Mentor

class Command(BaseCommand):
    help = 'Seeds initial rich production data for LearningHub platform'

    def handle(self, *args, **options):
        self.stdout.write('Seeding LearningHub data...')

        # 1. Users
        admin, _ = User.objects.get_or_create(
            email='admin@learninghub.app',
            defaults={
                'username': 'SuperAdmin',
                'role': 'SUPERADMIN',
                'is_staff': True,
                'is_superuser': True,
                'avatar': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                'xp': 1500,
                'level': 10,
                'streak': 25,
            }
        )
        if not admin.has_usable_password():
            admin.set_password('Admin@12345')
            admin.save()
        Profile.objects.get_or_create(user=admin, defaults={'headline': 'Platform Lead & Architect'})

        student, _ = User.objects.get_or_create(
            email='student@learninghub.app',
            defaults={
                'username': 'Aarav Sharma',
                'role': 'STUDENT',
                'avatar': 'https://api.dicebear.com/7.x/initials/svg?seed=Aarav',
                'xp': 650,
                'level': 4,
                'streak': 12,
            }
        )
        if not student.has_usable_password():
            student.set_password('Student@12345')
            student.save()
        Profile.objects.get_or_create(
            user=student,
            defaults={
                'headline': 'Aspiring IIT Bombay Computer Science Scholar',
                'target_exam': 'JEE Advanced & Codeforces Grandmaster',
                'college_target': 'IIT Bombay'
            }
        )

        instructor, _ = User.objects.get_or_create(
            email='instructor@learninghub.app',
            defaults={
                'username': 'Dr. Arjun Rao',
                'role': 'INSTRUCTOR',
                'avatar': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
                'xp': 3200,
                'level': 20,
            }
        )
        if not instructor.has_usable_password():
            instructor.set_password('Instructor@12345')
            instructor.save()
        Profile.objects.get_or_create(user=instructor, defaults={'headline': 'Ex-IIT Bombay Faculty & FAANG Staff Engineer'})

        # 2. Courses
        c1, _ = Course.objects.get_or_create(
            id='crs-dsa-101',
            defaults={
                'title': 'Advanced Data Structures & Algorithms Mastery',
                'slug': 'advanced-dsa-mastery',
                'description': 'Master Dynamic Programming, Graph Theory, Trie trees, and advanced algorithm paradigms with over 200 real-world practice problems.',
                'thumbnail_url': 'https://images.unsplash.com/photo-1516116211227-bbc13c639649?w=600&h=400&fit=crop',
                'instructor': instructor,
                'instructor_name': 'Dr. Arjun Rao (IIT Bombay)',
                'category': 'DSA',
                'level': 'Advanced',
                'price': 49.00,
                'original_price': 99.00,
                'rating': 4.9,
                'review_count': 340,
                'student_count': 2850,
                'duration_hours': 60,
            }
        )
        ch1, _ = Chapter.objects.get_or_create(id='chp-dsa-1', course=c1, defaults={'title': '1. Advanced Dynamic Programming', 'order': 1})
        Lesson.objects.get_or_create(
            id='lsn-dsa-1',
            chapter=ch1,
            defaults={
                'title': 'State Compression & Bitmask DP',
                'content': '# State Compression & Bitmask DP\n\nBitmask dynamic programming allows representing subsets of $N \\le 20$ elements efficiently using integer binary representations.',
                'video_url': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                'duration_minutes': 35,
                'order': 1,
                'is_free_preview': True
            }
        )

        c2, _ = Course.objects.get_or_create(
            id='crs-jee-201',
            defaults={
                'title': 'JEE Advanced Physics & Mathematics Distinction Track',
                'slug': 'jee-advanced-distinction-track',
                'description': 'Comprehensive problem-solving masterclass covering Electrodynamics, Thermodynamics, Calculus, and Coordinate Geometry with AIR top-100 strategies.',
                'thumbnail_url': 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&h=400&fit=crop',
                'instructor': instructor,
                'instructor_name': 'Dr. Arjun Rao',
                'category': 'JEE',
                'level': 'Advanced',
                'price': 59.00,
                'original_price': 120.00,
                'rating': 4.95,
                'review_count': 512,
                'student_count': 4200,
                'duration_hours': 85,
            }
        )

        # 3. Problems
        p1, _ = Problem.objects.get_or_create(
            id='prob-two-sum',
            defaults={
                'title': 'Two Sum Problem',
                'slug': 'two-sum-problem',
                'description': 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\n### Example 1:\n```\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: Because nums[0] + nums[1] == 9, we return [0, 1].\n```',
                'difficulty': 'Easy',
                'category': 'Arrays',
                'acceptance_rate': 78.4,
                'submissions_count': 14820,
                'hints': ['Can you use a Hash Map to find the complement in O(1) time?', 'complement = target - nums[i]'],
                'starter_code': {
                    'python': 'def two_sum(nums, target):\n    # Write your solution here\n    seen = {}\n    for i, n in enumerate(nums):\n        comp = target - n\n        if comp in seen:\n            return [seen[comp], i]\n        seen[n] = i\n    return []\n\nif __name__ == "__main__":\n    print(two_sum([2, 7, 11, 15], 9))\n',
                    'javascript': 'function twoSum(nums, target) {\n    const map = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        const comp = target - nums[i];\n        if (map.has(comp)) return [map.get(comp), i];\n        map.set(nums[i], i);\n    }\n    return [];\n}\nconsole.log(twoSum([2, 7, 11, 15], 9));\n'
                }
            }
        )
        TestCase.objects.get_or_create(problem=p1, order=1, defaults={'input_data': '', 'expected_output': '[0, 1]', 'is_hidden': False})

        p2, _ = Problem.objects.get_or_create(
            id='prob-lru-cache',
            defaults={
                'title': 'LRU Cache Design',
                'slug': 'lru-cache-design',
                'description': 'Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.\n\nImplement the `LRUCache` class with `get(key)` and `put(key, value)` in $O(1)$ average time complexity.',
                'difficulty': 'Medium',
                'category': 'System Design',
                'acceptance_rate': 54.2,
                'submissions_count': 9450,
                'hints': ['Use a doubly linked list combined with a hash table.'],
                'starter_code': {
                    'python': 'class LRUCache:\n    def __init__(self, capacity: int):\n        self.capacity = capacity\n\n    def get(self, key: int) -> int:\n        return -1\n\n    def put(self, key: int, value: int) -> None:\n        pass\n\nprint("LRU Cache Ready")\n'
                }
            }
        )
        TestCase.objects.get_or_create(problem=p2, order=1, defaults={'input_data': '', 'expected_output': 'LRU Cache Ready', 'is_hidden': False})

        # 4. Tests
        t1, _ = Test.objects.get_or_create(
            id='test-dsa-eval-1',
            defaults={
                'title': 'Weekly Data Structures & Algorithms Sprint #1',
                'slug': 'weekly-dsa-sprint-1',
                'description': 'Diagnostic 60-minute test evaluating Arrays, Dynamic Programming, Graphs, and Hash Tables with IRT calibrated scoring.',
                'category': 'DSA',
                'duration_minutes': 60,
                'total_marks': 100.0,
                'passing_marks': 40.0,
                'negative_marking': True,
                'negative_mark_value': 1.0,
                'is_adaptive': True,
            }
        )

        q1, _ = Question.objects.get_or_create(
            id='q-dsa-1',
            test=t1,
            defaults={
                'prompt': 'What is the worst-case time complexity of searching an element in a Balanced Binary Search Tree (AVL / Red-Black Tree) with $N$ nodes?',
                'question_type': 'MCQ',
                'topic': 'Trees & BST',
                'difficulty': -0.5,
                'discrimination': 1.2,
                'marks': 4.0,
                'negative_marks': 1.0,
                'explanation': 'In a self-balancing BST, height is strictly bounded by $O(\\log N)$, guaranteeing $O(\\log N)$ worst-case search.',
                'order': 1,
            }
        )
        Option.objects.get_or_create(id='opt-dsa-1-1', question=q1, defaults={'text': 'O(1)', 'is_correct': False, 'order': 1})
        Option.objects.get_or_create(id='opt-dsa-1-2', question=q1, defaults={'text': 'O(log N)', 'is_correct': True, 'order': 2})
        Option.objects.get_or_create(id='opt-dsa-1-3', question=q1, defaults={'text': 'O(N)', 'is_correct': False, 'order': 3})
        Option.objects.get_or_create(id='opt-dsa-1-4', question=q1, defaults={'text': 'O(N log N)', 'is_correct': False, 'order': 4})

        q2, _ = Question.objects.get_or_create(
            id='q-dsa-2',
            test=t1,
            defaults={
                'prompt': 'Which algorithm finds Single Source Shortest Paths in a directed graph with non-negative edge weights in $O((V + E) \\log V)$ time?',
                'question_type': 'MCQ',
                'topic': 'Graphs',
                'difficulty': 0.2,
                'discrimination': 1.4,
                'marks': 4.0,
                'negative_marks': 1.0,
                'explanation': "Dijkstra's algorithm with a binary min-heap / priority queue achieves $O((V+E) \\log V)$ time.",
                'order': 2,
            }
        )
        Option.objects.get_or_create(id='opt-dsa-2-1', question=q2, defaults={'text': "Dijkstra's Algorithm", 'is_correct': True, 'order': 1})
        Option.objects.get_or_create(id='opt-dsa-2-2', question=q2, defaults={'text': 'Bellman-Ford Algorithm', 'is_correct': False, 'order': 2})
        Option.objects.get_or_create(id='opt-dsa-2-3', question=q2, defaults={'text': 'Floyd-Warshall Algorithm', 'is_correct': False, 'order': 3})
        Option.objects.get_or_create(id='opt-dsa-2-4', question=q2, defaults={'text': 'Kruskal Algorithm', 'is_correct': False, 'order': 4})

        # 5. Badges
        Badge.objects.get_or_create(
            id='streak_7',
            defaults={
                'title': '7-Day Consistent Streak',
                'description': 'Maintained an unbroken study streak for 7 consecutive days.',
                'icon': 'Flame',
                'category': 'STREAK',
                'xp_bonus': 150,
                'requirement': 7
            }
        )
        Badge.objects.get_or_create(
            id='dsa_master',
            defaults={
                'title': 'Algorithm Arena Master',
                'description': 'Solved 25+ advanced algorithmic problems with Accepted status.',
                'icon': 'Zap',
                'category': 'MASTERY',
                'xp_bonus': 300,
                'requirement': 25
            }
        )
        Badge.objects.get_or_create(
            id='first_test_passed',
            defaults={
                'title': 'First Test Distinction',
                'description': 'Scored above passing marks on your first full-length test.',
                'icon': 'Award',
                'category': 'MASTERY',
                'xp_bonus': 100,
                'requirement': 1
            }
        )

        # 6. Coupons & Contests
        Coupon.objects.get_or_create(code='LEARN50', defaults={'discount_percent': 50, 'is_active': True})
        Coupon.objects.get_or_create(code='WELCOME20', defaults={'discount_percent': 20, 'is_active': True})

        Contest.objects.get_or_create(
            contest_id='contest-2026-w1',
            defaults={
                'title': 'Weekly Grand Algorithm Arena #42',
                'description': '4 competitive algorithmic problems ranging from prefix sums to dynamic tree rerooting. Open to all students!',
                'start_time': timezone.now() - timedelta(hours=1),
                'end_time': timezone.now() + timedelta(hours=2),
                'duration': 120,
                'status': 'active',
                'participants': 1248,
                'problem_count': 4,
                'prize': '₹50,000 Prize Pool + Pro Badges',
                'difficulty': 'medium'
            }
        )

        # 7. Mentors & Live Sessions
        Mentor.objects.get_or_create(
            id='mnt-1',
            defaults={
                'name': 'Dr. Arjun Rao',
                'title': 'Staff Engineer at Google & IIT Bombay Gold Medalist',
                'avatar': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
                'specialization': 'DSA, System Design, JEE Advanced Mentorship',
                'rating': 4.98,
                'hourly_rate': 49.00,
                'available_slots': ['Today 4:00 PM', 'Tomorrow 10:00 AM', 'Saturday 2:00 PM']
            }
        )

        LiveSession.objects.get_or_create(
            id='live-1',
            defaults={
                'title': 'Live Masterclass: Graph Rerooting & DP on Trees',
                'instructor_name': 'Dr. Arjun Rao',
                'instructor_avatar': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
                'topic': 'Advanced Tree Algorithms',
                'start_time': timezone.now() + timedelta(hours=3),
                'duration_minutes': 90,
                'status': 'upcoming',
                'attendees_count': 142
            }
        )

        # 8. Discussions
        Discussion.objects.get_or_create(
            id='disc-1',
            defaults={
                'user': student,
                'title': 'How to optimize Bitmask DP transitions for TSP with N=22?',
                'content': 'I am encountering memory limit issues when storing the full 2D table `dp[mask][u]`. Has anyone experimented with iterative rolling arrays or branch-and-bound pruning?',
                'category': 'DSA',
                'tags': ['Dynamic Programming', 'Bitmask', 'Optimization'],
                'upvotes': 14,
                'views': 230,
                'is_pinned': True
            }
        )

        self.stdout.write(self.style.SUCCESS('Successfully seeded LearningHub database with complete production data!'))

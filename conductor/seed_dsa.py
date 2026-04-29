import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.dsa.models import Problem, TestCase

def seed_dsa():
    problem, created = Problem.objects.get_or_create(
        slug='two-sum',
        defaults={
            'title': 'Two Sum',
            'description': 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.',
            'difficulty': 'EASY',
            'points': 10,
            'constraints': 'Time: 1s, Memory: 256MB',
            'input_format': 'nums: List[int], target: int',
            'output_format': 'List[int]'
        }
    )
    
    if created:
        # Example Test Case (Visible)
        TestCase.objects.create(
            problem=problem,
            input_data='nums=[2,7,11,15], target=9',
            expected_output='[0,1]',
            is_hidden=False,
            explanation='nums[0] + nums[1] = 2 + 7 = 9'
        )
        # Hidden Test Case
        TestCase.objects.create(
            problem=problem,
            input_data='nums=[3,2,4], target=6',
            expected_output='[1,2]',
            is_hidden=True
        )
        print("DSA seeded successfully!")
    else:
        print("Two Sum problem already exists.")

if __name__ == '__main__':
    seed_dsa()

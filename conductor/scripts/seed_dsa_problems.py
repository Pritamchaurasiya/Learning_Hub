import os
import django

# Setup Django Environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.dsa.models import DSACategory, Problem, TestCase, DifficultyLevel

def seed_dsa():
    print("🌱 Seeding DSA Problems...")

    # 1. Create Categories
    arrays, _ = DSACategory.objects.get_or_create(
        name="Arrays & Hashing", 
        slug="arrays-hashing", 
        defaults={"description": "Core array problems and hash map patterns.", "icon": "list"}
    )
    two_pointers, _ = DSACategory.objects.get_or_create(
        name="Two Pointers", 
        slug="two-pointers", 
        defaults={"description": "Problems solvable with multiple pointers.", "icon": "compare_arrows"}
    )
    
    # 2. Create Problems
    
    # Problem 1: Two Sum
    p1, created = Problem.objects.get_or_create(
        slug="two-sum",
        defaults={
            "title": "Two Sum",
            "category": arrays,
            "difficulty": DifficultyLevel.EASY,
            "description": "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
            "function_signature": "def twoSum(nums: List[int], target: int) -> List[int]:",
            "starter_code": "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        pass",
            "order": 1
        }
    )
    if created:
        TestCase.objects.create(problem=p1, input_data='{"nums": [2,7,11,15], "target": 9}', expected_output='[0, 1]', is_hidden=False)
        TestCase.objects.create(problem=p1, input_data='{"nums": [3,2,4], "target": 6}', expected_output='[1, 2]', is_hidden=False)
        TestCase.objects.create(problem=p1, input_data='{"nums": [3,3], "target": 6}', expected_output='[0, 1]', is_hidden=True)
        print("   -> Created 'Two Sum'")

    # Problem 2: Contains Duplicate
    p2, created = Problem.objects.get_or_create(
        slug="contains-duplicate",
        defaults={
            "title": "Contains Duplicate",
            "category": arrays,
            "difficulty": DifficultyLevel.EASY,
            "description": "Given an integer array `nums`, return `true` if any value appears at least twice in the array, and return `false` if every element is distinct.",
            "function_signature": "def containsDuplicate(nums: List[int]) -> bool:",
            "starter_code": "class Solution:\n    def containsDuplicate(self, nums: List[int]) -> bool:\n        pass",
            "order": 2
        }
    )
    if created:
        TestCase.objects.create(problem=p2, input_data='{"nums": [1,2,3,1]}', expected_output='true', is_hidden=False)
        TestCase.objects.create(problem=p2, input_data='{"nums": [1,2,3,4]}', expected_output='false', is_hidden=False)
        print("   -> Created 'Contains Duplicate'")

    # Problem 3: Valid Palindrome
    p3, created = Problem.objects.get_or_create(
        slug="valid-palindrome",
        defaults={
            "title": "Valid Palindrome",
            "category": two_pointers,
            "difficulty": DifficultyLevel.EASY,
            "description": "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Return `true` if it is a palindrome, or `false` otherwise.",
            "function_signature": "def isPalindrome(s: str) -> bool:",
            "starter_code": "class Solution:\n    def isPalindrome(self, s: str) -> bool:\n        pass",
            "order": 1
        }
    )
    if created:
        TestCase.objects.create(problem=p3, input_data='{"s": "A man, a plan, a canal: Panama"}', expected_output='true', is_hidden=False)
        TestCase.objects.create(problem=p3, input_data='{"s": "race a car"}', expected_output='false', is_hidden=False)
        print("   -> Created 'Valid Palindrome'")

    print("✅ Seed Complete!")

if __name__ == '__main__':
    seed_dsa()

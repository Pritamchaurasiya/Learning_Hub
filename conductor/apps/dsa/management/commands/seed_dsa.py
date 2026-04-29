from django.core.management.base import BaseCommand
from django.db import transaction
from apps.dsa.models import Problem, Tag, TestCase

class Command(BaseCommand):
    help = 'Seeds the database with high-quality DSA problems (Grind75 style)'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding DSA problems...')
        
        try:
            with transaction.atomic():
                self._seed_tags()
                self._seed_problems()
            self.stdout.write(self.style.SUCCESS('Successfully seeded DSA problems!'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error seeding data: {e}'))

    def _seed_tags(self):
        tags = ['Array', 'String', 'Hash Table', 'Two Pointers', 'Stack', 'Linked List', 'Binary Tree']
        for name in tags:
            Tag.objects.get_or_create(name=name, defaults={'slug': name.lower().replace(' ', '-')})

    def _seed_problems(self):
        # Problem 1: Two Sum
        p1, created = Problem.objects.update_or_create(
            slug='two-sum',
            defaults={
                'title': 'Two Sum',
                'difficulty': 'EASY',
                'points': 10,
                'description': """
Given an array of integers `nums` and an integer `target`, return *indices of the two numbers such that they add up to `target`*.

You may assume that each input would have **exactly one solution**, and you may not use the *same* element twice.

You can return the answer in any order.

### Example 1:
```
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
```

### Example 2:
```
Input: nums = [3,2,4], target = 6
Output: [1,2]
```

### Constraints:
* `2 <= nums.length <= 10^4`
* `-10^9 <= nums[i] <= 10^9`
* `-10^9 <= target <= 10^9`
* **Only one valid answer exists.**
""",
                'input_format': 'nums: List[int], target: int',
                'output_format': 'List[int]',
                'constraints': '2 <= nums.length <= 10^4',
                'is_active': True
            }
        )
        if p1:
            p1.tags.add(Tag.objects.get(name='Array'), Tag.objects.get(name='Hash Table'))
            # Test Cases
            TestCase.objects.get_or_create(problem=p1, input_data='[2,7,11,15], 9', defaults={'expected_output': '[0,1]', 'is_hidden': False})
            TestCase.objects.get_or_create(problem=p1, input_data='[3,2,4], 6', defaults={'expected_output': '[1,2]', 'is_hidden': False})
            self.stdout.write(f'{"Created" if created else "Updated"} problem: Two Sum')

        # Problem 2: Valid Parentheses
        p2, created = Problem.objects.update_or_create(
            slug='valid-parentheses',
            defaults={
                'title': 'Valid Parentheses',
                'difficulty': 'EASY',
                'points': 20,
                'description': """
Given a string `s` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

### Example 1:
```
Input: s = "()"
Output: true
```

### Example 2:
```
Input: s = "()[]{}"
Output: true
```

### Example 3:
```
Input: s = "(]"
Output: false
```
""",
                'input_format': 's: str',
                'output_format': 'bool',
                'constraints': '1 <= s.length <= 10^4',
                'is_active': True
            }
        )
        if p2:
            p2.tags.add(Tag.objects.get(name='String'), Tag.objects.get(name='Stack'))
            TestCase.objects.get_or_create(problem=p2, input_data='"()"', defaults={'expected_output': 'true', 'is_hidden': False})
            TestCase.objects.get_or_create(problem=p2, input_data='"()[]{}"', defaults={'expected_output': 'true', 'is_hidden': False})
            TestCase.objects.get_or_create(problem=p2, input_data='"(]"', defaults={'expected_output': 'false', 'is_hidden': False})
            self.stdout.write(f'{"Created" if created else "Updated"} problem: Valid Parentheses')

        # Problem 3: Reverse Linked List
        p3, created = Problem.objects.update_or_create(
            slug='reverse-linked-list',
            defaults={
                'title': 'Reverse Linked List',
                'difficulty': 'EASY',
                'points': 15,
                'description': """
Given the `head` of a singly linked list, reverse the list, and return *the reversed list*.

### Example 1:
```
Input: head = [1,2,3,4,5]
Output: [5,4,3,2,1]
```

### Example 2:
```
Input: head = [1,2]
Output: [2,1]
```
""",
                'input_format': 'head: ListNode',
                'output_format': 'ListNode',
                'constraints': '0 <= Number of nodes <= 5000',
                'is_active': True
            }
        )
        if p3:
            p3.tags.add(Tag.objects.get(name='Linked List'))
            TestCase.objects.get_or_create(problem=p3, input_data='[1,2,3,4,5]', defaults={'expected_output': '[5,4,3,2,1]', 'is_hidden': False})
            self.stdout.write(f'{"Created" if created else "Updated"} problem: Reverse Linked List')

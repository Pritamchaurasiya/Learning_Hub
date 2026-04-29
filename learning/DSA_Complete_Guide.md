# 🧠 DSA COMPLETE GUIDE - From Zero to Expert

## Learning Hub - God Mode v10.0

---

# 📖 TABLE OF CONTENTS

1. [Big O Notation](#1-big-o-notation)
2. [Arrays & Strings](#2-arrays--strings)
3. [Linked Lists](#3-linked-lists)
4. [Stacks & Queues](#4-stacks--queues)
5. [Hash Maps](#5-hash-maps)
6. [Trees](#6-trees)
7. [Heaps](#7-heaps)
8. [Graphs](#8-graphs)
9. [Dynamic Programming](#9-dynamic-programming)
10. [Greedy Algorithms](#10-greedy-algorithms)

---

# 1. BIG O NOTATION

## What is Big O?

Big O notation describes the **upper bound** of an algorithm's time or space complexity as the input size grows. It answers: "How does this algorithm scale?"

## Why Does It Matter?

- **Interview Essential**: Every tech interview asks about complexity
- **Real Performance**: O(n²) on 1 million items = 1 trillion operations = SLOW
- **Design Decisions**: Helps you choose the right algorithm

## Common Complexities

| Notation   | Name         | Example            | 1M Items |
| ---------- | ------------ | ------------------ | -------- |
| O(1)       | Constant     | Array access       | 1 op     |
| O(log n)   | Logarithmic  | Binary Search      | 20 ops   |
| O(n)       | Linear       | Loop through array | 1M ops   |
| O(n log n) | Linearithmic | Merge Sort         | 20M ops  |
| O(n²)      | Quadratic    | Nested loops       | 1T ops   |
| O(2^n)     | Exponential  | Subset generation  | ∞        |
| O(n!)      | Factorial    | Permutations       | ∞        |

## How to Calculate Big O

### Rule 1: Drop Constants

```python
# O(2n) → O(n)
for i in range(n):
    print(i)
for j in range(n):
    print(j)
# Total: 2n operations, but Big O = O(n)
```

### Rule 2: Drop Non-Dominant Terms

```python
# O(n² + n) → O(n²)
for i in range(n):
    for j in range(n):
        print(i, j)  # n² operations

for k in range(n):
    print(k)  # n operations

# n² dominates, so O(n²)
```

### Rule 3: Different Inputs = Different Variables

```python
def compare(arr1, arr2):
    for i in arr1:      # O(a)
        for j in arr2:  # O(b)
            pass
# Total: O(a * b), NOT O(n²)
```

## Space Complexity

Memory used by the algorithm (excluding input).

```python
# O(1) Space - Constant
def sum_array(arr):
    total = 0  # Only 1 variable
    for num in arr:
        total += num
    return total

# O(n) Space - Linear
def create_copy(arr):
    copy = []  # New array of size n
    for num in arr:
        copy.append(num)
    return copy
```

## Common Mistake

> "This function is O(1) because it's just one line"

```python
# WRONG! list.sort() is O(n log n)
def sort_list(arr):
    return sorted(arr)  # O(n log n), not O(1)
```

---

# 2. ARRAYS & STRINGS

## What is an Array?

A contiguous block of memory storing elements of the same type. Access any element by index in O(1).

## Core Operations

| Operation         | Time           | Explanation                       |
| ----------------- | -------------- | --------------------------------- |
| Access `arr[i]`   | O(1)           | Direct memory address calculation |
| Search (unsorted) | O(n)           | Must check each element           |
| Search (sorted)   | O(log n)       | Binary search                     |
| Insert at end     | O(1) amortized | May need resize                   |
| Insert at index   | O(n)           | Shift all elements after          |
| Delete            | O(n)           | Shift elements to fill gap        |

## Pattern 1: Two Pointers

**When to use**: Searching pairs, comparing elements from both ends

```python
def two_sum_sorted(arr, target):
    """
    Find two numbers that sum to target in SORTED array.
    Time: O(n), Space: O(1)
    """
    left, right = 0, len(arr) - 1

    while left < right:
        current_sum = arr[left] + arr[right]

        if current_sum == target:
            return [left, right]
        elif current_sum < target:
            left += 1   # Need larger sum
        else:
            right -= 1  # Need smaller sum

    return []  # No pair found
```

```dart
// Dart implementation
List<int> twoSumSorted(List<int> arr, int target) {
  int left = 0, right = arr.length - 1;

  while (left < right) {
    int sum = arr[left] + arr[right];
    if (sum == target) return [left, right];
    if (sum < target) left++;
    else right--;
  }
  return [];
}
```

## Pattern 2: Sliding Window

**When to use**: Subarrays/substrings with constraints (max sum, unique chars)

```python
def max_sum_subarray(arr, k):
    """
    Find max sum of subarray of size k.
    Time: O(n), Space: O(1)

    Brute force would be O(n * k) - recalculating sum each window.
    Sliding window: subtract left, add right.
    """
    if len(arr) < k:
        return 0

    # Calculate first window
    window_sum = sum(arr[:k])
    max_sum = window_sum

    # Slide the window
    for i in range(k, len(arr)):
        window_sum += arr[i] - arr[i - k]  # Add new, remove old
        max_sum = max(max_sum, window_sum)

    return max_sum
```

## Pattern 3: Kadane's Algorithm (Max Subarray)

```python
def max_subarray(arr):
    """
    Find contiguous subarray with largest sum.
    Time: O(n), Space: O(1)

    Key insight: At each position, decide:
    - Extend current subarray? OR
    - Start new subarray from here?
    """
    max_sum = arr[0]
    current_sum = arr[0]

    for i in range(1, len(arr)):
        # If current_sum is negative, starting fresh is better
        current_sum = max(arr[i], current_sum + arr[i])
        max_sum = max(max_sum, current_sum)

    return max_sum

# Example: [-2, 1, -3, 4, -1, 2, 1, -5, 4]
# Answer: [4, -1, 2, 1] = 6
```

## Strings (Special Arrays)

### Immutability

In Python/Java/Dart, strings are **immutable**. Each modification creates a new string!

```python
# BAD: O(n²) due to string concatenation
result = ""
for char in chars:
    result += char  # Creates new string each time!

# GOOD: O(n)
result = "".join(chars)  # Single allocation
```

### Common String Problems

```python
def is_palindrome(s):
    """Check if string is palindrome. O(n) time, O(1) space."""
    left, right = 0, len(s) - 1
    while left < right:
        if s[left] != s[right]:
            return False
        left += 1
        right -= 1
    return True


def reverse_words(s):
    """Reverse words in a string. O(n) time."""
    words = s.split()
    return " ".join(reversed(words))
```

---

# 3. LINKED LISTS

## What is a Linked List?

A linear data structure where elements (nodes) point to the next element. Unlike arrays, not stored contiguously.

## Node Structure

```python
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
```

```dart
class ListNode {
  int val;
  ListNode? next;
  ListNode(this.val, [this.next]);
}
```

## Types

1. **Singly Linked**: Each node points to next
2. **Doubly Linked**: Each node points to next AND prev
3. **Circular**: Last node points back to first

## Complexity Comparison

| Operation        | Array  | Linked List      |
| ---------------- | ------ | ---------------- |
| Access by index  | O(1)   | O(n)             |
| Search           | O(n)   | O(n)             |
| Insert at head   | O(n)   | O(1)             |
| Insert at tail   | O(1)\* | O(n) or O(1)\*\* |
| Insert at middle | O(n)   | O(1) if at node  |
| Delete           | O(n)   | O(1) if at node  |

\*Amortized, \*\*If tail pointer maintained

## Pattern: Reverse Linked List

```python
def reverse_list(head):
    """
    Reverse a singly linked list.
    Time: O(n), Space: O(1)

    Visual:
    1 -> 2 -> 3 -> None
    None <- 1 <- 2 <- 3
    """
    prev = None
    current = head

    while current:
        next_temp = current.next  # Save next
        current.next = prev       # Reverse pointer
        prev = current            # Move prev forward
        current = next_temp       # Move current forward

    return prev  # New head
```

## Pattern: Floyd's Cycle Detection (Tortoise & Hare)

```python
def has_cycle(head):
    """
    Detect if linked list has a cycle.
    Time: O(n), Space: O(1)

    Slow pointer moves 1 step, fast moves 2.
    If cycle exists, they WILL meet.
    """
    if not head or not head.next:
        return False

    slow = head
    fast = head

    while fast and fast.next:
        slow = slow.next        # 1 step
        fast = fast.next.next   # 2 steps

        if slow == fast:
            return True

    return False


def find_cycle_start(head):
    """Find where cycle begins."""
    slow = fast = head

    # Find meeting point
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow == fast:
            break
    else:
        return None  # No cycle

    # Move one pointer to head, both move at same speed
    slow = head
    while slow != fast:
        slow = slow.next
        fast = fast.next

    return slow  # Cycle start
```

---

# 4. STACKS & QUEUES

## Stack (LIFO - Last In, First Out)

```python
# Using list as stack
stack = []
stack.append(1)  # Push
stack.append(2)
stack.pop()      # Pop: returns 2
stack[-1]        # Peek: returns 1

# When to use:
# - Undo/Redo operations
# - Expression parsing (parentheses matching)
# - DFS traversal
# - Call stack simulation
```

### Classic Problem: Valid Parentheses

```python
def is_valid_parentheses(s):
    """
    Check if parentheses are balanced.
    Time: O(n), Space: O(n)
    """
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}

    for char in s:
        if char in mapping:  # Closing bracket
            if not stack or stack.pop() != mapping[char]:
                return False
        else:  # Opening bracket
            stack.append(char)

    return len(stack) == 0
```

### Monotonic Stack Pattern

```python
def next_greater_element(arr):
    """
    For each element, find the next greater element.
    Time: O(n), Space: O(n)

    Stack keeps elements in decreasing order.
    When we find a greater element, pop and assign.
    """
    result = [-1] * len(arr)
    stack = []  # Store indices

    for i, num in enumerate(arr):
        while stack and arr[stack[-1]] < num:
            idx = stack.pop()
            result[idx] = num
        stack.append(i)

    return result

# Example: [4, 5, 2, 10, 8]
# Output:  [5, 10, 10, -1, -1]
```

## Queue (FIFO - First In, First Out)

```python
from collections import deque

queue = deque()
queue.append(1)     # Enqueue
queue.append(2)
queue.popleft()     # Dequeue: returns 1

# When to use:
# - BFS traversal
# - Task scheduling
# - Rate limiting
# - Message queues
```

---

# 5. HASH MAPS

## What is a Hash Map?

Key-value storage with O(1) average lookup, insert, delete.

## How It Works

1. **Hash Function**: Converts key to integer (hash code)
2. **Index Calculation**: `hash_code % array_size`
3. **Collision Handling**: When two keys map to same index

## Collision Strategies

1. **Chaining**: Each bucket holds a linked list
2. **Open Addressing**: Find next available slot

## Python Dictionary (Hash Map)

```python
# Basic operations - all O(1) average
d = {}
d['key'] = 'value'         # Insert
value = d.get('key')       # Lookup (safe)
del d['key']               # Delete
'key' in d                 # Contains check

# Counting pattern
from collections import Counter
counts = Counter("mississippi")
# Counter({'i': 4, 's': 4, 'p': 2, 'm': 1})
```

## Classic: Two Sum (Hash Map Solution)

```python
def two_sum(nums, target):
    """
    Find indices of two numbers that sum to target.
    Time: O(n), Space: O(n)

    Key insight: For each num, check if (target - num) seen before.
    """
    seen = {}  # value -> index

    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i

    return []
```

---

# 6. TREES

## Binary Tree Basics

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
```

## Traversals

```python
def inorder(root):
    """Left -> Root -> Right (sorted order for BST)"""
    if not root:
        return []
    return inorder(root.left) + [root.val] + inorder(root.right)

def preorder(root):
    """Root -> Left -> Right (copy tree structure)"""
    if not root:
        return []
    return [root.val] + preorder(root.left) + preorder(root.right)

def postorder(root):
    """Left -> Right -> Root (delete tree)"""
    if not root:
        return []
    return postorder(root.left) + postorder(root.right) + [root.val]

def levelorder(root):
    """BFS - Level by level"""
    if not root:
        return []

    result = []
    queue = deque([root])

    while queue:
        level = []
        for _ in range(len(queue)):
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        result.append(level)

    return result
```

## Binary Search Tree (BST)

- Left subtree: all values < node
- Right subtree: all values > node
- O(log n) search, insert, delete (balanced)

```python
def search_bst(root, val):
    """O(log n) average, O(n) worst (skewed tree)"""
    if not root or root.val == val:
        return root
    if val < root.val:
        return search_bst(root.left, val)
    return search_bst(root.right, val)

def insert_bst(root, val):
    if not root:
        return TreeNode(val)
    if val < root.val:
        root.left = insert_bst(root.left, val)
    else:
        root.right = insert_bst(root.right, val)
    return root
```

---

# 7. HEAPS

## What is a Heap?

A complete binary tree where parent is always larger (max-heap) or smaller (min-heap) than children.

## Python heapq (Min-Heap)

```python
import heapq

heap = []
heapq.heappush(heap, 3)  # O(log n)
heapq.heappush(heap, 1)
heapq.heappush(heap, 2)

heapq.heappop(heap)  # Returns 1 (smallest)

# For max-heap, negate values
heapq.heappush(heap, -5)
max_val = -heapq.heappop(heap)  # Returns 5
```

## Classic: Top K Elements

```python
def top_k_frequent(nums, k):
    """
    Find k most frequent elements.
    Time: O(n log k), Space: O(n)
    """
    from collections import Counter

    counts = Counter(nums)
    # Use min-heap of size k
    return heapq.nlargest(k, counts.keys(), key=counts.get)
```

---

# 8. GRAPHS

## Representations

```python
# Adjacency List (most common)
graph = {
    'A': ['B', 'C'],
    'B': ['A', 'D'],
    'C': ['A', 'D'],
    'D': ['B', 'C']
}

# Adjacency Matrix
#     A  B  C  D
# A [[0, 1, 1, 0],
# B  [1, 0, 0, 1],
# C  [1, 0, 0, 1],
# D  [0, 1, 1, 0]]
```

## BFS (Breadth-First Search)

```python
def bfs(graph, start):
    """
    Explore level by level. Good for shortest path.
    Time: O(V + E), Space: O(V)
    """
    visited = set([start])
    queue = deque([start])

    while queue:
        node = queue.popleft()
        print(node)

        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
```

## DFS (Depth-First Search)

```python
def dfs(graph, start, visited=None):
    """
    Explore as far as possible before backtracking.
    Time: O(V + E), Space: O(V)
    """
    if visited is None:
        visited = set()

    visited.add(start)
    print(start)

    for neighbor in graph[start]:
        if neighbor not in visited:
            dfs(graph, neighbor, visited)
```

## Dijkstra's Algorithm (Shortest Path)

```python
import heapq

def dijkstra(graph, start):
    """
    Find shortest path from start to all nodes.
    Time: O((V + E) log V), Space: O(V)
    """
    distances = {node: float('inf') for node in graph}
    distances[start] = 0
    heap = [(0, start)]

    while heap:
        dist, node = heapq.heappop(heap)

        if dist > distances[node]:
            continue

        for neighbor, weight in graph[node].items():
            new_dist = dist + weight
            if new_dist < distances[neighbor]:
                distances[neighbor] = new_dist
                heapq.heappush(heap, (new_dist, neighbor))

    return distances
```

---

# 9. DYNAMIC PROGRAMMING

## What is DP?

Solving complex problems by breaking into overlapping subproblems and storing results.

## Key Characteristics

1. **Optimal Substructure**: Optimal solution built from optimal sub-solutions
2. **Overlapping Subproblems**: Same subproblems solved multiple times

## Approach

1. **Memoization** (Top-Down): Recursion + cache
2. **Tabulation** (Bottom-Up): Iterative, build from base cases

## Classic: Fibonacci

```python
# Naive recursive: O(2^n) - TERRIBLE
def fib_naive(n):
    if n <= 1:
        return n
    return fib_naive(n-1) + fib_naive(n-2)

# Memoization: O(n) time, O(n) space
def fib_memo(n, memo={}):
    if n in memo:
        return memo[n]
    if n <= 1:
        return n
    memo[n] = fib_memo(n-1, memo) + fib_memo(n-2, memo)
    return memo[n]

# Tabulation: O(n) time, O(1) space
def fib_tab(n):
    if n <= 1:
        return n
    prev, curr = 0, 1
    for _ in range(2, n + 1):
        prev, curr = curr, prev + curr
    return curr
```

## Classic: Climbing Stairs

```python
def climb_stairs(n):
    """
    How many ways to climb n stairs (1 or 2 steps at a time)?

    dp[i] = dp[i-1] + dp[i-2]
    (reach step i from i-1 OR from i-2)
    """
    if n <= 2:
        return n

    prev, curr = 1, 2
    for _ in range(3, n + 1):
        prev, curr = curr, prev + curr
    return curr
```

## 2D DP: Unique Paths

```python
def unique_paths(m, n):
    """
    Count paths from top-left to bottom-right (only down/right).

    dp[i][j] = dp[i-1][j] + dp[i][j-1]
    """
    dp = [[1] * n for _ in range(m)]

    for i in range(1, m):
        for j in range(1, n):
            dp[i][j] = dp[i-1][j] + dp[i][j-1]

    return dp[m-1][n-1]
```

---

# 10. GREEDY ALGORITHMS

## What is Greedy?

Make locally optimal choices at each step, hoping to find global optimum.

## When Does Greedy Work?

- **Optimal Substructure**: Yes
- **Greedy Choice Property**: Local optimum leads to global optimum

## Classic: Activity Selection

```python
def activity_selection(activities):
    """
    Select max non-overlapping activities.

    Greedy: Always pick activity that ends earliest.
    """
    # Sort by end time
    sorted_acts = sorted(activities, key=lambda x: x[1])

    selected = [sorted_acts[0]]
    last_end = sorted_acts[0][1]

    for start, end in sorted_acts[1:]:
        if start >= last_end:
            selected.append((start, end))
            last_end = end

    return selected
```

---

# 🎓 PRACTICE RECOMMENDATIONS

## By Level

### Beginner

1. Two Sum (Hash Map)
2. Valid Parentheses (Stack)
3. Reverse Linked List
4. Maximum Subarray (Kadane's)
5. Binary Search

### Intermediate

1. LRU Cache (Hash Map + DLL)
2. Number of Islands (DFS/BFS)
3. Merge Intervals
4. Coin Change (DP)
5. Kth Largest Element (Heap)

### Advanced

1. Word Ladder (BFS)
2. Longest Increasing Subsequence (DP)
3. Serialize/Deserialize Binary Tree
4. Median of Two Sorted Arrays
5. Alien Dictionary (Topological Sort)

---

_Generated by God Mode v10.0 - Infinite Learning Engine_
_Learning Hub DSA Mastery Track_

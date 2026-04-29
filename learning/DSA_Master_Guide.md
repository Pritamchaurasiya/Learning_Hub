# 🔐 DSA Master Guide: From Beginner to God-Tier

## Table of Contents

1. [Why DSA?](#why-dsa)
2. [Core Data Structures](#core-data-structures)
3. [Essential Algorithms](#essential-algorithms)
4. [Problem-Solving Patterns](#problem-solving-patterns)
5. [Time & Space Complexity](#time-space-complexity)
6. [Security in Code Execution](#security-in-code-execution)
7. [Interview Preparation](#interview-preparation)

---

## 1. Why DSA?

**What is it?**
Data Structures and Algorithms (DSA) is the foundation of computer science. It's about organizing data efficiently and solving problems optimally.

**Why is it needed?**

- **Interviews**: FAANG companies test DSA heavily
- **Performance**: O(N) vs O(N²) can mean seconds vs hours
- **Problem Solving**: Trains your brain to think systematically

**When to use?**

- Building scalable systems
- Optimizing existing code
- Solving competitive programming problems

---

## 2. Core Data Structures

### Arrays & Lists

```python
# O(1) access, O(N) insert/delete
arr = [1, 2, 3, 4, 5]
arr.append(6)      # O(1) amortized
arr.insert(0, 0)   # O(N) - shifts all elements
```

**When to use**: Sequential data, random access needed
**Common mistake**: Using arrays when you need frequent insertions

### Hash Maps (Dictionaries)

```python
# O(1) average for all operations
lookup = {"apple": 5, "banana": 3}
lookup["cherry"] = 7  # O(1) insert
value = lookup.get("apple")  # O(1) lookup
```

**When to use**: Fast lookups, counting, memoization
**Attack vector**: Hash collision attacks (use random seed)

### Stacks & Queues

```python
# Stack: LIFO - Last In First Out
stack = []
stack.append(1)  # push
stack.pop()      # pop

# Queue: FIFO - First In First Out
from collections import deque
queue = deque()
queue.append(1)     # enqueue
queue.popleft()     # dequeue
```

**When to use**:

- Stack: Undo operations, parsing, DFS
- Queue: BFS, task scheduling, rate limiting

### Trees & Graphs

```python
class TreeNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

# Graph representation
graph = {
    'A': ['B', 'C'],
    'B': ['D', 'E'],
    'C': ['F']
}
```

---

## 3. Essential Algorithms

### Binary Search - O(log N)

```python
def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1
```

**When to use**: Sorted data, finding boundaries

### Two Pointers

```python
def two_sum_sorted(arr, target):
    left, right = 0, len(arr) - 1
    while left < right:
        curr_sum = arr[left] + arr[right]
        if curr_sum == target:
            return [left, right]
        elif curr_sum < target:
            left += 1
        else:
            right -= 1
    return []
```

### Sliding Window

```python
def max_sum_subarray(arr, k):
    window_sum = sum(arr[:k])
    max_sum = window_sum
    for i in range(k, len(arr)):
        window_sum += arr[i] - arr[i-k]
        max_sum = max(max_sum, window_sum)
    return max_sum
```

### Dynamic Programming

```python
# Fibonacci - Memoization
def fib(n, memo={}):
    if n in memo:
        return memo[n]
    if n <= 1:
        return n
    memo[n] = fib(n-1, memo) + fib(n-2, memo)
    return memo[n]

# Fibonacci - Tabulation
def fib_tab(n):
    if n <= 1:
        return n
    dp = [0] * (n + 1)
    dp[1] = 1
    for i in range(2, n + 1):
        dp[i] = dp[i-1] + dp[i-2]
    return dp[n]
```

---

## 4. Problem-Solving Patterns

### Pattern 1: Hash Map for O(1) Lookup

**Problem**: Two Sum - find indices of two numbers that sum to target

```python
def two_sum(nums, target):
    seen = {}  # value -> index
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []
```

**Time**: O(N), **Space**: O(N)

### Pattern 2: Slow & Fast Pointers

**Problem**: Detect cycle in linked list

```python
def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow == fast:
            return True
    return False
```

### Pattern 3: BFS for Shortest Path

```python
from collections import deque

def bfs_shortest_path(graph, start, end):
    queue = deque([(start, [start])])
    visited = {start}

    while queue:
        node, path = queue.popleft()
        if node == end:
            return path
        for neighbor in graph.get(node, []):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, path + [neighbor]))
    return []
```

---

## 5. Time & Space Complexity

### Big O Cheat Sheet

| Complexity | Name         | Example       |
| ---------- | ------------ | ------------- |
| O(1)       | Constant     | Hash lookup   |
| O(log N)   | Logarithmic  | Binary search |
| O(N)       | Linear       | Single loop   |
| O(N log N) | Linearithmic | Merge sort    |
| O(N²)      | Quadratic    | Nested loops  |
| O(2^N)     | Exponential  | Subsets       |
| O(N!)      | Factorial    | Permutations  |

### How to Analyze

1. **Identify loops**: Each loop multiplies complexity
2. **Recursive calls**: Draw the recursion tree
3. **Data structures**: Know their operation costs

---

## 6. Security in Code Execution

### Our SandboxService Implementation

The Learning Hub DSA module uses Docker containerization with security measures:

#### Forbidden Patterns (Blocked)

```python
FORBIDDEN_PATTERNS = [
    r'import\\s+os',           # File system access
    r'import\\s+subprocess',   # Command execution
    r'eval\\s*\\(',            # Dynamic code execution
    r'exec\\s*\\(',            # Dynamic code execution
    r'open\\s*\\(',            # File access
    r'__import__',             # Dynamic imports
]
```

#### Why This Matters

- **Attack**: User submits `os.system('rm -rf /')`
- **Defense**: Pattern matching blocks dangerous imports BEFORE execution
- **Lesson**: Never trust user input, especially code!

### Docker Isolation

```bash
docker run --rm \
    --network none \      # No network access
    --memory 128m \       # Memory limit
    python:3.11-slim \
    python3 solution.py
```

---

## 7. Interview Preparation

### The UMPIRE Method

1. **U**nderstand the problem
2. **M**atch to patterns you know
3. **P**lan your approach
4. **I**mplement the solution
5. **R**eview your code
6. **E**valuate complexity

### Top 10 Must-Know Problems

1. Two Sum (Hash Map)
2. Valid Parentheses (Stack)
3. Merge Two Sorted Lists (Two Pointers)
4. Binary Search
5. Maximum Subarray (Kadane's Algorithm)
6. Climbing Stairs (DP)
7. Reverse Linked List
8. Valid Palindrome
9. Merge Intervals
10. LRU Cache (Hash Map + Doubly Linked List)

### Common Mistakes

1. Not handling edge cases (empty input, single element)
2. Off-by-one errors in binary search
3. Not considering negative numbers
4. Forgetting to update pointers in linked lists
5. Integer overflow in large calculations

---

## Practice Commands

```powershell
# Start backend
cd conductor; python manage.py runserver

# Access DSA API
curl http://127.0.0.1:8000/api/v1/dsa/problems/

# Submit solution
curl -X POST http://127.0.0.1:8000/api/v1/dsa/submissions/ \
  -H "Authorization: Bearer TOKEN" \
  -d '{"problem": 1, "code": "...", "language": "python"}'
```

---

## Next Steps

1. Solve 5 problems daily
2. Review your submissions' AI feedback
3. Focus on weak areas identified by complexity analysis
4. Practice explaining solutions out loud

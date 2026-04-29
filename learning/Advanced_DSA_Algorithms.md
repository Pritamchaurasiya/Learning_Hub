# 🧮 Advanced DSA Algorithms - Complete Mastery Guide

## God Mode v12.0 - From Intermediate to Expert

---

# 📖 TABLE OF CONTENTS

1. [Advanced Dynamic Programming](#1-advanced-dynamic-programming)
2. [Advanced Graph Algorithms](#2-advanced-graph-algorithms)
3. [String Algorithms](#3-string-algorithms)
4. [Tree Algorithms](#4-tree-algorithms)
5. [Segment Trees & Fenwick Trees](#5-segment-trees--fenwick-trees)
6. [Bit Manipulation](#6-bit-manipulation)
7. [System Design with DSA](#7-system-design-with-dsa)
8. [Interview Patterns](#8-interview-patterns)

---

# 1. ADVANCED DYNAMIC PROGRAMMING

## DP Decision Framework

When you see a problem, ask:

1. Can I break it into **overlapping** subproblems?
2. Is there **optimal substructure**?
3. What are the **state variables**?
4. What are the **transitions**?

## Pattern: 0/1 Knapsack

### Problem

Given items with weights and values, maximize value within capacity.

```python
def knapsack(weights, values, capacity):
    """
    0/1 Knapsack Problem
    Time: O(n * W), Space: O(W)

    State: dp[w] = max value achievable with capacity w
    Transition: For each item, either include it or not
    """
    n = len(weights)
    dp = [0] * (capacity + 1)

    for i in range(n):
        # Traverse backwards to avoid using same item twice
        for w in range(capacity, weights[i] - 1, -1):
            dp[w] = max(dp[w], dp[w - weights[i]] + values[i])

    return dp[capacity]

# Example:
# weights = [1, 3, 4, 5]
# values = [1, 4, 5, 7]
# capacity = 7
# Output: 9 (items with weights 3 and 4)
```

### Knapsack Variants

| Variant    | Modification                        |
| ---------- | ----------------------------------- |
| Unbounded  | Forward traversal (can reuse items) |
| Bounded    | Add item count constraint           |
| Fractional | Greedy (value/weight ratio)         |

## Pattern: Longest Common Subsequence (LCS)

```python
def lcs(text1, text2):
    """
    Find longest subsequence present in both strings.
    Time: O(m * n), Space: O(min(m, n))

    Example: "abcde", "ace" → "ace" (length 3)
    """
    m, n = len(text1), len(text2)

    # Optimize space by using 1D array
    if m < n:
        text1, text2 = text2, text1
        m, n = n, m

    dp = [0] * (n + 1)

    for i in range(1, m + 1):
        prev = 0
        for j in range(1, n + 1):
            temp = dp[j]
            if text1[i-1] == text2[j-1]:
                dp[j] = prev + 1
            else:
                dp[j] = max(dp[j], dp[j-1])
            prev = temp

    return dp[n]
```

## Pattern: Edit Distance

```python
def min_distance(word1, word2):
    """
    Minimum edits (insert, delete, replace) to convert word1 to word2.
    Time: O(m * n), Space: O(n)

    Used in: Spell checkers, DNA sequence alignment
    """
    m, n = len(word1), len(word2)
    dp = list(range(n + 1))

    for i in range(1, m + 1):
        prev = dp[0]
        dp[0] = i
        for j in range(1, n + 1):
            temp = dp[j]
            if word1[i-1] == word2[j-1]:
                dp[j] = prev
            else:
                dp[j] = 1 + min(prev, dp[j], dp[j-1])
            prev = temp

    return dp[n]
```

## Pattern: Matrix Chain Multiplication

```python
def matrix_chain_order(dimensions):
    """
    Find optimal way to multiply chain of matrices.
    Time: O(n³), Space: O(n²)

    dimensions[i-1] x dimensions[i] = dimensions of matrix i
    """
    n = len(dimensions) - 1
    dp = [[0] * n for _ in range(n)]

    # Length of chain
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            dp[i][j] = float('inf')
            for k in range(i, j):
                cost = (dp[i][k] + dp[k+1][j] +
                       dimensions[i] * dimensions[k+1] * dimensions[j+1])
                dp[i][j] = min(dp[i][j], cost)

    return dp[0][n-1]
```

---

# 2. ADVANCED GRAPH ALGORITHMS

## Bellman-Ford (Negative Weights Allowed)

```python
def bellman_ford(edges, n, src):
    """
    Single-source shortest paths with negative edges.
    Time: O(V * E), Space: O(V)

    Can detect negative cycles!
    """
    dist = [float('inf')] * n
    dist[src] = 0

    # Relax all edges V-1 times
    for _ in range(n - 1):
        for u, v, w in edges:
            if dist[u] != float('inf') and dist[u] + w < dist[v]:
                dist[v] = dist[u] + w

    # Check for negative cycle
    for u, v, w in edges:
        if dist[u] != float('inf') and dist[u] + w < dist[v]:
            return None  # Negative cycle exists

    return dist
```

## Floyd-Warshall (All-Pairs Shortest Path)

```python
def floyd_warshall(graph):
    """
    Shortest paths between ALL pairs of vertices.
    Time: O(V³), Space: O(V²)

    graph[i][j] = weight of edge i→j (inf if no edge)
    """
    n = len(graph)
    dist = [[x for x in row] for row in graph]

    for k in range(n):
        for i in range(n):
            for j in range(n):
                if dist[i][k] + dist[k][j] < dist[i][j]:
                    dist[i][j] = dist[i][k] + dist[k][j]

    return dist
```

## Topological Sort (DAG)

```python
def topological_sort(graph, n):
    """
    Linear ordering where u comes before v for every edge u→v.
    Time: O(V + E), Space: O(V)

    Use case: Task scheduling, build systems
    """
    from collections import deque

    in_degree = [0] * n
    for u in range(n):
        for v in graph[u]:
            in_degree[v] += 1

    queue = deque([i for i in range(n) if in_degree[i] == 0])
    result = []

    while queue:
        u = queue.popleft()
        result.append(u)
        for v in graph[u]:
            in_degree[v] -= 1
            if in_degree[v] == 0:
                queue.append(v)

    return result if len(result) == n else []  # Empty if cycle exists
```

## Strongly Connected Components (Kosaraju's)

```python
def kosaraju(graph, n):
    """
    Find all strongly connected components.
    Time: O(V + E), Space: O(V)

    Used in: Social network analysis, circuit design
    """
    def dfs1(u, visited, stack):
        visited.add(u)
        for v in graph[u]:
            if v not in visited:
                dfs1(v, visited, stack)
        stack.append(u)

    def dfs2(u, visited, component):
        visited.add(u)
        component.append(u)
        for v in reverse_graph[u]:
            if v not in visited:
                dfs2(v, visited, component)

    # Build reverse graph
    reverse_graph = [[] for _ in range(n)]
    for u in range(n):
        for v in graph[u]:
            reverse_graph[v].append(u)

    # First DFS to get finish order
    visited = set()
    stack = []
    for i in range(n):
        if i not in visited:
            dfs1(i, visited, stack)

    # Second DFS on reverse graph
    visited = set()
    sccs = []
    while stack:
        u = stack.pop()
        if u not in visited:
            component = []
            dfs2(u, visited, component)
            sccs.append(component)

    return sccs
```

---

# 3. STRING ALGORITHMS

## KMP (Knuth-Morris-Pratt) Pattern Matching

```python
def kmp_search(text, pattern):
    """
    Find all occurrences of pattern in text.
    Time: O(n + m), Space: O(m)

    Key insight: Don't re-scan characters that won't match.
    """
    def build_lps(pattern):
        """Longest Proper Prefix which is also Suffix"""
        lps = [0] * len(pattern)
        length = 0
        i = 1

        while i < len(pattern):
            if pattern[i] == pattern[length]:
                length += 1
                lps[i] = length
                i += 1
            elif length != 0:
                length = lps[length - 1]
            else:
                lps[i] = 0
                i += 1

        return lps

    lps = build_lps(pattern)
    matches = []
    i = j = 0

    while i < len(text):
        if text[i] == pattern[j]:
            i += 1
            j += 1
            if j == len(pattern):
                matches.append(i - j)
                j = lps[j - 1]
        elif j != 0:
            j = lps[j - 1]
        else:
            i += 1

    return matches
```

## Rabin-Karp (Rolling Hash)

```python
def rabin_karp(text, pattern):
    """
    Pattern matching using hash comparison.
    Time: O(n + m) average, O(nm) worst

    Better for multiple pattern search.
    """
    BASE = 256
    MOD = 101

    m, n = len(pattern), len(text)
    if m > n:
        return []

    # Calculate hash of pattern and first window
    p_hash = 0
    t_hash = 0
    h = pow(BASE, m - 1, MOD)

    for i in range(m):
        p_hash = (BASE * p_hash + ord(pattern[i])) % MOD
        t_hash = (BASE * t_hash + ord(text[i])) % MOD

    matches = []
    for i in range(n - m + 1):
        if p_hash == t_hash:
            # Verify character by character
            if text[i:i+m] == pattern:
                matches.append(i)

        # Roll the hash
        if i < n - m:
            t_hash = (BASE * (t_hash - ord(text[i]) * h) + ord(text[i + m])) % MOD
            if t_hash < 0:
                t_hash += MOD

    return matches
```

## Trie (Prefix Tree)

```python
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False
        self.count = 0  # For counting words with this prefix

class Trie:
    """
    Prefix tree for efficient string operations.
    Time: O(m) for insert/search where m = word length

    Use cases: Autocomplete, spell checker, IP routing
    """
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
            node.count += 1
        node.is_end = True

    def search(self, word):
        node = self._find_node(word)
        return node is not None and node.is_end

    def starts_with(self, prefix):
        return self._find_node(prefix) is not None

    def count_prefix(self, prefix):
        node = self._find_node(prefix)
        return node.count if node else 0

    def _find_node(self, prefix):
        node = self.root
        for char in prefix:
            if char not in node.children:
                return None
            node = node.children[char]
        return node
```

---

# 4. TREE ALGORITHMS

## Lowest Common Ancestor (LCA)

```python
class LCA:
    """
    Binary Lifting technique for O(log n) LCA queries.
    Preprocessing: O(n log n), Query: O(log n)
    """
    def __init__(self, root, adj):
        self.n = len(adj)
        self.LOG = 20
        self.depth = [0] * self.n
        self.parent = [[-1] * self.n for _ in range(self.LOG)]

        # BFS to set immediate parents and depths
        from collections import deque
        queue = deque([root])
        visited = {root}

        while queue:
            node = queue.popleft()
            for neighbor in adj[node]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    self.depth[neighbor] = self.depth[node] + 1
                    self.parent[0][neighbor] = node
                    queue.append(neighbor)

        # Build sparse table
        for i in range(1, self.LOG):
            for v in range(self.n):
                if self.parent[i-1][v] != -1:
                    self.parent[i][v] = self.parent[i-1][self.parent[i-1][v]]

    def query(self, u, v):
        # Ensure u is deeper
        if self.depth[u] < self.depth[v]:
            u, v = v, u

        # Bring u to same level as v
        diff = self.depth[u] - self.depth[v]
        for i in range(self.LOG):
            if (diff >> i) & 1:
                u = self.parent[i][u]

        if u == v:
            return u

        # Binary search for LCA
        for i in range(self.LOG - 1, -1, -1):
            if self.parent[i][u] != self.parent[i][v]:
                u = self.parent[i][u]
                v = self.parent[i][v]

        return self.parent[0][u]
```

## Tree Diameter

```python
def tree_diameter(adj, root=0):
    """
    Find longest path in a tree using 2 BFS.
    Time: O(n), Space: O(n)
    """
    from collections import deque

    def bfs_farthest(start):
        dist = [-1] * len(adj)
        dist[start] = 0
        queue = deque([start])
        farthest, max_dist = start, 0

        while queue:
            node = queue.popleft()
            for neighbor in adj[node]:
                if dist[neighbor] == -1:
                    dist[neighbor] = dist[node] + 1
                    queue.append(neighbor)
                    if dist[neighbor] > max_dist:
                        max_dist = dist[neighbor]
                        farthest = neighbor

        return farthest, max_dist

    # First BFS to find one end of diameter
    end1, _ = bfs_farthest(root)
    # Second BFS to find actual diameter
    end2, diameter = bfs_farthest(end1)

    return diameter
```

---

# 5. SEGMENT TREES & FENWICK TREES

## Segment Tree

```python
class SegmentTree:
    """
    Range query and point update in O(log n).

    Use case: Range sum, range min/max, range GCD
    """
    def __init__(self, arr):
        self.n = len(arr)
        self.tree = [0] * (4 * self.n)
        self._build(arr, 0, 0, self.n - 1)

    def _build(self, arr, node, start, end):
        if start == end:
            self.tree[node] = arr[start]
        else:
            mid = (start + end) // 2
            self._build(arr, 2*node+1, start, mid)
            self._build(arr, 2*node+2, mid+1, end)
            self.tree[node] = self.tree[2*node+1] + self.tree[2*node+2]

    def update(self, idx, val, node=0, start=0, end=None):
        if end is None:
            end = self.n - 1

        if start == end:
            self.tree[node] = val
        else:
            mid = (start + end) // 2
            if idx <= mid:
                self.update(idx, val, 2*node+1, start, mid)
            else:
                self.update(idx, val, 2*node+2, mid+1, end)
            self.tree[node] = self.tree[2*node+1] + self.tree[2*node+2]

    def query(self, l, r, node=0, start=0, end=None):
        if end is None:
            end = self.n - 1

        if r < start or l > end:
            return 0
        if l <= start and end <= r:
            return self.tree[node]

        mid = (start + end) // 2
        left = self.query(l, r, 2*node+1, start, mid)
        right = self.query(l, r, 2*node+2, mid+1, end)
        return left + right
```

## Fenwick Tree (Binary Indexed Tree)

```python
class FenwickTree:
    """
    Prefix sum queries and point updates in O(log n).
    Simpler than segment tree for sum queries.
    """
    def __init__(self, n):
        self.n = n
        self.tree = [0] * (n + 1)

    def update(self, i, delta):
        """Add delta to element at index i"""
        i += 1  # 1-indexed
        while i <= self.n:
            self.tree[i] += delta
            i += i & (-i)  # Add last set bit

    def prefix_sum(self, i):
        """Sum of elements [0, i]"""
        i += 1
        total = 0
        while i > 0:
            total += self.tree[i]
            i -= i & (-i)  # Remove last set bit
        return total

    def range_sum(self, l, r):
        """Sum of elements [l, r]"""
        return self.prefix_sum(r) - (self.prefix_sum(l-1) if l > 0 else 0)
```

---

# 6. BIT MANIPULATION

## Key Operations

```python
# Get i-th bit
(n >> i) & 1

# Set i-th bit
n | (1 << i)

# Clear i-th bit
n & ~(1 << i)

# Toggle i-th bit
n ^ (1 << i)

# Check if power of 2
n > 0 and (n & (n-1)) == 0

# Count set bits (Brian Kernighan's)
def count_bits(n):
    count = 0
    while n:
        n &= n - 1  # Clear lowest set bit
        count += 1
    return count

# Get lowest set bit
lowest_bit = n & (-n)
```

## Subset Enumeration

```python
def enumerate_subsets(n):
    """
    Enumerate all subsets of set {0, 1, ..., n-1}.
    Time: O(2^n)
    """
    subsets = []
    for mask in range(1 << n):
        subset = []
        for i in range(n):
            if mask & (1 << i):
                subset.append(i)
        subsets.append(subset)
    return subsets
```

---

# 7. SYSTEM DESIGN WITH DSA

## Rate Limiter (Sliding Window)

```python
from collections import deque
import time

class RateLimiter:
    """
    Allow max `limit` requests in `window_seconds`.
    Time: O(1) amortized, Space: O(limit)
    """
    def __init__(self, limit, window_seconds):
        self.limit = limit
        self.window = window_seconds
        self.requests = deque()

    def allow_request(self):
        current = time.time()

        # Remove expired requests
        while self.requests and current - self.requests[0] > self.window:
            self.requests.popleft()

        if len(self.requests) < self.limit:
            self.requests.append(current)
            return True
        return False
```

## LRU Cache

```python
from collections import OrderedDict

class LRUCache:
    """
    Least Recently Used cache.
    Time: O(1) for get/put

    How: OrderedDict maintains insertion order.
    Move accessed items to end (most recent).
    """
    def __init__(self, capacity):
        self.cache = OrderedDict()
        self.capacity = capacity

    def get(self, key):
        if key not in self.cache:
            return -1
        self.cache.move_to_end(key)
        return self.cache[key]

    def put(self, key, value):
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)
```

---

# 8. INTERVIEW PATTERNS

## Pattern Recognition Cheat Sheet

| Pattern           | Keywords                   | Technique            |
| ----------------- | -------------------------- | -------------------- |
| Two Pointers      | Sorted array, pairs        | Start/end pointers   |
| Sliding Window    | Subarray, substring        | Expand/shrink window |
| Fast & Slow       | Cycle, middle              | Tortoise & hare      |
| Merge Intervals   | Overlapping, schedule      | Sort by start        |
| Cyclic Sort       | Range [1, n], duplicates   | Put each at index    |
| In-place Reversal | Linked list, k groups      | Reverse pointers     |
| Tree BFS          | Level order, min depth     | Queue                |
| Tree DFS          | Path sum, serialize        | Recursion/stack      |
| Subsets           | Combinations, permutations | Backtracking         |
| Binary Search     | Sorted, monotonic          | Left/right bounds    |
| Top K             | K largest/smallest         | Heap                 |
| K-way Merge       | K sorted lists             | Min heap             |
| Trie              | Prefix, autocomplete       | Prefix tree          |
| Topological Sort  | Dependencies, order        | DAG + BFS/DFS        |
| DP                | Optimization, counting     | Subproblems + memo   |

## Interview Approach (UMPIRE)

1. **U**nderstand - Clarify requirements
2. **M**atch - Identify patterns
3. **P**lan - Pseudocode solution
4. **I**mplement - Write clean code
5. **R**eview - Debug and optimize
6. **E**valuate - Discuss complexity

---

_God Mode v12.0 - Advanced DSA Mastery_
_Last Updated: 2026-01-06_

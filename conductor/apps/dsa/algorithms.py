"""
DSA Algorithm Utilities

Collection of commonly needed data structures and algorithms for DSA practice.
These can be used as reference implementations or building blocks.

Categories:
1. Sorting Algorithms
2. Searching Algorithms
3. Graph Algorithms
4. Tree Traversals
5. Dynamic Programming Helpers
6. Data Structure Implementations
"""

from typing import List, Dict, Any, Optional, Tuple, Callable
from collections import deque, defaultdict
import heapq
import logging

logger = logging.getLogger(__name__)


# ==========================================================================
# SORTING ALGORITHMS
# ==========================================================================

class SortingAlgorithms:
    """Collection of sorting algorithm implementations."""
    
    @staticmethod
    def quick_sort(arr: List[int]) -> List[int]:
        """
        QuickSort implementation.
        Time: O(n log n) average, O(n²) worst
        Space: O(log n)
        """
        if len(arr) <= 1:
            return arr
        pivot = arr[len(arr) // 2]
        left = [x for x in arr if x < pivot]
        middle = [x for x in arr if x == pivot]
        right = [x for x in arr if x > pivot]
        return SortingAlgorithms.quick_sort(left) + middle + SortingAlgorithms.quick_sort(right)
    
    @staticmethod
    def merge_sort(arr: List[int]) -> List[int]:
        """
        MergeSort implementation.
        Time: O(n log n)
        Space: O(n)
        """
        if len(arr) <= 1:
            return arr
        
        mid = len(arr) // 2
        left = SortingAlgorithms.merge_sort(arr[:mid])
        right = SortingAlgorithms.merge_sort(arr[mid:])
        
        return SortingAlgorithms._merge(left, right)
    
    @staticmethod
    def _merge(left: List[int], right: List[int]) -> List[int]:
        result = []
        i = j = 0
        while i < len(left) and j < len(right):
            if left[i] <= right[j]:
                result.append(left[i])
                i += 1
            else:
                result.append(right[j])
                j += 1
        result.extend(left[i:])
        result.extend(right[j:])
        return result
    
    @staticmethod
    def heap_sort(arr: List[int]) -> List[int]:
        """
        HeapSort implementation.
        Time: O(n log n)
        Space: O(1) in-place
        """
        heapq.heapify(arr)
        return [heapq.heappop(arr) for _ in range(len(arr))]
    
    @staticmethod
    def counting_sort(arr: List[int]) -> List[int]:
        """
        CountingSort for non-negative integers.
        Time: O(n + k) where k is range
        Space: O(k)
        """
        if not arr:
            return arr
        max_val = max(arr)
        count = [0] * (max_val + 1)
        for num in arr:
            count[num] += 1
        
        result = []
        for i, c in enumerate(count):
            result.extend([i] * c)
        return result


# ==========================================================================
# SEARCHING ALGORITHMS
# ==========================================================================

class SearchingAlgorithms:
    """Collection of searching algorithm implementations."""
    
    @staticmethod
    def binary_search(arr: List[int], target: int) -> int:
        """
        Binary search for sorted arrays.
        Time: O(log n)
        Space: O(1)
        Returns: index of target or -1 if not found
        """
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
    
    @staticmethod
    def binary_search_left(arr: List[int], target: int) -> int:
        """Find leftmost position where target can be inserted."""
        left, right = 0, len(arr)
        while left < right:
            mid = (left + right) // 2
            if arr[mid] < target:
                left = mid + 1
            else:
                right = mid
        return left
    
    @staticmethod
    def binary_search_right(arr: List[int], target: int) -> int:
        """Find rightmost position where target can be inserted."""
        left, right = 0, len(arr)
        while left < right:
            mid = (left + right) // 2
            if arr[mid] <= target:
                left = mid + 1
            else:
                right = mid
        return left
    
    @staticmethod
    def ternary_search(arr: List[int], target: int) -> int:
        """
        Ternary search for sorted arrays.
        Time: O(log₃ n)
        """
        left, right = 0, len(arr) - 1
        while left <= right:
            mid1 = left + (right - left) // 3
            mid2 = right - (right - left) // 3
            
            if arr[mid1] == target:
                return mid1
            if arr[mid2] == target:
                return mid2
            
            if target < arr[mid1]:
                right = mid1 - 1
            elif target > arr[mid2]:
                left = mid2 + 1
            else:
                left = mid1 + 1
                right = mid2 - 1
        return -1


# ==========================================================================
# GRAPH ALGORITHMS
# ==========================================================================

class GraphAlgorithms:
    """Collection of graph algorithm implementations."""
    
    @staticmethod
    def bfs(graph: Dict[int, List[int]], start: int) -> List[int]:
        """
        Breadth-First Search.
        Time: O(V + E)
        Space: O(V)
        """
        visited = set()
        queue = deque([start])
        result = []
        
        while queue:
            node = queue.popleft()
            if node not in visited:
                visited.add(node)
                result.append(node)
                for neighbor in graph.get(node, []):
                    if neighbor not in visited:
                        queue.append(neighbor)
        
        return result
    
    @staticmethod
    def dfs(graph: Dict[int, List[int]], start: int) -> List[int]:
        """
        Depth-First Search (iterative).
        Time: O(V + E)
        Space: O(V)
        """
        visited = set()
        stack = [start]
        result = []
        
        while stack:
            node = stack.pop()
            if node not in visited:
                visited.add(node)
                result.append(node)
                for neighbor in reversed(graph.get(node, [])):
                    if neighbor not in visited:
                        stack.append(neighbor)
        
        return result
    
    @staticmethod
    def dijkstra(graph: Dict[int, List[Tuple[int, int]]], start: int) -> Dict[int, int]:
        """
        Dijkstra's shortest path algorithm.
        Time: O((V + E) log V)
        Space: O(V)
        
        graph format: {node: [(neighbor, weight), ...]}
        """
        distances = {start: 0}
        heap = [(0, start)]
        
        while heap:
            dist, node = heapq.heappop(heap)
            
            if dist > distances.get(node, float('inf')):
                continue
            
            for neighbor, weight in graph.get(node, []):
                new_dist = dist + weight
                if new_dist < distances.get(neighbor, float('inf')):
                    distances[neighbor] = new_dist
                    heapq.heappush(heap, (new_dist, neighbor))
        
        return distances
    
    @staticmethod
    def topological_sort(graph: Dict[int, List[int]]) -> List[int]:
        """
        Topological sort using Kahn's algorithm.
        Time: O(V + E)
        """
        in_degree = defaultdict(int)
        all_nodes = set(graph.keys())
        
        for neighbors in graph.values():
            for neighbor in neighbors:
                in_degree[neighbor] += 1
                all_nodes.add(neighbor)
        
        queue = deque([n for n in all_nodes if in_degree[n] == 0])
        result = []
        
        while queue:
            node = queue.popleft()
            result.append(node)
            
            for neighbor in graph.get(node, []):
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)
        
        if len(result) != len(all_nodes):
            raise ValueError("Graph has a cycle - topological sort not possible")
        
        return result
    
    @staticmethod
    def detect_cycle(graph: Dict[int, List[int]]) -> bool:
        """
        Detect cycle in directed graph using DFS.
        Time: O(V + E)
        """
        WHITE, GRAY, BLACK = 0, 1, 2
        color = defaultdict(int)
        
        def dfs(node: int) -> bool:
            color[node] = GRAY
            for neighbor in graph.get(node, []):
                if color[neighbor] == GRAY:
                    return True  # Back edge found
                if color[neighbor] == WHITE and dfs(neighbor):
                    return True
            color[node] = BLACK
            return False
        
        for node in graph:
            if color[node] == WHITE:
                if dfs(node):
                    return True
        return False


# ==========================================================================
# DYNAMIC PROGRAMMING HELPERS
# ==========================================================================

class DPHelpers:
    """Common dynamic programming patterns and utilities."""
    
    @staticmethod
    def fibonacci(n: int, memo: Dict[int, int] = None) -> int:
        """Fibonacci with memoization. O(n) time."""
        if memo is None:
            memo = {}
        if n in memo:
            return memo[n]
        if n <= 1:
            return n
        memo[n] = DPHelpers.fibonacci(n - 1, memo) + DPHelpers.fibonacci(n - 2, memo)
        return memo[n]
    
    @staticmethod
    def longest_common_subsequence(s1: str, s2: str) -> int:
        """
        LCS length.
        Time: O(m*n)
        Space: O(m*n)
        """
        m, n = len(s1), len(s2)
        dp = [[0] * (n + 1) for _ in range(m + 1)]
        
        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if s1[i-1] == s2[j-1]:
                    dp[i][j] = dp[i-1][j-1] + 1
                else:
                    dp[i][j] = max(dp[i-1][j], dp[i][j-1])
        
        return dp[m][n]
    
    @staticmethod
    def knapsack_01(weights: List[int], values: List[int], capacity: int) -> int:
        """
        0/1 Knapsack problem.
        Time: O(n * capacity)
        Space: O(capacity)
        """
        n = len(weights)
        dp = [0] * (capacity + 1)
        
        for i in range(n):
            for w in range(capacity, weights[i] - 1, -1):
                dp[w] = max(dp[w], dp[w - weights[i]] + values[i])
        
        return dp[capacity]
    
    @staticmethod
    def coin_change(coins: List[int], amount: int) -> int:
        """
        Minimum coins needed.
        Time: O(amount * len(coins))
        Returns: -1 if not possible
        """
        dp = [float('inf')] * (amount + 1)
        dp[0] = 0
        
        for coin in coins:
            for x in range(coin, amount + 1):
                dp[x] = min(dp[x], dp[x - coin] + 1)
        
        return dp[amount] if dp[amount] != float('inf') else -1


# ==========================================================================
# DATA STRUCTURES
# ==========================================================================

class UnionFind:
    """
    Disjoint Set Union (Union-Find) data structure.
    Supports path compression and union by rank.
    """
    
    def __init__(self, n: int):
        self.parent = list(range(n))
        self.rank = [0] * n
        self.components = n
    
    def find(self, x: int) -> int:
        """Find root with path compression."""
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]
    
    def union(self, x: int, y: int) -> bool:
        """Union by rank. Returns True if merged."""
        px, py = self.find(x), self.find(y)
        if px == py:
            return False
        
        if self.rank[px] < self.rank[py]:
            px, py = py, px
        self.parent[py] = px
        if self.rank[px] == self.rank[py]:
            self.rank[px] += 1
        
        self.components -= 1
        return True
    
    def connected(self, x: int, y: int) -> bool:
        """Check if x and y are in same component."""
        return self.find(x) == self.find(y)


class Trie:
    """
    Trie (Prefix Tree) for string operations.
    Time: O(m) for insert/search where m is word length.
    """
    
    def __init__(self):
        self.root = {}
        self.END = '#'
    
    def insert(self, word: str) -> None:
        """Insert word into trie."""
        node = self.root
        for char in word:
            if char not in node:
                node[char] = {}
            node = node[char]
        node[self.END] = True
    
    def search(self, word: str) -> bool:
        """Return True if word is in trie."""
        node = self._find_node(word)
        return node is not None and self.END in node
    
    def starts_with(self, prefix: str) -> bool:
        """Return True if any word starts with prefix."""
        return self._find_node(prefix) is not None
    
    def _find_node(self, prefix: str) -> Optional[dict]:
        node = self.root
        for char in prefix:
            if char not in node:
                return None
            node = node[char]
        return node


class SegmentTree:
    """
    Segment Tree for range queries and updates.
    Supports: range sum, range min/max, point updates.
    """
    
    def __init__(self, arr: List[int], func: Callable = sum):
        self.n = len(arr)
        self.func = func
        self.identity = 0 if func == sum else float('inf')
        self.tree = [self.identity] * (2 * self.n)
        
        # Build tree
        for i in range(self.n):
            self.tree[self.n + i] = arr[i]
        for i in range(self.n - 1, 0, -1):
            self.tree[i] = self._combine(self.tree[2*i], self.tree[2*i + 1])
    
    def _combine(self, a: int, b: int) -> int:
        if self.func == sum:
            return a + b
        elif self.func == min:
            return min(a, b)
        elif self.func == max:
            return max(a, b)
        return self.func([a, b])
    
    def update(self, i: int, val: int) -> None:
        """Update arr[i] = val."""
        i += self.n
        self.tree[i] = val
        while i > 1:
            i //= 2
            self.tree[i] = self._combine(self.tree[2*i], self.tree[2*i + 1])
    
    def query(self, left: int, right: int) -> int:
        """Query range [left, right)."""
        result = self.identity
        left += self.n
        right += self.n
        
        while left < right:
            if left % 2 == 1:
                result = self._combine(result, self.tree[left])
                left += 1
            if right % 2 == 1:
                right -= 1
                result = self._combine(result, self.tree[right])
            left //= 2
            right //= 2
        
        return result


# ==========================================================================
# BACKTRACKING ALGORITHMS
# ==========================================================================

class BacktrackingAlgorithms:
    """Collection of backtracking algorithm implementations."""
    
    @staticmethod
    def permutations(nums: List[int]) -> List[List[int]]:
        """
        Generate all permutations.
        Time: O(n! * n)
        """
        result = []
        
        def backtrack(path: List[int], remaining: List[int]):
            if not remaining:
                result.append(path[:])
                return
            for i in range(len(remaining)):
                path.append(remaining[i])
                backtrack(path, remaining[:i] + remaining[i+1:])
                path.pop()
        
        backtrack([], nums)
        return result
    
    @staticmethod
    def subsets(nums: List[int]) -> List[List[int]]:
        """
        Generate all subsets (power set).
        Time: O(2^n)
        """
        result = []
        
        def backtrack(start: int, path: List[int]):
            result.append(path[:])
            for i in range(start, len(nums)):
                path.append(nums[i])
                backtrack(i + 1, path)
                path.pop()
        
        backtrack(0, [])
        return result
    
    @staticmethod
    def combinations(n: int, k: int) -> List[List[int]]:
        """
        Generate all k-combinations of 1..n.
        Time: O(C(n,k))
        """
        result = []
        
        def backtrack(start: int, path: List[int]):
            if len(path) == k:
                result.append(path[:])
                return
            for i in range(start, n + 1):
                path.append(i)
                backtrack(i + 1, path)
                path.pop()
        
        backtrack(1, [])
        return result
    
    @staticmethod
    def n_queens(n: int) -> List[List[str]]:
        """
        Solve N-Queens problem.
        Time: O(n!)
        """
        result = []
        cols = set()
        diag1 = set()  # row - col
        diag2 = set()  # row + col
        
        def backtrack(row: int, queens: List[int]):
            if row == n:
                board = []
                for q in queens:
                    board.append('.' * q + 'Q' + '.' * (n - q - 1))
                result.append(board)
                return
            
            for col in range(n):
                if col in cols or (row - col) in diag1 or (row + col) in diag2:
                    continue
                cols.add(col)
                diag1.add(row - col)
                diag2.add(row + col)
                queens.append(col)
                
                backtrack(row + 1, queens)
                
                queens.pop()
                cols.remove(col)
                diag1.remove(row - col)
                diag2.remove(row + col)
        
        backtrack(0, [])
        return result
    
    @staticmethod
    def solve_sudoku(board: List[List[str]]) -> bool:
        """
        Solve Sudoku puzzle in-place.
        Time: O(9^(empty cells))
        """
        def is_valid(row: int, col: int, num: str) -> bool:
            # Check row
            if num in board[row]:
                return False
            # Check column
            if any(board[r][col] == num for r in range(9)):
                return False
            # Check 3x3 box
            box_row, box_col = 3 * (row // 3), 3 * (col // 3)
            for r in range(box_row, box_row + 3):
                for c in range(box_col, box_col + 3):
                    if board[r][c] == num:
                        return False
            return True
        
        def solve() -> bool:
            for row in range(9):
                for col in range(9):
                    if board[row][col] == '.':
                        for num in '123456789':
                            if is_valid(row, col, num):
                                board[row][col] = num
                                if solve():
                                    return True
                                board[row][col] = '.'
                        return False
            return True
        
        return solve()


# ==========================================================================
# STRING ALGORITHMS
# ==========================================================================

class StringAlgorithms:
    """Collection of string algorithm implementations."""
    
    @staticmethod
    def kmp_search(text: str, pattern: str) -> List[int]:
        """
        Knuth-Morris-Pratt pattern matching.
        Time: O(n + m)
        Returns: list of starting indices where pattern found
        """
        if not pattern:
            return []
        
        # Build failure function
        lps = [0] * len(pattern)
        length = 0
        i = 1
        
        while i < len(pattern):
            if pattern[i] == pattern[length]:
                length += 1
                lps[i] = length
                i += 1
            elif length > 0:
                length = lps[length - 1]
            else:
                lps[i] = 0
                i += 1
        
        # Search
        result = []
        i = j = 0
        
        while i < len(text):
            if pattern[j] == text[i]:
                i += 1
                j += 1
            
            if j == len(pattern):
                result.append(i - j)
                j = lps[j - 1]
            elif i < len(text) and pattern[j] != text[i]:
                if j > 0:
                    j = lps[j - 1]
                else:
                    i += 1
        
        return result
    
    @staticmethod
    def z_function(s: str) -> List[int]:
        """
        Z-function computes for each position the length of longest
        substring starting from that position which is a prefix.
        Time: O(n)
        """
        n = len(s)
        z = [0] * n
        z[0] = n
        l = r = 0
        
        for i in range(1, n):
            if i < r:
                z[i] = min(r - i, z[i - l])
            while i + z[i] < n and s[z[i]] == s[i + z[i]]:
                z[i] += 1
            if i + z[i] > r:
                l, r = i, i + z[i]
        
        return z
    
    @staticmethod
    def rabin_karp(text: str, pattern: str, mod: int = 10**9 + 7) -> List[int]:
        """
        Rabin-Karp pattern matching with rolling hash.
        Time: O(n + m) average, O(nm) worst
        """
        if not pattern or len(pattern) > len(text):
            return []
        
        base = 256
        n, m = len(text), len(pattern)
        
        # Calculate hash of pattern and first window
        pattern_hash = 0
        window_hash = 0
        h = pow(base, m - 1, mod)
        
        for i in range(m):
            pattern_hash = (pattern_hash * base + ord(pattern[i])) % mod
            window_hash = (window_hash * base + ord(text[i])) % mod
        
        result = []
        
        for i in range(n - m + 1):
            if pattern_hash == window_hash:
                if text[i:i+m] == pattern:
                    result.append(i)
            
            if i < n - m:
                window_hash = ((window_hash - ord(text[i]) * h) * base + ord(text[i + m])) % mod
        
        return result
    
    @staticmethod
    def longest_palindrome_substring(s: str) -> str:
        """
        Manacher's algorithm for longest palindromic substring.
        Time: O(n)
        """
        if not s:
            return ""
        
        # Transform string: "abc" -> "#a#b#c#"
        t = '#' + '#'.join(s) + '#'
        n = len(t)
        p = [0] * n
        c = r = 0
        
        for i in range(n):
            if i < r:
                p[i] = min(r - i, p[2 * c - i])
            
            while i - p[i] - 1 >= 0 and i + p[i] + 1 < n and t[i - p[i] - 1] == t[i + p[i] + 1]:
                p[i] += 1
            
            if i + p[i] > r:
                c, r = i, i + p[i]
        
        max_len = max(p)
        center = p.index(max_len)
        start = (center - max_len) // 2
        
        return s[start:start + max_len]
    
    @staticmethod
    def is_anagram(s1: str, s2: str) -> bool:
        """Check if two strings are anagrams. O(n)"""
        if len(s1) != len(s2):
            return False
        count = {}
        for c in s1:
            count[c] = count.get(c, 0) + 1
        for c in s2:
            count[c] = count.get(c, 0) - 1
            if count[c] < 0:
                return False
        return True
    
    @staticmethod
    def longest_common_prefix(strs: List[str]) -> str:
        """Find longest common prefix. O(S) where S is sum of all chars."""
        if not strs:
            return ""
        prefix = strs[0]
        for s in strs[1:]:
            while not s.startswith(prefix):
                prefix = prefix[:-1]
                if not prefix:
                    return ""
        return prefix


# ==========================================================================
# BIT MANIPULATION
# ==========================================================================

class BitManipulation:
    """Common bit manipulation techniques."""
    
    @staticmethod
    def count_set_bits(n: int) -> int:
        """Brian Kernighan's algorithm. O(set bits)"""
        count = 0
        while n:
            n &= (n - 1)
            count += 1
        return count
    
    @staticmethod
    def is_power_of_two(n: int) -> bool:
        """Check if n is power of 2. O(1)"""
        return n > 0 and (n & (n - 1)) == 0
    
    @staticmethod
    def single_number(nums: List[int]) -> int:
        """Find number appearing once (others twice). O(n)"""
        result = 0
        for num in nums:
            result ^= num
        return result
    
    @staticmethod
    def get_bit(n: int, i: int) -> int:
        """Get ith bit (0-indexed from right)."""
        return (n >> i) & 1
    
    @staticmethod
    def set_bit(n: int, i: int) -> int:
        """Set ith bit to 1."""
        return n | (1 << i)
    
    @staticmethod
    def clear_bit(n: int, i: int) -> int:
        """Clear ith bit to 0."""
        return n & ~(1 << i)
    
    @staticmethod
    def toggle_bit(n: int, i: int) -> int:
        """Toggle ith bit."""
        return n ^ (1 << i)


# ==========================================================================
# MATH UTILITIES
# ==========================================================================

class MathUtilities:
    """Common mathematical algorithms."""
    
    @staticmethod
    def gcd(a: int, b: int) -> int:
        """Greatest Common Divisor (Euclidean algorithm)."""
        while b:
            a, b = b, a % b
        return a
    
    @staticmethod
    def lcm(a: int, b: int) -> int:
        """Least Common Multiple."""
        return abs(a * b) // MathUtilities.gcd(a, b)
    
    @staticmethod
    def sieve_of_eratosthenes(n: int) -> List[int]:
        """Generate all primes up to n. O(n log log n)"""
        if n < 2:
            return []
        is_prime = [True] * (n + 1)
        is_prime[0] = is_prime[1] = False
        
        for i in range(2, int(n**0.5) + 1):
            if is_prime[i]:
                for j in range(i*i, n + 1, i):
                    is_prime[j] = False
        
        return [i for i in range(n + 1) if is_prime[i]]
    
    @staticmethod
    def mod_pow(base: int, exp: int, mod: int) -> int:
        """Modular exponentiation. O(log exp)"""
        result = 1
        base %= mod
        while exp > 0:
            if exp & 1:
                result = (result * base) % mod
            exp >>= 1
            base = (base * base) % mod
        return result
    
    @staticmethod
    def is_prime(n: int) -> bool:
        """Primality test. O(sqrt(n))"""
        if n < 2:
            return False
        if n == 2:
            return True
        if n % 2 == 0:
            return False
        for i in range(3, int(n**0.5) + 1, 2):
            if n % i == 0:
                return False
        return True


# ==========================================================================
# INTERVAL ALGORITHMS
# ==========================================================================

class IntervalAlgorithms:
    """Algorithms for interval problems."""
    
    @staticmethod
    def merge_intervals(intervals: List[List[int]]) -> List[List[int]]:
        """
        Merge overlapping intervals.
        Time: O(n log n)
        Space: O(n)
        """
        if not intervals:
            return []
        
        intervals.sort(key=lambda x: x[0])
        merged = [intervals[0]]
        
        for start, end in intervals[1:]:
            if start <= merged[-1][1]:
                merged[-1][1] = max(merged[-1][1], end)
            else:
                merged.append([start, end])
        
        return merged
    
    @staticmethod
    def insert_interval(intervals: List[List[int]], new: List[int]) -> List[List[int]]:
        """
        Insert and merge new interval into sorted non-overlapping intervals.
        Time: O(n)
        """
        result = []
        i = 0
        n = len(intervals)
        
        # Add all intervals before new
        while i < n and intervals[i][1] < new[0]:
            result.append(intervals[i])
            i += 1
        
        # Merge overlapping intervals
        while i < n and intervals[i][0] <= new[1]:
            new[0] = min(new[0], intervals[i][0])
            new[1] = max(new[1], intervals[i][1])
            i += 1
        result.append(new)
        
        # Add remaining intervals
        while i < n:
            result.append(intervals[i])
            i += 1
        
        return result
    
    @staticmethod
    def interval_intersection(A: List[List[int]], B: List[List[int]]) -> List[List[int]]:
        """
        Find intersection of two sorted interval lists.
        Time: O(m + n)
        """
        result = []
        i = j = 0
        
        while i < len(A) and j < len(B):
            lo = max(A[i][0], B[j][0])
            hi = min(A[i][1], B[j][1])
            
            if lo <= hi:
                result.append([lo, hi])
            
            if A[i][1] < B[j][1]:
                i += 1
            else:
                j += 1
        
        return result
    
    @staticmethod
    def min_meeting_rooms(intervals: List[List[int]]) -> int:
        """
        Minimum meeting rooms required (max concurrent meetings).
        Time: O(n log n)
        """
        if not intervals:
            return 0
        
        starts = sorted([i[0] for i in intervals])
        ends = sorted([i[1] for i in intervals])
        
        rooms = max_rooms = 0
        s = e = 0
        
        while s < len(starts):
            if starts[s] < ends[e]:
                rooms += 1
                max_rooms = max(max_rooms, rooms)
                s += 1
            else:
                rooms -= 1
                e += 1
        
        return max_rooms


# ==========================================================================
# ADVANCED GRAPH ALGORITHMS
# ==========================================================================

class AdvancedGraphAlgorithms:
    """Advanced graph algorithms: Floyd-Warshall, Bellman-Ford, Kruskal's MST."""
    
    @staticmethod
    def floyd_warshall(graph: List[List[int]]) -> List[List[int]]:
        """
        All-pairs shortest paths.
        Time: O(V³)
        Space: O(V²)
        
        graph[i][j] = weight from i to j (use float('inf') for no edge)
        """
        n = len(graph)
        dist = [row[:] for row in graph]
        
        for k in range(n):
            for i in range(n):
                for j in range(n):
                    if dist[i][k] + dist[k][j] < dist[i][j]:
                        dist[i][j] = dist[i][k] + dist[k][j]
        
        return dist
    
    @staticmethod
    def bellman_ford(edges: List[Tuple[int, int, int]], n: int, src: int) -> Optional[Dict[int, int]]:
        """
        Single-source shortest paths with negative weights.
        Time: O(V * E)
        
        edges: [(u, v, weight), ...]
        Returns None if negative cycle exists.
        """
        dist = {i: float('inf') for i in range(n)}
        dist[src] = 0
        
        # Relax edges V-1 times
        for _ in range(n - 1):
            for u, v, w in edges:
                if dist[u] != float('inf') and dist[u] + w < dist[v]:
                    dist[v] = dist[u] + w
        
        # Check for negative cycle
        for u, v, w in edges:
            if dist[u] != float('inf') and dist[u] + w < dist[v]:
                return None
        
        return dist
    
    @staticmethod
    def kruskal_mst(n: int, edges: List[Tuple[int, int, int]]) -> Tuple[int, List[Tuple[int, int, int]]]:
        """
        Minimum Spanning Tree using Kruskal's algorithm.
        Time: O(E log E)
        
        edges: [(u, v, weight), ...]
        Returns: (total_weight, mst_edges)
        """
        # Sort edges by weight
        edges = sorted(edges, key=lambda x: x[2])
        
        # Union-Find
        parent = list(range(n))
        rank = [0] * n
        
        def find(x):
            if parent[x] != x:
                parent[x] = find(parent[x])
            return parent[x]
        
        def union(x, y):
            px, py = find(x), find(y)
            if px == py:
                return False
            if rank[px] < rank[py]:
                px, py = py, px
            parent[py] = px
            if rank[px] == rank[py]:
                rank[px] += 1
            return True
        
        mst_edges = []
        total_weight = 0
        
        for u, v, w in edges:
            if union(u, v):
                mst_edges.append((u, v, w))
                total_weight += w
                if len(mst_edges) == n - 1:
                    break
        
        return total_weight, mst_edges
    
    @staticmethod
    def prim_mst(graph: Dict[int, List[Tuple[int, int]]]) -> Tuple[int, List[Tuple[int, int, int]]]:
        """
        Minimum Spanning Tree using Prim's algorithm.
        Time: O((V + E) log V)
        
        graph: {node: [(neighbor, weight), ...]}
        """
        if not graph:
            return 0, []
        
        start = next(iter(graph))
        visited = {start}
        edges = [(w, start, v) for v, w in graph.get(start, [])]
        heapq.heapify(edges)
        
        mst_edges = []
        total_weight = 0
        
        while edges and len(visited) < len(graph):
            weight, u, v = heapq.heappop(edges)
            if v in visited:
                continue
            
            visited.add(v)
            mst_edges.append((u, v, weight))
            total_weight += weight
            
            for neighbor, w in graph.get(v, []):
                if neighbor not in visited:
                    heapq.heappush(edges, (w, v, neighbor))
        
        return total_weight, mst_edges


# ==========================================================================
# TREE ALGORITHMS
# ==========================================================================

class TreeNode:
    """Binary tree node."""
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


class TreeAlgorithms:
    """Algorithms for binary trees."""
    
    @staticmethod
    def preorder(root: Optional[TreeNode]) -> List[int]:
        """Preorder traversal (Root-Left-Right). O(n)"""
        if not root:
            return []
        result = []
        stack = [root]
        while stack:
            node = stack.pop()
            result.append(node.val)
            if node.right:
                stack.append(node.right)
            if node.left:
                stack.append(node.left)
        return result
    
    @staticmethod
    def inorder(root: Optional[TreeNode]) -> List[int]:
        """Inorder traversal (Left-Root-Right). O(n)"""
        result = []
        stack = []
        current = root
        while current or stack:
            while current:
                stack.append(current)
                current = current.left
            current = stack.pop()
            result.append(current.val)
            current = current.right
        return result
    
    @staticmethod
    def postorder(root: Optional[TreeNode]) -> List[int]:
        """Postorder traversal (Left-Right-Root). O(n)"""
        if not root:
            return []
        result = []
        stack = [root]
        while stack:
            node = stack.pop()
            result.append(node.val)
            if node.left:
                stack.append(node.left)
            if node.right:
                stack.append(node.right)
        return result[::-1]
    
    @staticmethod
    def level_order(root: Optional[TreeNode]) -> List[List[int]]:
        """Level order traversal (BFS). O(n)"""
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
    
    @staticmethod
    def max_depth(root: Optional[TreeNode]) -> int:
        """Maximum depth of binary tree. O(n)"""
        if not root:
            return 0
        return 1 + max(TreeAlgorithms.max_depth(root.left), 
                       TreeAlgorithms.max_depth(root.right))
    
    @staticmethod
    def is_balanced(root: Optional[TreeNode]) -> bool:
        """Check if tree is height-balanced. O(n)"""
        def check(node):
            if not node:
                return 0
            left = check(node.left)
            right = check(node.right)
            if left == -1 or right == -1 or abs(left - right) > 1:
                return -1
            return max(left, right) + 1
        return check(root) != -1
    
    @staticmethod
    def is_valid_bst(root: Optional[TreeNode]) -> bool:
        """Check if valid Binary Search Tree. O(n)"""
        def validate(node, low=float('-inf'), high=float('inf')):
            if not node:
                return True
            if not (low < node.val < high):
                return False
            return (validate(node.left, low, node.val) and 
                    validate(node.right, node.val, high))
        return validate(root)
    
    @staticmethod
    def lowest_common_ancestor(root: TreeNode, p: TreeNode, q: TreeNode) -> Optional[TreeNode]:
        """Find LCA of two nodes in binary tree. O(n)"""
        if not root or root == p or root == q:
            return root
        left = TreeAlgorithms.lowest_common_ancestor(root.left, p, q)
        right = TreeAlgorithms.lowest_common_ancestor(root.right, p, q)
        if left and right:
            return root
        return left if left else right



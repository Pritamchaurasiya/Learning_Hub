# DSA Learning Guide - Complete Algorithm Reference

## Table of Contents

1. [Sorting Algorithms](#sorting)
2. [Searching Algorithms](#searching)
3. [Graph Algorithms](#graph)
4. [Dynamic Programming](#dynamic-programming)
5. [Backtracking](#backtracking)
6. [String Algorithms](#string-algorithms)
7. [Data Structures](#data-structures)
8. [Bit Manipulation](#bit-manipulation)
9. [Math Utilities](#math-utilities)

---

## Sorting Algorithms {#sorting}

### QuickSort

```python
# Time: O(n log n) average, O(n²) worst
# Space: O(log n)
# Best for: General purpose, in-place sorting

def quick_sort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quick_sort(left) + middle + quick_sort(right)
```

**When to Use**: Default choice for sorting, especially when average case matters more than worst case.

### MergeSort

- **Time**: O(n log n) always
- **Space**: O(n)
- **Use When**: Need stable sort or guaranteed O(n log n)

### HeapSort

- **Time**: O(n log n)
- **Space**: O(1) in-place
- **Use When**: Memory is critical

---

## Searching Algorithms {#searching}

### Binary Search

```python
# Time: O(log n)
# Prerequisites: Sorted array

def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target: return mid
        elif arr[mid] < target: left = mid + 1
        else: right = mid - 1
    return -1
```

**Variations**:

- `binary_search_left`: Find leftmost insertion point
- `binary_search_right`: Find rightmost insertion point

---

## Graph Algorithms {#graph}

### BFS vs DFS

| Algorithm | Use Case                                        | Time   | Space |
| --------- | ----------------------------------------------- | ------ | ----- |
| BFS       | Shortest path (unweighted), level order         | O(V+E) | O(V)  |
| DFS       | Path finding, cycle detection, topological sort | O(V+E) | O(V)  |

### Dijkstra's Algorithm

```python
# Shortest path in weighted graph (non-negative weights)
# Time: O((V+E) log V)
```

**Use When**: Finding shortest path in weighted graphs with non-negative edges.

---

## Dynamic Programming {#dynamic-programming}

### Common Patterns

1. **Memoization (Top-Down)**
   - Recursive with cache
   - Example: Fibonacci

2. **Tabulation (Bottom-Up)**
   - Iterative with table
   - Example: Knapsack

### Classic Problems

| Problem                    | Time        | Space     |
| -------------------------- | ----------- | --------- |
| Longest Common Subsequence | O(mn)       | O(mn)     |
| 0/1 Knapsack               | O(n×W)      | O(W)      |
| Coin Change                | O(n×amount) | O(amount) |

---

## Backtracking {#backtracking}

### Template

```python
def backtrack(path, choices):
    if is_solution(path):
        result.append(path[:])
        return
    for choice in choices:
        if is_valid(choice):
            path.append(choice)
            backtrack(path, remaining_choices)
            path.pop()  # Undo
```

### Classic Problems

- **Permutations**: All orderings of elements
- **Subsets**: Power set (2^n subsets)
- **N-Queens**: Place N queens on NxN board
- **Sudoku**: Fill 9x9 grid

---

## String Algorithms {#string-algorithms}

### Pattern Matching

| Algorithm  | Time       | Best For                      |
| ---------- | ---------- | ----------------------------- |
| KMP        | O(n+m)     | Single pattern, many searches |
| Rabin-Karp | O(n+m) avg | Multiple patterns             |
| Z-Function | O(n)       | Prefix matching               |

### Manacher's Algorithm

- **Purpose**: Find longest palindromic substring
- **Time**: O(n)
- **Key Insight**: Reuse previously computed palindrome info

---

## Data Structures {#data-structures}

### Union-Find (Disjoint Set)

```python
# Operations: O(α(n)) ≈ O(1) amortized
# Use: Connected components, cycle detection, Kruskal's MST
```

### Trie (Prefix Tree)

```python
# Insert/Search: O(m) where m = word length
# Use: Autocomplete, spell check, IP routing
```

### Segment Tree

```python
# Build: O(n)
# Query/Update: O(log n)
# Use: Range sum, min/max queries
```

---

## Bit Manipulation {#bit-manipulation}

### Common Operations

```python
# Count set bits (Brian Kernighan)
while n:
    n &= (n - 1)
    count += 1

# Check power of 2
is_power_of_2 = n > 0 and (n & (n-1)) == 0

# Get/Set/Clear/Toggle bit
get_bit = (n >> i) & 1
set_bit = n | (1 << i)
clear_bit = n & ~(1 << i)
toggle_bit = n ^ (1 << i)
```

---

## Math Utilities {#math-utilities}

### Essential Algorithms

| Algorithm              | Time            | Use             |
| ---------------------- | --------------- | --------------- |
| GCD (Euclidean)        | O(log min(a,b)) | Common divisor  |
| Sieve of Eratosthenes  | O(n log log n)  | Find all primes |
| Modular Exponentiation | O(log exp)      | Large power mod |
| Primality Test         | O(√n)           | Check if prime  |

---

## Complexity Cheat Sheet

### Time Complexities (Fast → Slow)

1. O(1) - Constant
2. O(log n) - Logarithmic
3. O(n) - Linear
4. O(n log n) - Linearithmic
5. O(n²) - Quadratic
6. O(2^n) - Exponential
7. O(n!) - Factorial

### Remember

- **n ≤ 10**: O(n!) OK
- **n ≤ 20**: O(2^n) OK
- **n ≤ 500**: O(n³) OK
- **n ≤ 10,000**: O(n²) OK
- **n ≤ 1,000,000**: O(n log n) needed
- **n > 1,000,000**: O(n) or O(log n) needed

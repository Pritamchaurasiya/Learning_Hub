"""
Comprehensive Test Suite for DSA Algorithms

Tests all algorithm implementations for correctness.
Run with: pytest apps/dsa/tests/test_algorithms.py -v
"""

import pytest
from apps.dsa.algorithms import (
    SortingAlgorithms,
    SearchingAlgorithms,
    GraphAlgorithms,
    DPHelpers,
    BacktrackingAlgorithms,
    StringAlgorithms,
    BitManipulation,
    MathUtilities,
    UnionFind,
    Trie,
    SegmentTree
)


class TestSortingAlgorithms:
    """Test sorting algorithm implementations."""
    
    def test_quick_sort_basic(self):
        assert SortingAlgorithms.quick_sort([3, 1, 4, 1, 5]) == [1, 1, 3, 4, 5]
    
    def test_quick_sort_empty(self):
        assert SortingAlgorithms.quick_sort([]) == []
    
    def test_quick_sort_single(self):
        assert SortingAlgorithms.quick_sort([42]) == [42]
    
    def test_quick_sort_sorted(self):
        assert SortingAlgorithms.quick_sort([1, 2, 3, 4, 5]) == [1, 2, 3, 4, 5]
    
    def test_quick_sort_reverse(self):
        assert SortingAlgorithms.quick_sort([5, 4, 3, 2, 1]) == [1, 2, 3, 4, 5]
    
    def test_merge_sort_basic(self):
        assert SortingAlgorithms.merge_sort([3, 1, 4, 1, 5]) == [1, 1, 3, 4, 5]
    
    def test_merge_sort_empty(self):
        assert SortingAlgorithms.merge_sort([]) == []
    
    def test_heap_sort_basic(self):
        arr = [3, 1, 4, 1, 5]
        assert SortingAlgorithms.heap_sort(arr.copy()) == [1, 1, 3, 4, 5]
    
    def test_counting_sort_basic(self):
        assert SortingAlgorithms.counting_sort([3, 1, 4, 1, 5]) == [1, 1, 3, 4, 5]
    
    def test_counting_sort_empty(self):
        assert SortingAlgorithms.counting_sort([]) == []


class TestSearchingAlgorithms:
    """Test searching algorithm implementations."""
    
    def test_binary_search_found(self):
        assert SearchingAlgorithms.binary_search([1, 2, 3, 4, 5], 3) == 2
    
    def test_binary_search_not_found(self):
        assert SearchingAlgorithms.binary_search([1, 2, 3, 4, 5], 6) == -1
    
    def test_binary_search_first(self):
        assert SearchingAlgorithms.binary_search([1, 2, 3, 4, 5], 1) == 0
    
    def test_binary_search_last(self):
        assert SearchingAlgorithms.binary_search([1, 2, 3, 4, 5], 5) == 4
    
    def test_binary_search_left(self):
        assert SearchingAlgorithms.binary_search_left([1, 2, 2, 2, 3], 2) == 1
    
    def test_binary_search_right(self):
        assert SearchingAlgorithms.binary_search_right([1, 2, 2, 2, 3], 2) == 4
    
    def test_ternary_search(self):
        assert SearchingAlgorithms.ternary_search([1, 2, 3, 4, 5], 3) == 2


class TestGraphAlgorithms:
    """Test graph algorithm implementations."""
    
    def test_bfs_basic(self):
        graph = {0: [1, 2], 1: [2], 2: [0, 3], 3: [3]}
        result = GraphAlgorithms.bfs(graph, 0)
        assert 0 in result and 1 in result and 2 in result
    
    def test_dfs_basic(self):
        graph = {0: [1, 2], 1: [2], 2: [0, 3], 3: [3]}
        result = GraphAlgorithms.dfs(graph, 0)
        assert 0 in result and 1 in result and 2 in result
    
    def test_dijkstra_basic(self):
        graph = {
            0: [(1, 4), (2, 1)],
            1: [(3, 1)],
            2: [(1, 2), (3, 5)],
            3: []
        }
        distances = GraphAlgorithms.dijkstra(graph, 0)
        assert distances[0] == 0
        assert distances[2] == 1
        assert distances[1] == 3
        assert distances[3] == 4
    
    def test_topological_sort(self):
        graph = {0: [1, 2], 1: [3], 2: [3], 3: []}
        result = GraphAlgorithms.topological_sort(graph)
        assert result.index(0) < result.index(1)
        assert result.index(0) < result.index(2)
    
    def test_detect_cycle_true(self):
        graph = {0: [1], 1: [2], 2: [0]}
        assert GraphAlgorithms.detect_cycle(graph) == True
    
    def test_detect_cycle_false(self):
        graph = {0: [1, 2], 1: [3], 2: [3], 3: []}
        assert GraphAlgorithms.detect_cycle(graph) == False


class TestDPHelpers:
    """Test dynamic programming helpers."""
    
    def test_fibonacci_basic(self):
        assert DPHelpers.fibonacci(10) == 55
    
    def test_fibonacci_zero(self):
        assert DPHelpers.fibonacci(0) == 0
    
    def test_fibonacci_one(self):
        assert DPHelpers.fibonacci(1) == 1
    
    def test_lcs(self):
        assert DPHelpers.longest_common_subsequence("abcde", "ace") == 3
    
    def test_lcs_no_common(self):
        assert DPHelpers.longest_common_subsequence("abc", "xyz") == 0
    
    def test_knapsack(self):
        weights = [1, 2, 3]
        values = [6, 10, 12]
        capacity = 5
        assert DPHelpers.knapsack_01(weights, values, capacity) == 22
    
    def test_coin_change_possible(self):
        assert DPHelpers.coin_change([1, 2, 5], 11) == 3
    
    def test_coin_change_impossible(self):
        assert DPHelpers.coin_change([2], 3) == -1


class TestBacktrackingAlgorithms:
    """Test backtracking algorithm implementations."""
    
    def test_permutations_basic(self):
        result = BacktrackingAlgorithms.permutations([1, 2])
        assert len(result) == 2
        assert [1, 2] in result
        assert [2, 1] in result
    
    def test_permutations_single(self):
        assert BacktrackingAlgorithms.permutations([1]) == [[1]]
    
    def test_subsets_basic(self):
        result = BacktrackingAlgorithms.subsets([1, 2])
        assert len(result) == 4
        assert [] in result
        assert [1] in result
        assert [2] in result
        assert [1, 2] in result
    
    def test_combinations(self):
        result = BacktrackingAlgorithms.combinations(4, 2)
        assert len(result) == 6
        assert [1, 2] in result
    
    def test_n_queens_4(self):
        result = BacktrackingAlgorithms.n_queens(4)
        assert len(result) == 2


class TestStringAlgorithms:
    """Test string algorithm implementations."""
    
    def test_kmp_search_found(self):
        assert StringAlgorithms.kmp_search("abcabc", "abc") == [0, 3]
    
    def test_kmp_search_not_found(self):
        assert StringAlgorithms.kmp_search("abcde", "xyz") == []
    
    def test_z_function(self):
        result = StringAlgorithms.z_function("aabaa")
        assert result[0] == 5
    
    def test_rabin_karp(self):
        assert StringAlgorithms.rabin_karp("abcabc", "abc") == [0, 3]
    
    def test_longest_palindrome(self):
        result = StringAlgorithms.longest_palindrome_substring("babad")
        assert result in ["bab", "aba"]
    
    def test_is_anagram_true(self):
        assert StringAlgorithms.is_anagram("listen", "silent") == True
    
    def test_is_anagram_false(self):
        assert StringAlgorithms.is_anagram("hello", "world") == False
    
    def test_longest_common_prefix(self):
        assert StringAlgorithms.longest_common_prefix(["flower", "flow", "flight"]) == "fl"


class TestBitManipulation:
    """Test bit manipulation algorithms."""
    
    def test_count_set_bits(self):
        assert BitManipulation.count_set_bits(7) == 3
        assert BitManipulation.count_set_bits(0) == 0
    
    def test_is_power_of_two(self):
        assert BitManipulation.is_power_of_two(16) == True
        assert BitManipulation.is_power_of_two(18) == False
    
    def test_single_number(self):
        assert BitManipulation.single_number([4, 1, 2, 1, 2]) == 4
    
    def test_get_bit(self):
        assert BitManipulation.get_bit(5, 0) == 1
        assert BitManipulation.get_bit(5, 1) == 0
    
    def test_set_bit(self):
        assert BitManipulation.set_bit(5, 1) == 7
    
    def test_clear_bit(self):
        assert BitManipulation.clear_bit(7, 1) == 5


class TestMathUtilities:
    """Test math utility algorithms."""
    
    def test_gcd(self):
        assert MathUtilities.gcd(48, 18) == 6
    
    def test_lcm(self):
        assert MathUtilities.lcm(4, 6) == 12
    
    def test_sieve(self):
        primes = MathUtilities.sieve_of_eratosthenes(20)
        assert primes == [2, 3, 5, 7, 11, 13, 17, 19]
    
    def test_mod_pow(self):
        assert MathUtilities.mod_pow(2, 10, 1000) == 24
    
    def test_is_prime(self):
        assert MathUtilities.is_prime(17) == True
        assert MathUtilities.is_prime(16) == False


class TestUnionFind:
    """Test Union-Find data structure."""
    
    def test_basic_operations(self):
        uf = UnionFind(5)
        uf.union(0, 1)
        uf.union(2, 3)
        assert uf.connected(0, 1) == True
        assert uf.connected(0, 2) == False
    
    def test_components(self):
        uf = UnionFind(5)
        assert uf.components == 5
        uf.union(0, 1)
        assert uf.components == 4


class TestTrie:
    """Test Trie data structure."""
    
    def test_insert_and_search(self):
        trie = Trie()
        trie.insert("apple")
        assert trie.search("apple") == True
        assert trie.search("app") == False
    
    def test_starts_with(self):
        trie = Trie()
        trie.insert("apple")
        assert trie.starts_with("app") == True
        assert trie.starts_with("xyz") == False


class TestSegmentTree:
    """Test Segment Tree data structure."""
    
    def test_range_sum_query(self):
        arr = [1, 3, 5, 7, 9, 11]
        st = SegmentTree(arr)
        assert st.query(1, 4) == 15
    
    def test_point_update(self):
        arr = [1, 3, 5, 7, 9, 11]
        st = SegmentTree(arr)
        st.update(2, 10)
        assert st.query(1, 4) == 20

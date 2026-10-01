import { describe, it, expect } from 'vitest'
import {
  generateBubbleSort,
  generateSelectionSort,
  generateInsertionSort,
  generateQuickSort,
  generateMergeSort,
  generateDijkstra,
  generateAStar,
  generateBFS,
  TreeEngine,
  type TreeNodeVisual,
  generateKnapsackDP,
  generateLCS,
  generateEditDistance,
  DataStructureEngines,
} from '../index'

describe('Frontend DSA Engines Suite', () => {
  describe('Sorting Step Generators', () => {
    it('Bubble Sort should sort an array correctly to final frame', () => {
      const arr = [5, 2, 8, 1, 9]
      const gen = generateBubbleSort(arr)
      const frames = Array.from(gen)

      expect(frames.length).toBeGreaterThan(0)
      const lastFrame = frames[frames.length - 1]!
      expect(lastFrame.array).toEqual([1, 2, 5, 8, 9])
      expect(lastFrame.comparisons).toBeGreaterThan(0)
    })

    it('Selection Sort should sort array by finding minimums', () => {
      const arr = [29, 10, 14, 37, 13]
      const gen = generateSelectionSort(arr)
      const frames = Array.from(gen)

      expect(frames.length).toBeGreaterThan(0)
      const lastFrame = frames[frames.length - 1]!
      expect(lastFrame.array).toEqual([10, 13, 14, 29, 37])
    })

    it('Insertion Sort should build sorted array by shifting', () => {
      const arr = [12, 11, 13, 5, 6]
      const gen = generateInsertionSort(arr)
      const frames = Array.from(gen)

      expect(frames.length).toBeGreaterThan(0)
      const lastFrame = frames[frames.length - 1]!
      expect(lastFrame.array).toEqual([5, 6, 11, 12, 13])
    })

    it('Quick Sort should sort an array accurately', () => {
      const arr = [42, 12, 88, 3, 19, 64]
      const gen = generateQuickSort(arr)
      const frames = Array.from(gen)

      expect(frames.length).toBeGreaterThan(0)
      const lastFrame = frames[frames.length - 1]!
      expect(lastFrame.array).toEqual([3, 12, 19, 42, 64, 88])
    })

    it('Merge Sort should divide and merge properly', () => {
      const arr = [100, 50, 25, 75]
      const gen = generateMergeSort(arr)
      const frames = Array.from(gen)

      expect(frames.length).toBeGreaterThan(0)
      const lastFrame = frames[frames.length - 1]!
      expect(lastFrame.array).toEqual([25, 50, 75, 100])
    })
  })

  describe('Pathfinding Step Generators', () => {
    it('Dijkstra should find optimal path on grid', () => {
      const grid = Array.from({ length: 5 }, () => Array(5).fill('empty' as const))
      const gen = generateDijkstra(grid, [0, 0], [4, 4])
      const frames = Array.from(gen)

      expect(frames.length).toBeGreaterThan(0)
      const lastFrame = frames[frames.length - 1]!
      expect(lastFrame.pathLength).toBeGreaterThan(0)
      expect(lastFrame.description).toContain('Target Reached')
    })

    it('A* Search should find target using heuristic', () => {
      const grid = Array.from({ length: 6 }, () => Array(6).fill('empty' as const))
      grid[1]![1] = 'wall'
      grid[2]![1] = 'wall'

      const gen = generateAStar(grid, [0, 0], [5, 5])
      const frames = Array.from(gen)

      expect(frames.length).toBeGreaterThan(0)
      const lastFrame = frames[frames.length - 1]!
      expect(lastFrame.pathLength).toBeGreaterThan(0)
    })

    it('BFS should explore grid layer by layer', () => {
      const grid = Array.from({ length: 4 }, () => Array(4).fill('empty' as const))
      const gen = generateBFS(grid, [0, 0], [3, 3])
      const frames = Array.from(gen)

      expect(frames.length).toBeGreaterThan(0)
      const lastFrame = frames[frames.length - 1]!
      expect(lastFrame.pathLength).toBe(7)
    })
  })

  describe('Tree & AVL Engine', () => {
    it('should balance AVL tree on unbalanced insertions', () => {
      let root: TreeNodeVisual | null = null
      root = TreeEngine.insertAVL(root, 10)
      root = TreeEngine.insertAVL(root, 20)
      root = TreeEngine.insertAVL(root, 30)

      expect(root.value).toBe(20)
      expect(root.left?.value).toBe(10)
      expect(root.right?.value).toBe(30)
      expect(TreeEngine.getHeight(root)).toBe(2)
      expect(TreeEngine.inOrder(root)).toEqual([10, 20, 30])
    })

    it('should compute traversals correctly', () => {
      let root: TreeNodeVisual | null = null
      const vals = [50, 25, 75, 10, 30]
      for (const v of vals) root = TreeEngine.insertAVL(root, v)

      const inOrder = TreeEngine.inOrder(root)
      expect(inOrder).toEqual([10, 25, 30, 50, 75])
    })
  })

  describe('Dynamic Programming Step Generators', () => {
    it('Knapsack DP generator should calculate max value correctly', () => {
      const items = [
        { id: 1, name: 'Item 1', weight: 2, value: 6 },
        { id: 2, name: 'Item 2', weight: 2, value: 10 },
        { id: 3, name: 'Item 3', weight: 3, value: 12 },
      ]
      const capacity = 5
      const gen = generateKnapsackDP(items, capacity)
      const frames = Array.from(gen)

      expect(frames.length).toBeGreaterThan(0)
      const lastFrame = frames[frames.length - 1]!
      expect(lastFrame.dp[3]![5]).toBe(22)
    })

    it('LCS DP generator should find longest common subsequence', () => {
      const gen = generateLCS('ABCDE', 'ACE')
      const frames = Array.from(gen)

      expect(frames.length).toBeGreaterThan(0)
      const lastFrame = frames[frames.length - 1]!
      expect(lastFrame.dp[5]![3]).toBe(3)
      expect(lastFrame.description).toContain('Length = 3')
    })

    it('Edit Distance DP generator should calculate minimum operations', () => {
      const gen = generateEditDistance('horse', 'ros')
      const frames = Array.from(gen)

      expect(frames.length).toBeGreaterThan(0)
      const lastFrame = frames[frames.length - 1]!
      expect(lastFrame.dp[5]![3]).toBe(3)
      expect(lastFrame.description).toContain('Minimum Edit Distance = 3')
    })
  })

  describe('Data Structure Stack & Queue Operations', () => {
    it('should push and pop stack with LIFO semantics', () => {
      const s1 = DataStructureEngines.stackPush([], 10).stack
      const s2 = DataStructureEngines.stackPush(s1, 20).stack
      const s3 = DataStructureEngines.stackPush(s2, 30).stack

      expect(s3.length).toBe(3)
      const popRes = DataStructureEngines.stackPop(s3)
      expect(popRes.poppedItem?.value).toBe(30)
      expect(popRes.stack.length).toBe(2)
    })

    it('should enqueue and dequeue with FIFO semantics', () => {
      const q1 = DataStructureEngines.queueEnqueue([], 'A').queue
      const q2 = DataStructureEngines.queueEnqueue(q1, 'B').queue

      expect(q2.length).toBe(2)
      const deqRes = DataStructureEngines.queueDequeue(q2)
      expect(deqRes.dequeuedItem?.value).toBe('A')
      expect(deqRes.queue.length).toBe(1)
      expect(deqRes.queue[0]?.value).toBe('B')
    })

    it('should reverse linked list nodes in-place', () => {
      const ll = DataStructureEngines.createLinkedList([1, 2, 3])
      const reversed = DataStructureEngines.reverseLinkedList(ll)
      expect(reversed[0]?.value).toBe(3)
      expect(reversed[1]?.value).toBe(2)
      expect(reversed[2]?.value).toBe(1)
    })
  })
})

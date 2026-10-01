import { Trie } from '../../src/dsa/Trie'
import { LRUCache } from '../../src/dsa/LRUCache'
import { PriorityQueue } from '../../src/dsa/PriorityQueue'
import { GraphDAG } from '../../src/dsa/GraphDAG'
import { DisjointSetUnion } from '../../src/dsa/DisjointSetUnion'

describe('Backend Data Structures & Algorithms Library', () => {
  describe('Trie (Prefix Tree)', () => {
    let trie: Trie

    beforeEach(() => {
      trie = new Trie()
    })

    test('should insert and search words correctly', () => {
      trie.insert('apple')
      trie.insert('app')
      trie.insert('banana')

      expect(trie.search('apple')).toBe(true)
      expect(trie.search('app')).toBe(true)
      expect(trie.search('appl')).toBe(false)
      expect(trie.search('banana')).toBe(true)
      expect(trie.search('orange')).toBe(false)
    })

    test('should check prefixes with startsWith', () => {
      trie.insert('dijkstra')
      trie.insert('dynamic programming')

      expect(trie.startsWith('dijk')).toBe(true)
      expect(trie.startsWith('dyn')).toBe(true)
      expect(trie.startsWith('graph')).toBe(false)
    })

    test('should return sorted autocomplete suggestions', () => {
      trie.insert('two sum', { score: 100 })
      trie.insert('two sum ii', { score: 80 })
      trie.insert('tree traversal', { score: 90 })
      trie.insert('trie prefix tree', { score: 70 })

      const suggestions = trie.getSuggestions('tw')
      expect(suggestions.length).toBe(2)
      expect(suggestions[0]?.word).toBe('two sum')
      expect(suggestions[1]?.word).toBe('two sum ii')
    })

    test('should delete words accurately', () => {
      trie.insert('react')
      trie.insert('reactive')

      expect(trie.delete('react')).toBe(true)
      expect(trie.search('react')).toBe(false)
      expect(trie.search('reactive')).toBe(true)
    })
  })

  describe('LRUCache (O(1) Hash Map + Doubly Linked List)', () => {
    test('should evict least recently used item when capacity exceeded', () => {
      const evicted: Array<{ key: unknown; value: unknown }> = []
      const cache = new LRUCache<string, number>({
        capacity: 3,
        onEvict: (k, v) => evicted.push({ key: k, value: v }),
      })

      cache.put('a', 1)
      cache.put('b', 2)
      cache.put('c', 3)

      expect(cache.get('a')).toBe(1) // 'a' accessed, order is now: b, c, a
      cache.put('d', 4) // 'b' is least recently used, should be evicted

      expect(cache.has('b')).toBe(false)
      expect(cache.get('b')).toBeUndefined()
      expect(cache.has('a')).toBe(true)
      expect(cache.has('c')).toBe(true)
      expect(cache.has('d')).toBe(true)
      expect(evicted).toEqual([{ key: 'b', value: 2 }])
    })

    test('should support TTL expiration', async () => {
      const cache = new LRUCache<string, string>({ capacity: 5 })
      cache.put('temp', 'value', 20) // 20ms TTL

      expect(cache.get('temp')).toBe('value')
      await new Promise(resolve => setTimeout(resolve, 30))
      expect(cache.get('temp')).toBeUndefined()
    })
  })

  describe('PriorityQueue (Binary Min/Max Heap)', () => {
    test('should act as Min-Heap by default', () => {
      const pq = new PriorityQueue<number>()
      pq.push(10)
      pq.push(5)
      pq.push(30)
      pq.push(1)

      expect(pq.peek()).toBe(1)
      expect(pq.pop()).toBe(1)
      expect(pq.pop()).toBe(5)
      expect(pq.pop()).toBe(10)
      expect(pq.pop()).toBe(30)
      expect(pq.isEmpty()).toBe(true)
    })

    test('should act as Max-Heap when comparator inverted', () => {
      const maxHeap = new PriorityQueue<number>((a, b) => b - a, [10, 40, 20, 5])
      expect(maxHeap.peek()).toBe(40)
      expect(maxHeap.pop()).toBe(40)
      expect(maxHeap.pop()).toBe(20)
      expect(maxHeap.pop()).toBe(10)
      expect(maxHeap.pop()).toBe(5)
    })
  })

  describe('GraphDAG (Cycle Detection, Topological Sort & Shortest Path)', () => {
    test('should detect valid topological sort in DAG', () => {
      const graph = new GraphDAG()
      graph.addEdge('intro-cs', 'data-structures')
      graph.addEdge('data-structures', 'algorithms')
      graph.addEdge('algorithms', 'advanced-dp')

      expect(graph.hasCycle()).toBe(false)
      const order = graph.topologicalSort()
      expect(order.indexOf('intro-cs')).toBeLessThan(order.indexOf('data-structures'))
      expect(order.indexOf('data-structures')).toBeLessThan(order.indexOf('algorithms'))
      expect(order.indexOf('algorithms')).toBeLessThan(order.indexOf('advanced-dp'))
    })

    test('should detect cycles in directed graph', () => {
      const graph = new GraphDAG()
      graph.addEdge('A', 'B')
      graph.addEdge('B', 'C')
      graph.addEdge('C', 'A')

      expect(graph.hasCycle()).toBe(true)
      expect(graph.topologicalSort()).toEqual([])
    })

    test('should calculate Dijkstra shortest path', () => {
      const graph = new GraphDAG()
      graph.addEdge('A', 'B', 4)
      graph.addEdge('A', 'C', 2)
      graph.addEdge('C', 'B', 1)
      graph.addEdge('B', 'D', 5)
      graph.addEdge('C', 'D', 8)

      const result = graph.shortestPath('A', 'D')
      expect(result).not.toBeNull()
      expect(result?.distance).toBe(8) // A -> C (2) -> B (1) -> D (5) = 8
      expect(result?.path).toEqual(['A', 'C', 'B', 'D'])
    })
  })

  describe('DisjointSetUnion (Union-Find with Path Compression)', () => {
    test('should manage connected components with near O(1) operations', () => {
      const dsu = new DisjointSetUnion(['u1', 'u2', 'u3', 'u4', 'u5'])
      expect(dsu.getComponentCount()).toBe(5)

      dsu.union('u1', 'u2')
      dsu.union('u2', 'u3')
      expect(dsu.connected('u1', 'u3')).toBe(true)
      expect(dsu.connected('u1', 'u4')).toBe(false)
      expect(dsu.getSizeOfComponent('u1')).toBe(3)
      expect(dsu.getComponentCount()).toBe(3)

      dsu.union('u4', 'u5')
      dsu.union('u3', 'u4')
      expect(dsu.connected('u1', 'u5')).toBe(true)
      expect(dsu.getComponentCount()).toBe(1)
    })
  })
})

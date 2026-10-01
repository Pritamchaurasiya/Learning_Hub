/**
 * Directed Acyclic Graph (DAG) & Graph Algorithms Suite
 *
 * Implements Topological Sorting (Kahn's Algorithm & Tarjan's DFS), Cycle Detection,
 * Shortest Path (Dijkstra / BFS), and Dependency Resolution for Learning Paths and Courses.
 */

export interface Edge<T = unknown> {
  to: string
  weight: number
  data?: T
}

export interface GraphNode<T = unknown> {
  id: string
  label?: string
  data?: T
}

export class GraphDAG<T = unknown> {
  private adjacencyList: Map<string, Edge<T>[]> = new Map()
  private inDegree: Map<string, number> = new Map()
  private nodes: Map<string, GraphNode<T>> = new Map()

  /**
   * Add a node to the graph.
   */
  public addNode(id: string, label?: string, data?: T): void {
    if (!this.adjacencyList.has(id)) {
      this.adjacencyList.set(id, [])
      this.inDegree.set(id, 0)
      this.nodes.set(id, { id, label: label ?? id, data })
    }
  }

  /**
   * Add directed edge from `fromId` to `toId` with optional weight.
   */
  public addEdge(fromId: string, toId: string, weight = 1, data?: T): void {
    this.addNode(fromId)
    this.addNode(toId)

    const edges = this.adjacencyList.get(fromId)!
    edges.push({ to: toId, weight, data })
    this.inDegree.set(toId, (this.inDegree.get(toId) ?? 0) + 1)
  }

  /**
   * Check if the graph contains any directed cycle using 3-color DFS.
   * Time Complexity: O(V + E)
   */
  public hasCycle(): boolean {
    const visited = new Map<string, 0 | 1 | 2>() // 0: unvisited, 1: visiting, 2: visited

    for (const node of this.adjacencyList.keys()) {
      visited.set(node, 0)
    }

    const dfs = (nodeId: string): boolean => {
      visited.set(nodeId, 1)
      const neighbors = this.adjacencyList.get(nodeId) ?? []

      for (const edge of neighbors) {
        const state = visited.get(edge.to)
        if (state === 1) return true // Back-edge detected -> Cycle!
        if (state === 0 && dfs(edge.to)) return true
      }

      visited.set(nodeId, 2)
      return false
    }

    for (const node of this.adjacencyList.keys()) {
      if (visited.get(node) === 0) {
        if (dfs(node)) return true
      }
    }

    return false
  }

  /**
   * Compute valid linear Topological Ordering using Kahn's Algorithm (BFS).
   * Returns empty array if cycle exists.
   * Time Complexity: O(V + E)
   */
  public topologicalSort(): string[] {
    const inDeg = new Map<string, number>(this.inDegree)
    const queue: string[] = []
    const order: string[] = []

    for (const [node, deg] of inDeg.entries()) {
      if (deg === 0) {
        queue.push(node)
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!
      order.push(current)

      const edges = this.adjacencyList.get(current) ?? []
      for (const edge of edges) {
        const nextDeg = (inDeg.get(edge.to) ?? 0) - 1
        inDeg.set(edge.to, nextDeg)
        if (nextDeg === 0) {
          queue.push(edge.to)
        }
      }
    }

    if (order.length !== this.adjacencyList.size) {
      // Cycle present, topological sort impossible
      return []
    }

    return order
  }

  /**
   * Find Shortest Path between startNode and endNode using Dijkstra's Algorithm.
   * Time Complexity: O((V + E) log V)
   */
  public shortestPath(startId: string, endId: string): { path: string[]; distance: number } | null {
    if (!this.adjacencyList.has(startId) || !this.adjacencyList.has(endId)) {
      return null
    }

    const distances = new Map<string, number>()
    const previous = new Map<string, string | null>()
    const visited = new Set<string>()

    for (const node of this.adjacencyList.keys()) {
      distances.set(node, Infinity)
      previous.set(node, null)
    }
    distances.set(startId, 0)

    const pq: Array<{ id: string; dist: number }> = [{ id: startId, dist: 0 }]

    while (pq.length > 0) {
      pq.sort((a, b) => a.dist - b.dist)
      const { id: u, dist } = pq.shift()!

      if (visited.has(u)) continue
      visited.add(u)

      if (u === endId) break

      const neighbors = this.adjacencyList.get(u) ?? []
      for (const edge of neighbors) {
        if (!visited.has(edge.to)) {
          const alt = dist + edge.weight
          if (alt < (distances.get(edge.to) ?? Infinity)) {
            distances.set(edge.to, alt)
            previous.set(edge.to, u)
            pq.push({ id: edge.to, dist: alt })
          }
        }
      }
    }

    const targetDist = distances.get(endId)
    if (targetDist === undefined || targetDist === Infinity) {
      return null
    }

    const path: string[] = []
    let curr: string | null = endId
    while (curr) {
      path.unshift(curr)
      curr = previous.get(curr) ?? null
    }

    return { path, distance: targetDist }
  }

  public getNode(id: string): GraphNode<T> | undefined {
    return this.nodes.get(id)
  }

  public getNeighbors(id: string): Edge<T>[] {
    return this.adjacencyList.get(id) ?? []
  }

  public getNodeCount(): number {
    return this.nodes.size
  }
}

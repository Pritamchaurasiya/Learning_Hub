/**
 * Grid & Graph Pathfinding Algorithm Engines
 *
 * Implements Dijkstra's Algorithm, A* Search (Manhattan/Euclidean), BFS, DFS,
 * and Greedy Best-First Search with step-by-step state capture and maze generators.
 */

export type NodeType =
  'empty' | 'wall' | 'weight' | 'start' | 'target' | 'visited' | 'path' | 'current'

export interface GridNode {
  row: number
  col: number
  type: NodeType
  weight: number
  distance: number
  heuristic: number
  totalCost: number
  previousNode: GridNode | null
}

export interface PathfindingFrame {
  grid: NodeType[][]
  current: [number, number] | null
  visitedCount: number
  pathLength: number
  distance: number
  description: string
  codeLine: number
}

export interface PathfindingAlgorithmInfo {
  id: string
  name: string
  guaranteesShortestPath: boolean
  weighted: boolean
  timeComplexity: string
  spaceComplexity: string
  description: string
  pseudocode: string[]
}

export const PATHFINDING_ALGORITHMS: Record<string, PathfindingAlgorithmInfo> = {
  dijkstra: {
    id: 'dijkstra',
    name: "Dijkstra's Algorithm",
    guaranteesShortestPath: true,
    weighted: true,
    timeComplexity: 'O((V + E) log V)',
    spaceComplexity: 'O(V)',
    description:
      'Guarantees the shortest path in weighted graphs by greedily exploring the closest unvisited node.',
    pseudocode: [
      'dist[start] = 0, pq.push(start, 0)',
      'while pq is not empty:',
      '  u = pq.popMin()',
      '  if u == target: return reconstructPath(u)',
      '  for each neighbor v of u:',
      '    alt = dist[u] + weight(u, v)',
      '    if alt < dist[v]: dist[v] = alt, prev[v] = u, pq.push(v, alt)',
    ],
  },
  astar: {
    id: 'astar',
    name: 'A* Search Algorithm',
    guaranteesShortestPath: true,
    weighted: true,
    timeComplexity: 'O(E) in best / O(b^d)',
    spaceComplexity: 'O(V)',
    description:
      'Combines Dijkstra with a heuristic function h(n) = distance to target for ultra-fast directed pathfinding.',
    pseudocode: [
      'fScore[start] = h(start, target)',
      'openSet.push(start)',
      'while openSet is not empty:',
      '  current = openSet.popLowestFScore()',
      '  if current == target: return reconstructPath(current)',
      '  for each neighbor of current:',
      '    tentative_g = gScore[current] + weight',
      '    if tentative_g < gScore[neighbor]: update and add to openSet',
    ],
  },
  bfs: {
    id: 'bfs',
    name: 'Breadth-First Search (BFS)',
    guaranteesShortestPath: true,
    weighted: false,
    timeComplexity: 'O(V + E)',
    spaceComplexity: 'O(V)',
    description:
      'Explores grid layer by layer using a FIFO queue. Guarantees the shortest path on unweighted grids.',
    pseudocode: [
      'queue.push(start), visited.add(start)',
      'while queue is not empty:',
      '  u = queue.shift()',
      '  if u == target: return reconstructPath(u)',
      '  for each unvisited neighbor v of u:',
      '    visited.add(v), prev[v] = u, queue.push(v)',
    ],
  },
  dfs: {
    id: 'dfs',
    name: 'Depth-First Search (DFS)',
    guaranteesShortestPath: false,
    weighted: false,
    timeComplexity: 'O(V + E)',
    spaceComplexity: 'O(V)',
    description:
      'Explores as far down a path as possible before backtracking. Does NOT guarantee the shortest path.',
    pseudocode: [
      'stack.push(start)',
      'while stack is not empty:',
      '  u = stack.pop()',
      '  if u == target: return reconstructPath(u)',
      '  for each unvisited neighbor v of u:',
      '    visited.add(v), prev[v] = u, stack.push(v)',
    ],
  },
}

// ─── DIJKSTRA STEP GENERATOR ─────────────────────────────────────────
export function* generateDijkstra(
  gridState: NodeType[][],
  start: [number, number],
  target: [number, number]
): Generator<PathfindingFrame> {
  const rows = gridState.length
  const cols = gridState[0]?.length ?? 0
  const grid: NodeType[][] = gridState.map(r => [...r])

  const distances: number[][] = Array.from({ length: rows }, () => Array(cols).fill(Infinity))
  const previous: ([number, number] | null)[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(null)
  )
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false))

  distances[start[0]]![start[1]] = 0
  const pq: Array<{ pos: [number, number]; dist: number }> = [{ pos: start, dist: 0 }]
  let visitedCount = 0

  yield {
    grid: grid.map(r => [...r]),
    current: start,
    visitedCount: 0,
    pathLength: 0,
    distance: 0,
    description: "Starting Dijkstra's Algorithm from start node",
    codeLine: 0,
  }

  while (pq.length > 0) {
    pq.sort((a, b) => a.dist - b.dist)
    const {
      pos: [r, c],
      dist,
    } = pq.shift()!

    if (visited[r]![c]) continue
    visited[r]![c] = true
    visitedCount++

    if (!(r === start[0] && c === start[1]) && !(r === target[0] && c === target[1])) {
      grid[r]![c] = 'visited'
    }

    yield {
      grid: grid.map(row => [...row]),
      current: [r, c],
      visitedCount,
      pathLength: 0,
      distance: dist,
      description: `Exploring node (${r}, ${c}) with distance ${dist}`,
      codeLine: 2,
    }

    if (r === target[0] && c === target[1]) {
      // Reconstruct shortest path
      let curr: [number, number] | null = target
      const pathNodes: [number, number][] = []
      while (curr) {
        pathNodes.unshift(curr)
        curr = previous[curr[0]]![curr[1]]!
      }

      for (const [pr, pc] of pathNodes) {
        if (!(pr === start[0] && pc === start[1]) && !(pr === target[0] && pc === target[1])) {
          grid[pr]![pc] = 'path'
        }
      }

      yield {
        grid: grid.map(row => [...row]),
        current: target,
        visitedCount,
        pathLength: pathNodes.length,
        distance: distances[target[0]]![target[1]]!,
        description: `Target Reached! Optimal path found: ${pathNodes.length} steps (Distance: ${distances[target[0]]![target[1]]})`,
        codeLine: 3,
      }
      return
    }

    const neighbors: [number, number][] = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ]

    for (const [nr, nc] of neighbors) {
      if (
        nr >= 0 &&
        nr < rows &&
        nc >= 0 &&
        nc < cols &&
        !visited[nr]![nc] &&
        gridState[nr]![nc] !== 'wall'
      ) {
        const weight = gridState[nr]![nc] === 'weight' ? 5 : 1
        const alt = dist + weight

        if (alt < distances[nr]![nc]!) {
          distances[nr]![nc] = alt
          previous[nr]![nc] = [r, c]
          pq.push({ pos: [nr, nc], dist: alt })
        }
      }
    }
  }

  yield {
    grid: grid.map(row => [...row]),
    current: null,
    visitedCount,
    pathLength: 0,
    distance: 0,
    description: 'No path exists to target node (blocked by walls)',
    codeLine: 1,
  }
}

// ─── A* SEARCH STEP GENERATOR ────────────────────────────────────────
export function* generateAStar(
  gridState: NodeType[][],
  start: [number, number],
  target: [number, number]
): Generator<PathfindingFrame> {
  const rows = gridState.length
  const cols = gridState[0]?.length ?? 0
  const grid: NodeType[][] = gridState.map(r => [...r])

  const gScore: number[][] = Array.from({ length: rows }, () => Array(cols).fill(Infinity))
  const fScore: number[][] = Array.from({ length: rows }, () => Array(cols).fill(Infinity))
  const previous: ([number, number] | null)[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(null)
  )
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false))

  const heuristic = (r: number, c: number) => Math.abs(r - target[0]) + Math.abs(c - target[1])

  gScore[start[0]]![start[1]] = 0
  fScore[start[0]]![start[1]] = heuristic(start[0], start[1])

  const openSet: Array<{ pos: [number, number]; f: number }> = [
    { pos: start, f: fScore[start[0]]![start[1]]! },
  ]
  let visitedCount = 0

  yield {
    grid: grid.map(r => [...r]),
    current: start,
    visitedCount: 0,
    pathLength: 0,
    distance: 0,
    description: 'Starting A* Search with Manhattan distance heuristic',
    codeLine: 0,
  }

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f)
    const {
      pos: [r, c],
    } = openSet.shift()!

    if (visited[r]![c]) continue
    visited[r]![c] = true
    visitedCount++

    if (!(r === start[0] && c === start[1]) && !(r === target[0] && c === target[1])) {
      grid[r]![c] = 'visited'
    }

    yield {
      grid: grid.map(row => [...row]),
      current: [r, c],
      visitedCount,
      pathLength: 0,
      distance: gScore[r]![c]!,
      description: `Evaluating (${r}, ${c}) [g=${gScore[r]![c]}, h=${heuristic(r, c)}, f=${fScore[r]![c]}]`,
      codeLine: 3,
    }

    if (r === target[0] && c === target[1]) {
      let curr: [number, number] | null = target
      const pathNodes: [number, number][] = []
      while (curr) {
        pathNodes.unshift(curr)
        curr = previous[curr[0]]![curr[1]]!
      }

      for (const [pr, pc] of pathNodes) {
        if (!(pr === start[0] && pc === start[1]) && !(pr === target[0] && pc === target[1])) {
          grid[pr]![pc] = 'path'
        }
      }

      yield {
        grid: grid.map(row => [...row]),
        current: target,
        visitedCount,
        pathLength: pathNodes.length,
        distance: gScore[target[0]]![target[1]]!,
        description: `A* Search Complete! Shortest path found: ${pathNodes.length} steps`,
        codeLine: 4,
      }
      return
    }

    const neighbors: [number, number][] = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ]

    for (const [nr, nc] of neighbors) {
      if (
        nr >= 0 &&
        nr < rows &&
        nc >= 0 &&
        nc < cols &&
        !visited[nr]![nc] &&
        gridState[nr]![nc] !== 'wall'
      ) {
        const weight = gridState[nr]![nc] === 'weight' ? 5 : 1
        const tentativeG = gScore[r]![c]! + weight

        if (tentativeG < gScore[nr]![nc]!) {
          previous[nr]![nc] = [r, c]
          gScore[nr]![nc] = tentativeG
          fScore[nr]![nc] = tentativeG + heuristic(nr, nc)
          openSet.push({ pos: [nr, nc], f: fScore[nr]![nc]! })
        }
      }
    }
  }

  yield {
    grid: grid.map(row => [...row]),
    current: null,
    visitedCount,
    pathLength: 0,
    distance: 0,
    description: 'No valid path exists to destination',
    codeLine: 1,
  }
}

// ─── BREADTH-FIRST SEARCH GENERATOR ─────────────────────────────────
export function* generateBFS(
  gridState: NodeType[][],
  start: [number, number],
  target: [number, number]
): Generator<PathfindingFrame> {
  const rows = gridState.length
  const cols = gridState[0]?.length ?? 0
  const grid: NodeType[][] = gridState.map(r => [...r])

  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false))
  const previous: ([number, number] | null)[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(null)
  )

  const queue: [number, number][] = [start]
  visited[start[0]]![start[1]] = true
  let visitedCount = 0

  yield {
    grid: grid.map(r => [...r]),
    current: start,
    visitedCount: 0,
    pathLength: 0,
    distance: 0,
    description: 'Starting Breadth-First Search (Queue FIFO)',
    codeLine: 0,
  }

  while (queue.length > 0) {
    const [r, c] = queue.shift()!
    visitedCount++

    if (!(r === start[0] && c === start[1]) && !(r === target[0] && c === target[1])) {
      grid[r]![c] = 'visited'
    }

    yield {
      grid: grid.map(row => [...row]),
      current: [r, c],
      visitedCount,
      pathLength: 0,
      distance: 0,
      description: `Popped node (${r}, ${c}) from front of queue`,
      codeLine: 2,
    }

    if (r === target[0] && c === target[1]) {
      let curr: [number, number] | null = target
      const pathNodes: [number, number][] = []
      while (curr) {
        pathNodes.unshift(curr)
        curr = previous[curr[0]]![curr[1]]!
      }

      for (const [pr, pc] of pathNodes) {
        if (!(pr === start[0] && pc === start[1]) && !(pr === target[0] && pc === target[1])) {
          grid[pr]![pc] = 'path'
        }
      }

      yield {
        grid: grid.map(row => [...row]),
        current: target,
        visitedCount,
        pathLength: pathNodes.length,
        distance: pathNodes.length - 1,
        description: `BFS Complete! Unweighted shortest path: ${pathNodes.length} nodes`,
        codeLine: 3,
      }
      return
    }

    const neighbors: [number, number][] = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ]

    for (const [nr, nc] of neighbors) {
      if (
        nr >= 0 &&
        nr < rows &&
        nc >= 0 &&
        nc < cols &&
        !visited[nr]![nc] &&
        gridState[nr]![nc] !== 'wall'
      ) {
        visited[nr]![nc] = true
        previous[nr]![nc] = [r, c]
        queue.push([nr, nc])
      }
    }
  }

  yield {
    grid: grid.map(row => [...row]),
    current: null,
    visitedCount,
    pathLength: 0,
    distance: 0,
    description: 'Target unreachable from start position',
    codeLine: 1,
  }
}

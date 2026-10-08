import { describe, it, expect } from 'vitest'
import { canvasStudioService } from './canvasStudioService'
import { DrawingElement, GraphNode, GraphEdge } from '../types/canvasStudio'

describe('canvasStudioService (Milestone 14)', () => {
  it('recognizes LaTeX formulas from drawn vector elements', () => {
    const elements: DrawingElement[] = [
      {
        id: 'el-1',
        tool: 'PEN',
        points: [
          { x: 10, y: 10 },
          { x: 20, y: 20 },
          { x: 30, y: 30 },
          { x: 40, y: 40 },
        ],
        color: '#38bdf8',
        strokeWidth: 4,
      },
    ]

    const result = canvasStudioService.recognizeEquation(elements)
    expect(result.latexString).toBeDefined()
    expect(result.confidence).toBeGreaterThan(0.8)
    expect(result.suggestedSteps).toBeDefined()
    expect(result.suggestedSteps!.length).toBeGreaterThan(0)
  })

  it('analyzes graph topology and builds accurate adjacency lists', () => {
    const nodes: GraphNode[] = [
      { id: 'n1', label: 'A', x: 100, y: 100, radius: 20 },
      { id: 'n2', label: 'B', x: 200, y: 100, radius: 20 },
      { id: 'n3', label: 'C', x: 300, y: 100, radius: 20 },
    ]
    const edges: GraphEdge[] = [
      { id: 'e1', fromNodeId: 'n1', toNodeId: 'n2', weight: 5, directed: true },
      { id: 'e2', fromNodeId: 'n2', toNodeId: 'n3', weight: 3, directed: false },
    ]

    const topology = canvasStudioService.analyzeGraphTopology(nodes, edges)
    expect(topology.nodeCount).toBe(3)
    expect(topology.edgeCount).toBe(2)
    expect(topology.isDirected).toBe(true)
    expect(topology.adjacencyList['A']).toEqual([{ target: 'B', weight: 5 }])
    expect(topology.adjacencyList['B']).toEqual([{ target: 'C', weight: 3 }])
    expect(topology.adjacencyList['C']).toEqual([{ target: 'B', weight: 3 }])
  })

  it('computes shortest path between graph nodes on the canvas', () => {
    const nodes: GraphNode[] = [
      { id: 'n1', label: 'START', x: 0, y: 0, radius: 20 },
      { id: 'n2', label: 'MID', x: 50, y: 50, radius: 20 },
      { id: 'n3', label: 'GOAL', x: 100, y: 100, radius: 20 },
    ]
    const edges: GraphEdge[] = [
      { id: 'e1', fromNodeId: 'n1', toNodeId: 'n2', directed: true },
      { id: 'e2', fromNodeId: 'n2', toNodeId: 'n3', directed: true },
    ]

    const path = canvasStudioService.computeShortestPath('n1', 'n3', nodes, edges)
    expect(path).toEqual(['START', 'MID', 'GOAL'])
  })

  it('exports drawing elements to valid SVG string markup', () => {
    const elements: DrawingElement[] = [
      {
        id: 'rect-1',
        tool: 'RECTANGLE',
        points: [
          { x: 50, y: 50 },
          { x: 150, y: 120 },
        ],
        color: '#38bdf8',
        strokeWidth: 2,
      },
      {
        id: 'pen-1',
        tool: 'PEN',
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
          { x: 20, y: 20 },
        ],
        color: '#34d399',
        strokeWidth: 4,
      },
    ]

    const svg = canvasStudioService.exportToSVG(elements, 800, 600)
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"')
    expect(svg).toContain('viewBox="0 0 800 600"')
    expect(svg).toContain('<rect')
    expect(svg).toContain('<path')
    expect(svg).toContain('</svg>')
  })
})

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { KnowledgeGraphVisualizer } from './KnowledgeGraphVisualizer'
import type { KnowledgeGraphData } from '../../services/analyticsService'

const MOCK_GRAPH: KnowledgeGraphData = {
  nodes: [
    {
      id: 'c-1',
      name: 'Variables & Data Types',
      slug: 'variables-data-types',
      description: 'Foundations of memory allocation and primitives.',
      type: 'TOPIC',
      order: 1,
      level: 0,
      masteryScore: 0.9,
      status: 'MASTERED',
      prerequisiteIds: [],
      isRecommended: false,
    },
    {
      id: 'c-2',
      name: 'Dynamic Programming',
      slug: 'dynamic-programming',
      description: 'Optimal substructure and memoization.',
      type: 'TOPIC',
      order: 2,
      level: 3,
      masteryScore: 0.45,
      status: 'IN_PROGRESS',
      prerequisiteIds: ['c-1'],
      isRecommended: true,
    },
  ],
  edges: [
    {
      id: 'e-1',
      from: 'c-1',
      to: 'c-2',
      strength: 'required',
    },
  ],
  recommendedConceptId: 'c-2',
  overallProgressPercentage: 68,
}

describe('KnowledgeGraphVisualizer', () => {
  it('renders concept nodes, tiers, and curriculum mastery', () => {
    render(
      <BrowserRouter>
        <KnowledgeGraphVisualizer graphData={MOCK_GRAPH} />
      </BrowserRouter>
    )

    expect(screen.getByText('Curriculum Knowledge Graph & BKT Mastery Tree')).toBeInTheDocument()
    expect(screen.getByText('Variables & Data Types')).toBeInTheDocument()
    expect(screen.getByText('Dynamic Programming')).toBeInTheDocument()
    expect(screen.getByText('68%')).toBeInTheDocument()
  })

  it('filters nodes when filter pills are clicked', () => {
    render(
      <BrowserRouter>
        <KnowledgeGraphVisualizer graphData={MOCK_GRAPH} />
      </BrowserRouter>
    )

    const masteredFilter = screen.getByRole('button', { name: 'Mastered' })
    fireEvent.click(masteredFilter)

    expect(screen.getByText('Variables & Data Types')).toBeInTheDocument()
  })

  it('opens concept details drawer when a node is clicked', () => {
    render(
      <BrowserRouter>
        <KnowledgeGraphVisualizer graphData={MOCK_GRAPH} />
      </BrowserRouter>
    )

    const dpNode = screen.getByText('Dynamic Programming')
    fireEvent.click(dpNode)

    expect(screen.getByText('Optimal substructure and memoization.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Practice Problems/i })).toBeInTheDocument()
  })
})

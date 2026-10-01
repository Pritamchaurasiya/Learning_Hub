import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../test/test-utils'
import AlgorithmVisualizerPage from './AlgorithmVisualizerPage'

// Mock matchMedia
window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener() {},
      removeListener() {},
    }
  }

describe('AlgorithmVisualizerPage', { timeout: 20000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders page header and tabs correctly', () => {
    render(<AlgorithmVisualizerPage />)

    expect(screen.getByText('Algorithm & DSA Visualizer Studio')).toBeInTheDocument()
    expect(screen.getByText('Sorting Algorithms')).toBeInTheDocument()
    expect(screen.getByText('Graph & Pathfinding')).toBeInTheDocument()
    expect(screen.getByText('Trees & AVL Balancing')).toBeInTheDocument()
    expect(screen.getByText('Dynamic Programming')).toBeInTheDocument()
    expect(screen.getByText('Data Structures')).toBeInTheDocument()
  })

  it('toggles audio on and off', () => {
    render(<AlgorithmVisualizerPage />)

    const audioButton = screen.getByRole('button', { name: /audio/i })
    expect(audioButton).toHaveTextContent(/Muted/i)

    fireEvent.click(audioButton)
    expect(audioButton).toHaveTextContent(/On/i)

    fireEvent.click(audioButton)
    expect(audioButton).toHaveTextContent(/Muted/i)
  })

  it('switches between visualizer tabs', async () => {
    render(<AlgorithmVisualizerPage />)

    // Switch to Graph & Pathfinding
    const pathfindingTab = screen.getByText('Graph & Pathfinding')
    fireEvent.click(pathfindingTab)
    await waitFor(() => {
      expect(screen.getByText(/Dijkstra's Algorithm/i)).toBeInTheDocument()
    })

    // Switch to Trees
    const treesTab = screen.getByText('Trees & AVL Balancing')
    fireEvent.click(treesTab)
    await waitFor(() => {
      expect(screen.getByText(/AVL Self-Balancing Tree/i)).toBeInTheDocument()
    })

    // Switch to Dynamic Programming
    const dpTab = screen.getByText('Dynamic Programming')
    fireEvent.click(dpTab)
    await waitFor(() => {
      expect(screen.getByText(/0\/1 Knapsack Problem/i)).toBeInTheDocument()
    })

    // Switch to Data Structures
    const structuresTab = screen.getByText('Data Structures')
    fireEvent.click(structuresTab)
    await waitFor(() => {
      expect(screen.getByText(/Stack \(LIFO\)/i)).toBeInTheDocument()
    })
  })

  it('allows selecting different sorting algorithms and regenerating array', () => {
    render(<AlgorithmVisualizerPage />)

    const bubbleSortBtn = screen.getByRole('button', { name: /Bubble Sort/i })
    expect(bubbleSortBtn).toBeInTheDocument()
    fireEvent.click(bubbleSortBtn)

    const randomizeButton = screen.getByRole('button', { name: /Regenerate/i })
    expect(randomizeButton).toBeInTheDocument()
    fireEvent.click(randomizeButton)

    const startBtn = screen.getByRole('button', { name: /Start/i })
    expect(startBtn).toBeInTheDocument()
    fireEvent.click(startBtn)
  })
})

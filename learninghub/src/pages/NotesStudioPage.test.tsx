import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../test/test-utils'
import NotesStudioPage from './NotesStudioPage'

describe('NotesStudioPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders notes studio banner, search input, and create note button', () => {
    render(<NotesStudioPage />)
    expect(screen.getByText(/Centralized Student Notes & Scratchpad Studio/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Search notes, algorithms, lectures.../i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Create Quick Note/i })).toBeInTheDocument()
  })

  it('renders default note content and copy markdown button', () => {
    render(<NotesStudioPage />)
    const elements = screen.getAllByText(/Raft Consensus: Leader Election/i)
    expect(elements.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('button', { name: /Copy/i })).toBeInTheDocument()
  })
})

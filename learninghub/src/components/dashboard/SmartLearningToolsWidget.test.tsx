import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { render } from '../../test/test-utils'
import { SmartLearningToolsWidget } from './SmartLearningToolsWidget'
import { useLearningContextStore } from '../../stores/useLearningContextStore'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('SmartLearningToolsWidget Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useLearningContextStore.setState({
      activeExam: {
        id: 'exam-jee-main',
        name: 'JEE Main',
        slug: 'jee-main',
        countryId: 'country-in',
      },
      activeSubjects: [{ id: 'sub-phy', name: 'Physics', slug: 'physics' }],
    })
  })

  it('renders all four verified smart learning tools', () => {
    render(<SmartLearningToolsWidget />)

    expect(screen.getByText('Smart Learning Tools')).toBeInTheDocument()
    expect(screen.getByText('60s Test Blitz')).toBeInTheDocument()
    expect(screen.getByText('Spaced Flashcards')).toBeInTheDocument()
    expect(screen.getByText('Mistake Notebook')).toBeInTheDocument()
    expect(screen.getByText('Adaptive CAT Drill')).toBeInTheDocument()
  })

  it('navigates to revision page when clicking Open Flashcards', () => {
    render(<SmartLearningToolsWidget />)

    const flashcardsBtn = screen.getByRole('button', { name: /Open Flashcards/i })
    fireEvent.click(flashcardsBtn)

    expect(mockNavigate).toHaveBeenCalledWith('/revision')
  })

  it('navigates to mistake notebook with filter when clicking Review Mistakes', () => {
    render(<SmartLearningToolsWidget />)

    const mistakesBtn = screen.getByRole('button', { name: /Review Mistakes/i })
    fireEvent.click(mistakesBtn)

    expect(mockNavigate).toHaveBeenCalledWith('/revision?filter=MISTAKE')
  })

  it('opens blitz modal when clicking Launch Blitz', async () => {
    render(<SmartLearningToolsWidget />)

    const blitzBtn = screen.getByRole('button', { name: /Launch Blitz/i })
    fireEvent.click(blitzBtn)

    await waitFor(() => {
      expect(screen.getByText(/60-Second Speed Blitz/i)).toBeInTheDocument()
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

import { ExamSelectorModal } from './ExamSelectorModal'
import { useLearningContextStore } from '../../stores/useLearningContextStore'

// Mock api utils
vi.mock('../../utils/api', () => ({
  fetchApi: vi.fn().mockRejectedValue(new Error('Network connection failed')),
}))

// Mock country hook
vi.mock('../../hooks/useCountry', () => ({
  useCountry: () => ({
    countryId: 'all',
    setCountry: vi.fn(),
  }),
}))

describe('ExamSelectorModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useLearningContextStore.setState({
      activeExam: null,
      activeCountry: null,
      subjectIds: [],
      isConfigured: false,
    })
  })

  it('renders without crashing even when API throws network error (zero-failure resilient fallback)', async () => {
    render(<ExamSelectorModal isOpen={true} onClose={vi.fn()} />)

    // Should render main title
    expect(screen.getByText('Select Your Target Exam')).toBeInTheDocument()

    // Should NOT show the blocking "Failed to load exam catalog" error banner
    expect(
      screen.queryByText('Failed to load exam catalog. Please check your connection.')
    ).not.toBeInTheDocument()

    // Should display offline ready indicator once sync promise resolves
    await waitFor(() => {
      expect(screen.getByText(/Offline Ready/i)).toBeInTheDocument()
    })

    // Should render popular quick search chips
    expect(screen.getByText('🔥 JEE Main')).toBeInTheDocument()
    expect(screen.getByText('🩺 NEET-UG')).toBeInTheDocument()
    expect(screen.getByText('🏛️ SSC CGL')).toBeInTheDocument()

    // Should render curated exams immediately
    expect(screen.getByText('JEE Main')).toBeInTheDocument()
    expect(screen.getByText('NEET-UG')).toBeInTheDocument()
  })

  it('filters exams using search query', async () => {
    render(<ExamSelectorModal isOpen={true} onClose={vi.fn()} />)

    const searchInput = screen.getByPlaceholderText(/Search exams/i)
    fireEvent.change(searchInput, { target: { value: 'SSC CGL' } })

    // SSC CGL should be visible
    expect(screen.getByText('SSC CGL')).toBeInTheDocument()

    // Unrelated exams should be filtered out
    expect(screen.queryByText('NEET-UG')).not.toBeInTheDocument()
  })

  it('navigates to step 2 when clicking an exam and allows calibration', async () => {
    const handleClose = vi.fn()
    render(<ExamSelectorModal isOpen={true} onClose={handleClose} />)

    // Click on JEE Main
    const jeeBtn = screen.getByText('JEE Main')
    fireEvent.click(jeeBtn)

    // Should transition to step 2 with subject customization
    await waitFor(() => {
      expect(screen.getByText(/Calibrate Subjects: JEE Main/i)).toBeInTheDocument()
    })

    // Should display JEE subjects
    expect(screen.getByText('Physics')).toBeInTheDocument()
    expect(screen.getByText('Chemistry')).toBeInTheDocument()
    expect(screen.getByText('Mathematics')).toBeInTheDocument()

    // Should display Daily Questions Goal selectors
    expect(screen.getByText('Daily Questions Goal')).toBeInTheDocument()

    // Click Activate button
    const activateBtn = screen.getByText(/Activate JEE Main/i)
    expect(activateBtn).toBeInTheDocument()
    fireEvent.click(activateBtn)

    await waitFor(() => {
      const state = useLearningContextStore.getState()
      expect(state.activeExam?.name).toBe('JEE Main')
      expect(state.isConfigured).toBe(true)
      expect(handleClose).toHaveBeenCalled()
    })
  })
})

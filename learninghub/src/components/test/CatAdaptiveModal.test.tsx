/**
 * CatAdaptiveModal.test.tsx
 *
 * Comprehensive test suite for Computerized Adaptive Testing modal and discipline switcher.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CatAdaptiveModal, AVAILABLE_DISCIPLINES } from './CatAdaptiveModal'
import { catService } from '../../services/catService'

vi.mock('../../utils/soundEffects', () => ({
  playRewardChime: vi.fn(),
}))

describe('CatAdaptiveModal', () => {
  const mockSession = {
    sessionId: 'session-cat-test-01',
    userId: 'student-01',
    subject: 'Physics',
    examSlug: 'jee-main',
    stage: 1 as const,
    currentTheta: 0.0,
    currentSem: 1.0,
    normalizedScore: 50,
    estimatedPercentile: 50,
    abilityBand: 'INTERMEDIATE' as const,
    isCompleted: false,
    questionsAnswered: 0,
    maxQuestions: 15,
    minQuestions: 5,
    targetSem: 0.3,
    responses: [],
    activeItem: {
      id: 'phy-001',
      text: 'A block slides down a frictionless inclined plane of angle theta. What is its acceleration?',
      subject: 'Physics',
      topic: 'Mechanics',
      options: [
        { id: 'opt-a', text: 'g * sin(theta)' },
        { id: 'opt-b', text: 'g * cos(theta)' },
        { id: 'opt-c', text: 'g * tan(theta)' },
        { id: 'opt-d', text: 'g' },
      ],
      bloomLevel: 'APPLY' as const,
    },
    startedAt: Date.now(),
    updatedAt: Date.now(),
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(catService, 'startSession').mockResolvedValue(mockSession)
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<CatAdaptiveModal isOpen={false} onClose={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the modal and initializes session with default discipline when isOpen is true', async () => {
    render(<CatAdaptiveModal isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText(/CAT Psychometric Test/i)).toBeInTheDocument()
    expect(screen.getByText(/3PL IRT Engine/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(catService.startSession).toHaveBeenCalledWith('Physics', 'jee-main')
    })

    expect(
      await screen.findByText(/A block slides down a frictionless inclined plane/i)
    ).toBeInTheDocument()
    expect(screen.getByText('g * sin(theta)')).toBeInTheDocument()
  })

  it('renders all 8 multi-disciplinary track pills in the toolbar', async () => {
    render(<CatAdaptiveModal isOpen={true} onClose={vi.fn()} />)

    for (const discipline of AVAILABLE_DISCIPLINES) {
      expect(screen.getAllByText(discipline.label).length).toBeGreaterThanOrEqual(1)
    }
  })

  it('switches discipline and starts a fresh calibrated session when a pill is clicked', async () => {
    render(<CatAdaptiveModal isOpen={true} onClose={vi.fn()} />)

    await waitFor(() => {
      expect(catService.startSession).toHaveBeenCalledTimes(1)
    })

    const biologyBtn = screen.getByText('Biology')
    fireEvent.click(biologyBtn)

    await waitFor(() => {
      expect(catService.startSession).toHaveBeenCalledWith('Biology', 'neet')
    })
  })

  it('calls onClose when close button is clicked', () => {
    const onCloseMock = vi.fn()
    render(<CatAdaptiveModal isOpen={true} onClose={onCloseMock} />)

    const closeBtn = screen.getByTitle('Close')
    fireEvent.click(closeBtn)

    expect(onCloseMock).toHaveBeenCalledTimes(1)
  })
})

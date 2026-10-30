import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { render } from '../../test/test-utils'
import { StudentPreferencesModal } from './StudentPreferencesModal'
import { useLearningContextStore } from '../../stores/useLearningContextStore'

vi.mock('../../utils/api', () => ({
  fetchApi: vi.fn().mockResolvedValue({ status: 'success' }),
}))

describe('StudentPreferencesModal Component', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useLearningContextStore.setState({
      countryId: 'country-in',
      stateRegion: 'Maharashtra',
      examId: 'exam-jee-main',
      examAuthority: 'National Testing Agency (NTA)',
      targetExamDate: '2026-05-04',
      preparationStage: 'INTERMEDIATE',
      preferredLanguage: 'en',
      studyHoursPerDay: 3,
      difficulty: 'MEDIUM',
      dailyGoal: 20,
      activeCountry: { id: 'country-in', name: 'India', code: 'IN', flagEmoji: '🇮🇳' },
      activeExam: {
        id: 'exam-jee-main',
        name: 'JEE Main',
        slug: 'jee-main',
        countryId: 'country-in',
      },
      activeSubjects: [],
      targetExams: [],
      isConfigured: true,
      hasHydrated: true,
    })
  })

  it('renders student profile modal with tabs and inputs when open', () => {
    render(<StudentPreferencesModal isOpen={true} onClose={onClose} />)

    expect(screen.getByText(/Student Learning Profile & Goal Calibration/i)).toBeInTheDocument()
    expect(screen.getByText(/Target Country/i)).toBeInTheDocument()
    expect(screen.getByText(/State \/ Region/i)).toBeInTheDocument()
    expect(screen.getByText(/Target Exam/i)).toBeInTheDocument()
    expect(screen.getByText(/Exam Authority \/ Body/i)).toBeInTheDocument()
  })

  it('does not render when isOpen is false', () => {
    const { container } = render(<StudentPreferencesModal isOpen={false} onClose={onClose} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('switches between tabs and displays preparation stages and schedule inputs', () => {
    render(<StudentPreferencesModal isOpen={true} onClose={onClose} />)

    // Switch to Prep tab
    const prepTab = screen.getByRole('button', { name: /2\. Preparation Stage/i })
    fireEvent.click(prepTab)

    expect(screen.getByText(/1\. Foundation Stage/i)).toBeInTheDocument()
    expect(screen.getByText(/2\. Subject Mastery/i)).toBeInTheDocument()
    expect(screen.getByText(/Default Question Difficulty/i)).toBeInTheDocument()

    // Switch to Schedule tab
    const scheduleTab = screen.getByRole('button', { name: /3\. Schedule & Language/i })
    fireEvent.click(scheduleTab)

    expect(screen.getByText(/Target Exam Date/i)).toBeInTheDocument()
    expect(screen.getByText(/Preferred Study Language/i)).toBeInTheDocument()
  })

  it('saves updated student preferences when clicking Apply & Save Target', async () => {
    render(<StudentPreferencesModal isOpen={true} onClose={onClose} />)

    const applyBtn = screen.getByRole('button', { name: /Apply & Save Target/i })
    fireEvent.click(applyBtn)

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })
})

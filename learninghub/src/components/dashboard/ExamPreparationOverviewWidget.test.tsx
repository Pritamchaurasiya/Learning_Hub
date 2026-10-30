import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { render } from '../../test/test-utils'
import { ExamPreparationOverviewWidget } from './ExamPreparationOverviewWidget'
import { useLearningContextStore } from '../../stores/useLearningContextStore'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('ExamPreparationOverviewWidget Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useLearningContextStore.setState({
      activeExam: {
        id: 'exam-ssc-cgl',
        name: 'SSC CGL',
        slug: 'ssc-cgl',
        countryId: 'country-in',
        subjects: [
          {
            id: 'sub-ssc-quant',
            name: 'Quantitative Aptitude',
            slug: 'ssc-quantitative-aptitude',
            topics: [{ id: 'top-1', name: 'Arithmetic & Percentages', slug: 'arithmetic' }],
          },
          {
            id: 'sub-ssc-reasoning',
            name: 'General Intelligence & Reasoning',
            slug: 'ssc-reasoning',
            topics: [{ id: 'top-2', name: 'Analogies & Series', slug: 'analogies' }],
          },
        ],
      },
      activeSubjects: [
        {
          id: 'sub-ssc-quant',
          name: 'Quantitative Aptitude',
          slug: 'ssc-quantitative-aptitude',
          topics: [{ id: 'top-1', name: 'Arithmetic & Percentages', slug: 'arithmetic' }],
        },
        {
          id: 'sub-ssc-reasoning',
          name: 'General Intelligence & Reasoning',
          slug: 'ssc-reasoning',
          topics: [{ id: 'top-2', name: 'Analogies & Series', slug: 'analogies' }],
        },
      ],
      examAuthority: 'Staff Selection Commission (SSC)',
      preparationStage: 'INTENSIVE_REVISION',
    })
  })

  it('renders exam preparation overview with syllabus completion, authority and subject cards', () => {
    render(<ExamPreparationOverviewWidget />)

    expect(screen.getByText(/SSC CGL Preparation & Syllabus Mastery/i)).toBeInTheDocument()
    expect(screen.getByText(/Staff Selection Commission \(SSC\)/i)).toBeInTheDocument()
    expect(screen.getByText(/INTENSIVE REVISION/i)).toBeInTheDocument()
    expect(screen.getByText('Quantitative Aptitude')).toBeInTheDocument()
    expect(screen.getByText('General Intelligence & Reasoning')).toBeInTheDocument()
  })

  it('renders practice shortcuts and navigates when clicked', () => {
    render(<ExamPreparationOverviewWidget />)

    expect(screen.getByRole('button', { name: /Topic Tests/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Timed Tests/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mock Exams/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Official PYQs/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Adaptive CAT/i })).toBeInTheDocument()

    const topicBtn = screen.getByRole('button', { name: /Topic Tests/i })
    fireEvent.click(topicBtn)

    expect(mockNavigate).toHaveBeenCalledWith('/tests-a?exam=ssc-cgl&pill=topic')
  })

  it('renders upcoming milestones for the exam', () => {
    render(<ExamPreparationOverviewWidget />)

    expect(screen.getByText(/Upcoming Exam Milestones/i)).toBeInTheDocument()
    expect(screen.getByText(/Tier 1 Computer-Based Test \(CBT\)/i)).toBeInTheDocument()
  })
})

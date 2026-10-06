import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import InterviewSimulatorPage from './InterviewSimulatorPage'
import { interviewService, FALLBACK_SESSION, FALLBACK_TEMPLATES } from '../services/interviewService'

// Mock interviewService
vi.mock('../services/interviewService', () => ({
  interviewService: {
    getTemplates: vi.fn(),
    startSession: vi.fn(),
    getSession: vi.fn(),
    interact: vi.fn(),
    requestHint: vi.fn(),
    evaluateSession: vi.fn(),
  },
  FALLBACK_SESSION: {
    id: 'mock-int-demo-default',
    userId: 'demo-candidate',
    track: 'ALGORITHM_CODING',
    difficulty: 'SENIOR',
    persona: 'SOPHIA_ALGO_SPECIALIST',
    currentStage: 'CLARIFICATION',
    startedAt: new Date().toISOString(),
    candidateCode: 'class LRUCacheWithTTL {}',
    whiteboardNotes: 'Notes',
    activeLanguage: 'javascript',
    hintsRequested: 0,
    unlockedHints: [],
    transcript: [
      {
        id: 'msg-1',
        sender: 'interviewer',
        persona: 'SOPHIA_ALGO_SPECIALIST',
        text: 'Welcome to your mock interview.',
        timestamp: new Date().toISOString(),
      },
    ],
    question: {
      id: 'algo-lru-cache-staff',
      title: 'Distributed LRU Cache',
      track: 'ALGORITHM_CODING',
      difficulty: 'SENIOR',
      targetRole: 'Senior Staff Systems Software Engineer',
      companyStyle: 'GOOGLE',
      problemStatement: 'Design and implement an in-memory LRU Cache.',
      starterCode: { javascript: 'class LRUCacheWithTTL {}', python: '', typescript: '' },
      clarificationAnswers: {},
      testCases: [],
      hints: [],
    },
  },
  FALLBACK_TEMPLATES: [
    {
      id: 'algo-lru-cache-staff',
      title: 'Distributed LRU Cache',
      track: 'ALGORITHM_CODING',
      difficulty: 'SENIOR',
      targetRole: 'Senior Staff Systems Software Engineer',
      companyStyle: 'GOOGLE',
      description: 'Design and implement an in-memory LRU Cache.',
    },
  ],
}))

describe('InterviewSimulatorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(interviewService.getTemplates).mockResolvedValue(FALLBACK_TEMPLATES)
    vi.mocked(interviewService.startSession).mockResolvedValue(FALLBACK_SESSION)
  })

  function renderPage() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    return render(
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <InterviewSimulatorPage />
          </MemoryRouter>
        </QueryClientProvider>
      </HelmetProvider>
    )
  }

  it('renders simulator header, interviewer HUD, and code workspace', async () => {
    renderPage()

    expect(screen.getByText('AI Technical Interview Simulator')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getAllByText(/Sophia/i).length).toBeGreaterThan(0)
      expect(screen.getByText(/Live Code Editor/i)).toBeInTheDocument()
      expect(screen.getByText(/Architecture Scratchpad/i)).toBeInTheDocument()
    })
  })

  it('allows switching workspace tabs between Code, Whiteboard, and Hints', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/Architecture Scratchpad/i)).toBeInTheDocument()
    })

    const whiteboardTab = screen.getByText(/Architecture Scratchpad/i)
    fireEvent.click(whiteboardTab)

    expect(screen.getByPlaceholderText(/Trade-offs/i)).toBeInTheDocument()
  })

  it('triggers candidate message interaction with interviewer', async () => {
    vi.mocked(interviewService.interact).mockResolvedValueOnce({
      session: {
        ...FALLBACK_SESSION,
        transcript: [
          ...FALLBACK_SESSION.transcript,
          {
            id: 'cand-1',
            sender: 'candidate',
            text: 'I will use a Doubly Linked List for O(1) removals.',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'resp-1',
            sender: 'interviewer',
            text: 'Excellent choice. How will you track nodes by key?',
            timestamp: new Date().toISOString(),
          },
        ],
      },
      interviewerResponse: {
        id: 'resp-1',
        sender: 'interviewer',
        text: 'Excellent choice. How will you track nodes by key?',
        timestamp: new Date().toISOString(),
      },
      stageTransitioned: true,
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/Live Code Editor/i)).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText(/Explain your reasoning/i)
    fireEvent.change(input, { target: { value: 'I will use a Doubly Linked List for O(1) removals.' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(interviewService.interact).toHaveBeenCalled()
    })
  })
})

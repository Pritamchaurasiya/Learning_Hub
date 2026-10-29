import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test/test-utils'
import PeerReviewPage from './PeerReviewPage'

vi.mock('../services/peerReviewService', () => ({
  peerReviewService: {
    getPendingReviews: vi.fn().mockResolvedValue([
      {
        id: 'pra-test-1',
        submissionId: 'sub-1',
        submissionTitle: 'Concurrent Rate Limiter in Go',
        authorName: 'Alex Chen',
        courseTitle: 'Distributed Systems',
        language: 'go',
        codeSnippet: 'func main() {}',
        assignedAt: new Date().toISOString(),
        dueBy: new Date(Date.now() + 86400000).toISOString(),
        status: 'pending',
        rubric: [
          {
            id: 'correctness',
            label: 'Correctness',
            maxScore: 40,
            description: 'Algorithmic accuracy',
          },
        ],
      },
    ]),
    getMyFeedback: vi.fn().mockResolvedValue([]),
    submitReview: vi.fn().mockResolvedValue({
      id: 'pra-test-1',
      status: 'submitted',
    }),
  },
}))

describe('PeerReviewPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders peer review banner and tabs', async () => {
    render(<PeerReviewPage />)
    expect(screen.getByText(/Collaborative Peer Evaluation Engine/i)).toBeInTheDocument()
    expect(screen.getByText(/Peer Reviews & Code Critique/i)).toBeInTheDocument()
  })

  it('renders pending assignment card with action button', async () => {
    render(<PeerReviewPage />)
    await waitFor(() => {
      expect(screen.getByText('Concurrent Rate Limiter in Go')).toBeInTheDocument()
    })
    expect(screen.getByText(/Alex Chen/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Start Evaluation/i })).toBeInTheDocument()
  })
})

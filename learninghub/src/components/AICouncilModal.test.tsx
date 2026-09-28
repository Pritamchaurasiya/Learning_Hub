import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AICouncilModal } from './AICouncilModal'

vi.mock('../services/aiCouncilService', () => ({
  aiCouncilService: {
    consultCouncil: vi.fn().mockResolvedValue({
      topic: 'Binary Tree Traversal',
      studentLevel: 'intermediate',
      sentimentDetected: 'neutral',
      councilSummary: 'Unified council consensus: optimize tree traversal space using Morris Traversal.',
      perspectives: {
        socratic_guide: {
          role: 'socratic_guide',
          name: 'Dr. Socratic',
          avatar: '🦉',
          badge: 'Conceptual Architect',
          recommendation: 'What property of in-order predecessor allows avoiding recursive call stack?',
          keyObservations: ['Recursive stack scales with tree height'],
          suggestedAction: 'Trace predecessor pointers',
          confidenceScore: 0.95,
        },
        code_reviewer: {
          role: 'code_reviewer',
          name: 'Staff Reviewer',
          avatar: '⚡',
          badge: 'Complexity & Security',
          recommendation: 'Space complexity can be reduced from O(H) to O(1).',
          keyObservations: ['Avoid memory reallocation in inner loop'],
          suggestedAction: 'Implement boundary check on root null',
          confidenceScore: 0.92,
        },
        motivational_coach: {
          role: 'motivational_coach',
          name: 'Coach Maya',
          avatar: '🌟',
          badge: 'Performance & Mindset',
          recommendation: 'You have mastered standard DFS recursion; non-trivial pointer manipulation is the next level.',
          keyObservations: ['Consistent deliberate practice will internalize this pattern'],
          suggestedAction: 'Take a brief breather before coding',
          confidenceScore: 0.98,
        },
      },
      actionPlan: [
        'Identify inorder predecessor',
        'Establish temporary thread back to current node',
      ],
      aiPowered: true,
    }),
  },
}))

describe('AICouncilModal', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <AICouncilModal isOpen={false} onClose={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders modal header and input controls when open', () => {
    render(<AICouncilModal isOpen={true} onClose={vi.fn()} initialQuery="How to optimize recursion?" />)
    expect(screen.getByText('Multi-Agent Collaborative Tutor')).toBeInTheDocument()
    expect(screen.getByText('Council Mode (3 Agents)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Consult Council/i })).toBeInTheDocument()
  })

  it('executes consultation and renders all 3 agents', async () => {
    render(
      <AICouncilModal
        isOpen={true}
        onClose={vi.fn()}
        initialQuery="How to optimize recursion?"
        problemTitle="Tree Traversal"
      />
    )

    const consultButton = screen.getByRole('button', { name: /Consult Council/i })
    fireEvent.click(consultButton)

    await waitFor(() => {
      expect(screen.getByText('Executive Council Consensus')).toBeInTheDocument()
      expect(screen.getByText('Dr. Socratic')).toBeInTheDocument()
      expect(screen.getByText('Staff Reviewer')).toBeInTheDocument()
      expect(screen.getByText('Coach Maya')).toBeInTheDocument()
      expect(screen.getByText('Identify inorder predecessor')).toBeInTheDocument()
    })
  })
})

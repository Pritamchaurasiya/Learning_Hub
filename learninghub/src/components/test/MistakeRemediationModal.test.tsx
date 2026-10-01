import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MistakeRemediationModal } from './MistakeRemediationModal'
import { RemediationSummary } from '../../services/remediationService'

describe('MistakeRemediationModal', () => {
  const mockSummary: RemediationSummary = {
    attemptId: 'att_999',
    testId: 'test_123',
    testTitle: 'GATE Data Structures & Algorithms',
    totalQuestions: 10,
    totalMistakes: 2,
    accuracyPercentage: 80,
    primaryWeakness: 'CONCEPT_GAP',
    primaryWeaknessLabel: 'Conceptual Gaps',
    actionableInsights: [
      'Detected 1 conceptual gap in Graph Theory. Focus on Dijkstra invariant.',
    ],
    recommendedDrillTitle: 'Targeted Drill: Graph Theory Mastery',
    targetTopics: ['Graph Theory', 'Dynamic Programming'],
    categories: [
      {
        type: 'CONCEPT_GAP',
        label: 'Conceptual Gaps',
        count: 1,
        percentage: 50,
        color: 'text-red-600',
        description: 'Theory gap',
        iconName: 'BrainCircuit',
      },
      {
        type: 'TIME_CRUNCH',
        label: 'Time Pressure Rushes',
        count: 1,
        percentage: 50,
        color: 'text-purple-600',
        description: 'Rushed problem',
        iconName: 'Clock',
      },
    ],
    items: [
      {
        questionId: 'q_graph',
        questionText: 'What is the time complexity of Dijkstra with Fib Heap?',
        topic: 'Graph Theory',
        timeSpent: 75,
        selectedOptionText: 'O(V^2)',
        correctOptionText: 'O(E + V log V)',
        explanation: 'Fibonacci heap gives amortized O(1) decrease-key.',
        mistakeType: 'CONCEPT_GAP',
        mistakeLabel: 'Conceptual Gap',
        severity: 'CRITICAL',
        diagnosis: 'Selected quadratic complexity instead of Fibonacci heap bound.',
        recommendedAction: 'Review amortized heap bounds.',
        suggestedEbookQuery: 'Graph Theory',
      },
      {
        questionId: 'q_dp',
        questionText: 'What is the space complexity of bottom-up Fibonacci with 2 variables?',
        topic: 'Dynamic Programming',
        timeSpent: 8,
        selectedOptionText: 'O(N)',
        correctOptionText: 'O(1)',
        explanation: 'Only previous 2 values need to be stored.',
        mistakeType: 'TIME_CRUNCH',
        mistakeLabel: 'Time Pressure / Rush',
        severity: 'HIGH',
        diagnosis: 'Rushed answer under time pressure.',
        recommendedAction: 'Check iterative state reduction.',
        suggestedEbookQuery: 'Dynamic Programming',
      },
    ],
  }

  it('renders modal with summary stats and error breakdown', () => {
    const handleClose = vi.fn()
    const handleStartDrill = vi.fn()

    render(
      <MistakeRemediationModal
        isOpen={true}
        onClose={handleClose}
        summary={mockSummary}
        onStartTargetedDrill={handleStartDrill}
      />
    )

    expect(screen.getByText('Cognitive Mistake Diagnostics')).toBeDefined()
    expect(screen.getAllByText(/Conceptual Gaps/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Graph Theory/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Start 5-Min Remediation Drill/i)).toBeDefined()
  })

  it('filters questions when clicking category pill', () => {
    render(
      <MistakeRemediationModal
        isOpen={true}
        onClose={vi.fn()}
        summary={mockSummary}
        onStartTargetedDrill={vi.fn()}
      />
    )

    // Click on Time Pressure Rushes category pill
    const timeFilter = screen.getByRole('button', { name: /Time Pressure Rushes \(1\)/i })
    fireEvent.click(timeFilter)

    expect(screen.getAllByText(/Dynamic Programming/i).length).toBeGreaterThan(0)
    expect(screen.queryByText(/What is the time complexity of Dijkstra with Fib Heap\?/i)).toBeNull()
  })

  it('triggers onStartTargetedDrill with target topics when CTA button is clicked', () => {
    const handleStartDrill = vi.fn()

    render(
      <MistakeRemediationModal
        isOpen={true}
        onClose={vi.fn()}
        summary={mockSummary}
        onStartTargetedDrill={handleStartDrill}
      />
    )

    const drillButton = screen.getByRole('button', { name: /Start 5-Min Remediation Drill/i })
    fireEvent.click(drillButton)

    expect(handleStartDrill).toHaveBeenCalledWith(
      ['Graph Theory', 'Dynamic Programming'],
      ['CONCEPT_GAP', 'TIME_CRUNCH']
    )
  })

  it('expands full step-by-step solution when toggled', () => {
    render(
      <MistakeRemediationModal
        isOpen={true}
        onClose={vi.fn()}
        summary={mockSummary}
        onStartTargetedDrill={vi.fn()}
      />
    )

    const viewSolutionButtons = screen.getAllByText('View Full Solution')
    fireEvent.click(viewSolutionButtons[0])

    expect(screen.getByText(/Step-by-Step Explanation:/i)).toBeDefined()
    expect(screen.getByText(/Fibonacci heap gives amortized O\(1\) decrease-key\./i)).toBeDefined()
  })
})

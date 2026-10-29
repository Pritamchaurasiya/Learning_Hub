/**
 * AdaptiveRemediationModal.test.tsx
 * 
 * Test suite for Milestone 32 Adaptive Remediation Modal.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AdaptiveRemediationModal } from './AdaptiveRemediationModal'
import { remediationService, QuestionTelemetry } from '../../services/remediationService'

describe('AdaptiveRemediationModal', () => {
  const mockTelemetry: QuestionTelemetry = {
    questionId: 'q-99',
    conceptId: 'binary-search',
    conceptName: 'Binary Search Predicate',
    difficulty: -0.1,
    discrimination: 1.1,
    timeSpentSeconds: 15,
    benchmarkTimeSeconds: 60,
    isCorrect: false,
    selectedOptionIndex: 2,
    correctOptionIndex: 0,
    userPriorMastery: 0.85
  }

  beforeEach(() => {
    vi.restoreAllMocks()

    vi.spyOn(remediationService, 'diagnose').mockResolvedValue({
      questionId: 'q-99',
      conceptId: 'binary-search',
      conceptName: 'Binary Search Predicate',
      etiology: 'CARELESS_SLIP',
      confidence: 0.92,
      explanation: 'Rapid response time with high prior mastery indicates an execution slip.',
      prescribedScaffold: {
        prerequisiteId: 'prereq-binary-search',
        prerequisiteName: 'Foundational Principles of Binary Search',
        targetDifficulty: -0.5,
        drillStepCount: 1,
        estimatedRecoveryTimeMinutes: 2
      }
    })

    vi.spyOn(remediationService, 'getDrill').mockResolvedValue({
      conceptId: 'binary-search',
      conceptName: 'Binary Search Predicate',
      etiology: 'CARELESS_SLIP',
      steps: [
        {
          stepNumber: 1,
          tier: 'PREREQUISITE_ANCHOR',
          prompt: '[Step 1 - Fundamental Anchor] Identify the core property of Binary Search Predicate:',
          options: [
            'Invariant conservation of bounded state properties',
            'Arbitrary divergent iteration without termination guarantee'
          ],
          correctIndex: 0,
          hint: 'Think of deterministic guarantees.',
          explanation: 'System soundness begins by confirming state invariants.',
          difficulty: -0.5
        }
      ],
      potentialMasteryDelta: 0.15
    })

    vi.spyOn(remediationService, 'submitDrill').mockResolvedValue({
      conceptId: 'binary-search',
      passed: true,
      score: 1,
      previousMastery: 0.85,
      updatedMastery: 0.95,
      masteryDelta: 0.1,
      feedback: 'Remediation Verified!',
      recoveredStatus: 'FULLY_RECOVERED'
    })
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <AdaptiveRemediationModal
        isOpen={false}
        onClose={vi.fn()}
        telemetry={mockTelemetry}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders cognitive etiology diagnosis card when opened', async () => {
    render(
      <AdaptiveRemediationModal
        isOpen={true}
        onClose={vi.fn()}
        telemetry={mockTelemetry}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('adaptive-remediation-modal')).toBeInTheDocument()
      expect(screen.getByText(/AI Adaptive Remediation & Weakness Repair/i)).toBeInTheDocument()
      expect(screen.getByTestId('etiology-badge')).toBeInTheDocument()
      expect(screen.getByText(/Etiology: CARELESS SLIP/i)).toBeInTheDocument()
    })
  })

  it('allows answering scaffolding steps and submitting drill', async () => {
    const onMasteryUpdated = vi.fn()

    render(
      <AdaptiveRemediationModal
        isOpen={true}
        onClose={vi.fn()}
        telemetry={mockTelemetry}
        onMasteryUpdated={onMasteryUpdated}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/Step 1 - Fundamental Anchor/i)).toBeInTheDocument()
    })

    // Click the first option for Step 1
    const firstOption = screen.getByText(/Invariant conservation of bounded state properties/i)
    fireEvent.click(firstOption)

    // Submit Drill
    const submitBtn = screen.getByTestId('submit-drill-button')
    fireEvent.click(submitBtn)

    // Verification Result Card
    await waitFor(() => {
      expect(screen.getByTestId('remediation-result-card')).toBeInTheDocument()
      expect(screen.getAllByText(/Remediation Verified!/i).length).toBeGreaterThanOrEqual(1)
    })

    expect(onMasteryUpdated).toHaveBeenCalledWith('binary-search', 0.95)
  })
})

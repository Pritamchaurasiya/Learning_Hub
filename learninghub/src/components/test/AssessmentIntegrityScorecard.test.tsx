import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AssessmentIntegrityScorecard } from './AssessmentIntegrityScorecard'
import type { TestResult } from '../../services/testsAService'

const mockCleanResult: TestResult = {
  attempt_id: 'att-123',
  test_id: 'test-1',
  test_title: 'Algorithms Midterm',
  mode: 'mock',
  score: 85,
  total_marks: 100,
  percentage: 85,
  passed: true,
  time_taken: 1200,
  time_limit: 30,
  correct_count: 17,
  incorrect_count: 3,
  unanswered_count: 0,
  integrity_score: 100,
  integrity_risk: 'EXCELLENT',
  telemetry_summary: {
    integrity_score: 100,
    risk_level: 'EXCELLENT',
    total_violations: 0,
    violation_counts: {},
    flagged_for_review: false,
    audit_hash: 'lh-proof-abc12345',
    events_logged: 0,
  },
  question_results: [],
}

const mockFlaggedResult: TestResult = {
  ...mockCleanResult,
  integrity_score: 45,
  integrity_risk: 'HIGH_RISK',
  telemetry_summary: {
    integrity_score: 45,
    risk_level: 'HIGH_RISK',
    total_violations: 4,
    violation_counts: {
      TAB_SWITCH: 2,
      DEV_TOOLS: 1,
      COPY_PASTE: 1,
    },
    flagged_for_review: true,
    audit_hash: 'lh-proof-flagged99',
    events_logged: 4,
  },
}

describe('AssessmentIntegrityScorecard Component', () => {
  it('renders clean integrity verification score and badge', () => {
    render(<AssessmentIntegrityScorecard result={mockCleanResult} />)
    expect(screen.getByText('Assessment Integrity Shield')).toBeInTheDocument()
    expect(screen.getByText('Verified Clean Session')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('renders violation counts and flags high risk session', () => {
    render(<AssessmentIntegrityScorecard result={mockFlaggedResult} />)
    expect(screen.getByText('Audit Review Flagged')).toBeInTheDocument()
    expect(screen.getByText('45')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument() // TAB_SWITCH count
  })

  it('toggles audit details drawer on button click', () => {
    render(<AssessmentIntegrityScorecard result={mockCleanResult} />)
    const toggleButton = screen.getByText('Audit Details')
    fireEvent.click(toggleButton)

    expect(screen.getByText('Session Telemetry Log')).toBeInTheDocument()
    expect(screen.getByText('Hide Audit')).toBeInTheDocument()
  })

  it('copies audit digest hash to clipboard', () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText,
      },
    })

    render(<AssessmentIntegrityScorecard result={mockCleanResult} />)
    const copyButton = screen.getByTitle('Copy cryptographic audit proof digest')
    fireEvent.click(copyButton)

    expect(writeText).toHaveBeenCalledWith('lh-proof-abc12345')
  })
})

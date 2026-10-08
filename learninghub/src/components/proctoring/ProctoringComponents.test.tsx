import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AIProctoringHUD } from './AIProctoringHUD'
import { ProctoringReportModal } from './ProctoringReportModal'
import { ProctoringSession } from '../../types/proctoring'
import { proctoringService } from '../../services/proctoringService'

describe('Proctoring Components (Milestone 14)', () => {
  const mockSession: ProctoringSession = {
    sessionId: 'session-xyz',
    userId: 'user-abc',
    testAttemptId: 'test-123',
    examTitle: 'Distributed Systems Exam',
    startedAt: new Date().toISOString(),
    status: 'ACTIVE',
    integrityScore: 98,
    totalFramesAnalyzed: 10,
    incidents: [],
    averageGazeDeviation: 0.05,
    averageNoiseDecibels: 28,
  }

  it('renders AIProctoringHUD with tracking HUD and integrity score', () => {
    const onOpenReport = vi.fn()
    render(
      <AIProctoringHUD
        session={mockSession}
        onOpenReportModal={onOpenReport}
      />
    )

    expect(screen.getByText('AI Vision & Audio Proctor HUD')).toBeInTheDocument()
    expect(screen.getByText('Integrity: 98%')).toBeInTheDocument()
    expect(screen.getByText(/FACE TRACKING ACTIVE/i)).toBeInTheDocument()

    // Click Report button
    fireEvent.click(screen.getByRole('button', { name: /Report/i }))
    expect(onOpenReport).toHaveBeenCalled()
  })

  it('renders ProctoringReportModal and displays cryptographic audit hash', async () => {
    vi.spyOn(proctoringService, 'finalizeSession').mockResolvedValueOnce({
      sessionId: 'session-xyz',
      userId: 'user-abc',
      testAttemptId: 'test-123',
      examTitle: 'Distributed Systems Exam',
      durationMinutes: 45,
      finalIntegrityScore: 98,
      verdict: 'VERIFIED_CLEAN',
      totalIncidentsCount: 0,
      highSeverityCount: 0,
      incidentBreakdown: {
        FACE_MISSING: 0,
        MULTIPLE_FACES_DETECTED: 0,
        GAZE_AVERTED: 0,
        VOICE_ANOMALY_DETECTED: 0,
        TAB_SWITCH_ATTEMPT: 0,
        UNAUTHORIZED_DEVICE: 0,
        BACKGROUND_TALK: 0,
        SCREEN_SPLIT_SUSPECTED: 0,
      },
      gazeCompliancePercentage: 99,
      acousticCompliancePercentage: 98,
      cryptographicAuditHash: 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
      generatedAt: new Date().toISOString(),
    })

    const onClose = vi.fn()
    render(
      <ProctoringReportModal
        sessionId="session-xyz"
        isOpen={true}
        onClose={onClose}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('AI Proctoring Integrity Audit')).toBeInTheDocument()
    })

    expect(screen.getByText('VERIFIED CLEAN')).toBeInTheDocument()
    expect(screen.getByText(/fedcba9876543210/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Acknowledge & Close Report/i }))
    expect(onClose).toHaveBeenCalled()
  })
})

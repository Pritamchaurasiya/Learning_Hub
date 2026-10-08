import { describe, it, expect, vi } from 'vitest'
import { ScorecardPdfService } from './scorecardPdfService'
import type { TestResult } from './testsAService'

describe('ScorecardPdfService', () => {
  const mockResult: any = {
    test_id: 'test-123',
    attempt_id: 'att-789-xyz',
    score: 85,
    max_score: 100,
    percentage: 85,
    is_passed: true,
    passing_score: 50,
    time_taken_seconds: 450,
    correct_answers_count: 17,
    incorrect_answers_count: 3,
    total_questions: 20,
    submitted_at: '2026-10-07T12:00:00Z',
    mode: 'MOCK',
    adaptive_diagnostics: {
      finalTheta: 1.42,
      abilityBand: 'Advanced Mastery',
      confidenceInterval: [1.12, 1.72],
      stoppingReason: 'SEM threshold met',
      totalItemsAdministered: 20,
      standardError: 0.15,
    },
    telemetry_digest: {
      integrityScore: 98,
      riskLevel: 'LOW_RISK',
      tabSwitches: 1,
      windowBlurEvents: 1,
      fullscreenExits: 0,
      pasteAttempts: 0,
    },
    question_results: [
      {
        question_id: 'q-1',
        question_text: 'What is the derivative of $\\sin(x)$?',
        question_type: 'MCQ',
        selected_options: [],
        correct_options: [],
        explanation: 'Standard derivative',
        time_spent: 25,
        is_flagged: false,
        is_correct: true,
        topic: 'Calculus',
        marks_obtained: 4,
        max_marks: 4,
        time_spent_seconds: 25,
      },
      {
        question_id: 'q-2',
        question_text: 'Solve $\\int e^{2x} dx$',
        question_type: 'MCQ',
        selected_options: [],
        correct_options: [],
        explanation: 'Integration rule',
        time_spent: 40,
        is_flagged: false,
        is_correct: false,
        topic: 'Calculus',
        marks_obtained: -1,
        max_marks: 4,
        time_spent_seconds: 40,
      },
      {
        question_id: 'q-3',
        question_text: 'State Newton Second Law of Motion',
        question_type: 'MCQ',
        selected_options: [],
        correct_options: [],
        explanation: 'F = ma',
        time_spent: 20,
        is_flagged: false,
        is_correct: true,
        topic: 'Mechanics',
        marks_obtained: 4,
        max_marks: 4,
        time_spent_seconds: 20,
      },
    ],
  }

  it('generates deterministic verification audit metadata', () => {
    const audit1 = ScorecardPdfService.generateVerificationAudit(mockResult)
    const audit2 = ScorecardPdfService.generateVerificationAudit(mockResult)

    expect(audit1.verificationHash).toBeDefined()
    expect(audit1.verificationHash.startsWith('LH-')).toBe(true)
    expect(audit1.verificationHash).toBe(audit2.verificationHash)
    expect(audit1.verificationUrl).toContain(encodeURIComponent(audit1.verificationHash))
    expect(audit1.verificationUrl).toContain(encodeURIComponent(mockResult.attempt_id))
  })

  it('creates an official vector PDF document with candidate metrics and topics', async () => {
    const doc = await ScorecardPdfService.createScorecardDocument(
      mockResult,
      'JEE Advanced Simulation Mock Paper 1',
      {
        candidateName: 'Pritam Chaurasiya',
        candidateId: 'JEE-2026-9921',
        institutionName: 'LearningHub National Academy',
      }
    )

    expect(doc).toBeDefined()
    // jsPDF internal pages array has at least 1 page
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1)
  })

  it('handles result without question_results or telemetry gracefully', async () => {
    const minimalResult: TestResult = {
      test_id: 't-min',
      attempt_id: 'att-min-999',
      test_title: 'Minimal Test',
      mode: 'practice',
      score: 50,
      total_marks: 100,
      percentage: 50,
      passed: false,
      is_passed: false,
      time_taken: 120,
      time_limit: 600,
      correct_count: 5,
      incorrect_count: 5,
      unanswered_count: 0,
      time_taken_seconds: 120,
      correct_answers_count: 5,
      incorrect_answers_count: 5,
      total_questions: 10,
      question_results: [],
    }

    const doc = await ScorecardPdfService.createScorecardDocument(
      minimalResult,
      'General Practice Test'
    )

    expect(doc).toBeDefined()
    expect(doc.getNumberOfPages()).toBe(1)
  })

  it('invokes doc.save on downloadScorecard without error', async () => {
    const doc = await ScorecardPdfService.createScorecardDocument(mockResult, 'Test Title')
    const saveSpy = vi.spyOn(doc, 'save').mockImplementation(() => doc)
    vi.spyOn(ScorecardPdfService, 'createScorecardDocument').mockResolvedValue(doc)

    await ScorecardPdfService.downloadScorecard(mockResult, 'Calculus Mock Exam')

    expect(saveSpy).toHaveBeenCalled()
    expect(saveSpy.mock.calls[0][0]).toMatch(/Scorecard_calculus_mock_exam_.*\.pdf/)
  })
})

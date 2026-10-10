import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { SelfHealingCodePage } from './SelfHealingCodePage'
import { selfHealingService } from '../services/selfHealingService'

vi.mock('../services/selfHealingService', () => ({
  selfHealingService: {
    getPreset: vi.fn(),
    analyzeCode: vi.fn(),
  },
}))

const mockPreset = {
  presetId: 'N_PLUS_ONE_QUERY_LOOP' as const,
  fileName: 'userCourseService.ts',
  code: 'for (const id of userIds) { await prisma.user.findUnique({ where: { id } }); }',
}

const mockAnalysis = {
  analysisId: 'analysis-123',
  fileName: 'userCourseService.ts',
  originalCode: 'for (const id of userIds) { ... }',
  detectedIssues: [
    {
      id: 'ISSUE-1',
      title: 'N+1 Database Query Anti-Pattern',
      category: 'PERFORMANCE_N_PLUS_ONE' as const,
      severity: 'HIGH' as const,
      cweOrOwaspId: 'CWE-1050',
      lineNumberStart: 4,
      lineNumberEnd: 8,
      problematicSnippet: 'for (const id of userIds) { ... }',
      explanation: 'Sequential DB roundtrips.',
      theoreticalImpact: 'High latency.',
    },
  ],
  recommendedPatch: {
    patchId: 'patch-1',
    unifiedDiff: '--- a/file\n+++ b/file',
    patchedCode: 'const [users, enrollments] = await Promise.all([...]);',
    cyclomaticComplexityBefore: 7,
    cyclomaticComplexityAfter: 3,
    estimatedLatencyReductionPct: 84,
    securityPostureImprovementPct: 30,
    safetyVerdict: 'SAFE_TO_APPLY' as const,
    verificationChecklist: ['Static AST verified'],
  },
  overallHealthScoreBefore: 45,
  overallHealthScoreAfter: 98,
  analysisTimestamp: '2026-10-11T00:00:00Z',
}

describe('SelfHealingCodePage (Milestone 20)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(selfHealingService.getPreset).mockResolvedValue(mockPreset)
    vi.mocked(selfHealingService.analyzeCode).mockResolvedValue(mockAnalysis)
  })

  it('renders page header, title, and initial vulnerability diagnostics', async () => {
    render(
      <BrowserRouter>
        <SelfHealingCodePage />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Autonomous AI Code Refactoring & Self-Healing Studio/i)).toBeInTheDocument()
    })

    expect(screen.getByText('Milestone 20')).toBeInTheDocument()
    expect(screen.getByText('N+1 Database Query Anti-Pattern')).toBeInTheDocument()
    expect(screen.getByText('userCourseService.ts')).toBeInTheDocument()
  })

  it('allows switching presets and triggers analysis', async () => {
    render(
      <BrowserRouter>
        <SelfHealingCodePage />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('N+1 Query Loop in Express/Prisma')).toBeInTheDocument()
    })

    const sqliBtn = screen.getByText('SQL Injection via String Concat')
    fireEvent.click(sqliBtn)

    await waitFor(() => {
      expect(selfHealingService.getPreset).toHaveBeenCalledWith('SQL_INJECTION_CONCATENATION')
    })
  })

  it('handles apply patch button and displays confirmation notification', async () => {
    render(
      <BrowserRouter>
        <SelfHealingCodePage />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Apply Autonomous Remediation Patch/i })).toBeInTheDocument()
    })

    const applyBtn = screen.getByRole('button', { name: /Apply Autonomous Remediation Patch/i })
    fireEvent.click(applyBtn)

    await waitFor(() => {
      expect(screen.getByText(/Remediation patch successfully applied to source AST/i)).toBeInTheDocument()
    })
  })
})

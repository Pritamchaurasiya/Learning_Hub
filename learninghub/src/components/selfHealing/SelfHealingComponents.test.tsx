import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VulnerabilityDiagnosticCard } from './VulnerabilityDiagnosticCard'
import { CodeDiffViewerPanel } from './CodeDiffViewerPanel'
import { PatchImpactScorecard } from './PatchImpactScorecard'
import { CodeIssueDiagnostic, SelfHealingPatch } from '../../types/selfHealing'

const mockIssue: CodeIssueDiagnostic = {
  id: 'ISSUE-1',
  title: 'N+1 Database Query Loop',
  category: 'PERFORMANCE_N_PLUS_ONE',
  severity: 'HIGH',
  cweOrOwaspId: 'CWE-1050',
  lineNumberStart: 4,
  lineNumberEnd: 8,
  problematicSnippet: 'for (const id of userIds) { await prisma.user... }',
  explanation: 'Queries sequentially in loop.',
  theoreticalImpact: 'Linear network latency delay.',
}

const mockPatch: SelfHealingPatch = {
  patchId: 'patch-1',
  unifiedDiff: '--- a/file\n+++ b/file',
  patchedCode: 'const users = await prisma.user.findMany({ ... });',
  cyclomaticComplexityBefore: 7,
  cyclomaticComplexityAfter: 3,
  estimatedLatencyReductionPct: 84,
  securityPostureImprovementPct: 40,
  safetyVerdict: 'SAFE_TO_APPLY',
  verificationChecklist: ['Static AST verified', 'Automated regression passed'],
}

describe('SelfHealing Components (Milestone 20)', () => {
  it('renders VulnerabilityDiagnosticCard with severity and code snippet', () => {
    render(<VulnerabilityDiagnosticCard issue={mockIssue} />)

    expect(screen.getByText('N+1 Database Query Loop')).toBeInTheDocument()
    expect(screen.getByText('HIGH')).toBeInTheDocument()
    expect(screen.getByText('CWE-1050')).toBeInTheDocument()
    expect(screen.getByText(/for \(const id of userIds\)/)).toBeInTheDocument()
  })

  it('renders CodeDiffViewerPanel and handles interactions', () => {
    const onApply = vi.fn()

    render(
      <CodeDiffViewerPanel
        fileName="userCourseService.ts"
        originalCode="const a = 1;"
        patch={mockPatch}
        onApplyPatch={onApply}
      />
    )

    expect(screen.getByText('userCourseService.ts')).toBeInTheDocument()
    expect(screen.getByText('BEFORE (Vulnerable)')).toBeInTheDocument()
    expect(screen.getByText('AFTER (Remediated)')).toBeInTheDocument()

    const applyBtn = screen.getByRole('button', { name: /Apply Autonomous Remediation Patch/i })
    fireEvent.click(applyBtn)
    expect(onApply).toHaveBeenCalled()
  })

  it('renders PatchImpactScorecard with metrics and verification checklist', () => {
    render(
      <PatchImpactScorecard
        patch={mockPatch}
        scoreBefore={40}
        scoreAfter={98}
      />
    )

    expect(screen.getByText('SAFE_TO_APPLY')).toBeInTheDocument()
    expect(screen.getByText('-84%')).toBeInTheDocument()
    expect(screen.getByText('+40%')).toBeInTheDocument()
    expect(screen.getByText('Static AST verified')).toBeInTheDocument()
  })
})

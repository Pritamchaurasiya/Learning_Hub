import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { IssueTriageCard } from './IssueTriageCard'
import { PullRequestScorecard } from './PullRequestScorecard'
import { SweAgentThoughtStream } from './SweAgentThoughtStream'
import { SwePatchDiffViewer } from './SwePatchDiffViewer'
import {
  SweBenchmarkIssue,
  SynthesizedPullRequest,
  SweAgentThoughtStep,
  MultiFilePatch,
} from '../../types/sweStudio'

const mockIssue: SweBenchmarkIssue = {
  id: 'SWE-101',
  title: 'Race condition in concurrent cache invalidation',
  description: 'Under high concurrent load (>1000 req/s), cache invalidation calls do not acquire mutex locks.',
  category: 'CONCURRENCY_RACE',
  severity: 'HIGH',
  affectedFiles: ['src/services/CacheCoordinator.ts'],
  expectedBehavior: 'Must acquire a distributed lease/mutex.',
  actualBehavior: 'Concurrent invalidations execute optimistically without synchronization.',
  stackTrace: 'Error: InconsistentCacheState at CacheCoordinator.invalidate (src/services/CacheCoordinator.ts:142:15)',
}

const mockPR: SynthesizedPullRequest = {
  id: 'PR-101',
  branchName: 'swe/fix-concurrency-race-swe-101',
  baseBranch: 'main',
  prTitle: 'fix(cache): acquire distributed mutex lease before cache eviction',
  prDescriptionMarkdown: '## Summary\nAcquires distributed lock before invalidation.',
  issueId: 'SWE-101',
  author: 'LearningHub Autonomous SWE Agent (SWE-Bench v2.4)',
  createdAt: new Date().toISOString(),
  readyToMerge: true,
  cryptographicPatchSeal: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  patches: [],
  verification: {
    reproductionTestPassed: true,
    reproductionTestDetails: {
      testName: 'testConcurrentInvalidationRace',
      executedInMs: 42,
      baselineResult: 'FAILED',
      patchedResult: 'PASSED',
      testCode: 'it("acquires lock", async () => {})',
    },
    regressionTestSuitePassed: true,
    totalRegressionTestsRun: 50,
    regressionsCount: 0,
    securityScanPassed: true,
    securityNotes: ['SAST scan clean: Zero prototype or injection vulnerabilities found'],
  },
}

const mockThoughtSteps: SweAgentThoughtStep[] = [
  {
    step: 'INGESTION_AND_TRIAGE',
    title: 'Ingestion & Triage',
    status: 'COMPLETED',
    durationMs: 140,
    summary: 'Parsed stack trace and identified affected modules.',
    details: ['Analyzed 2 affected files', 'Classified severity as HIGH'],
  },
  {
    step: 'FAULT_LOCALIZATION',
    title: 'Spectrum-Based Fault Localization (SBFL)',
    status: 'COMPLETED',
    durationMs: 220,
    summary: 'Ochiai ranking isolated suspicious line 142.',
    details: ['Calculated Ochiai score: 0.948'],
  },
]

const mockPatches: MultiFilePatch[] = [
  {
    filePath: 'src/services/CacheCoordinator.ts',
    originalCode: 'await this.redis.del(key)',
    patchedCode: 'await this.mutex.acquire(key)\nawait this.redis.del(key)\nawait this.mutex.release(key)',
    unifiedDiff: '--- a/src/services/CacheCoordinator.ts\n+++ b/src/services/CacheCoordinator.ts\n@@ -140,3 +140,5 @@\n+await this.mutex.acquire(key)\n await this.redis.del(key)\n+await this.mutex.release(key)',
    linesAdded: 2,
    linesRemoved: 0,
    semanticRationale: 'Introduces distributed mutex guard around cache deletion',
  },
]

describe('SWE Studio Components', () => {
  describe('IssueTriageCard', () => {
    it('renders issue id, title, severity and expected vs actual behavior', () => {
      render(<IssueTriageCard issue={mockIssue} />)
      expect(screen.getByText('SWE-101')).toBeInTheDocument()
      expect(screen.getByText(/Race condition in concurrent cache invalidation/i)).toBeInTheDocument()
      expect(screen.getByText(/High Severity/i)).toBeInTheDocument()
      expect(screen.getByText(/Must acquire a distributed lease/i)).toBeInTheDocument()
    })

    it('toggles stack trace display on click', () => {
      render(<IssueTriageCard issue={mockIssue} />)
      const toggleBtn = screen.getByRole('button', { name: /Show Diagnostics Stack Trace/i })
      fireEvent.click(toggleBtn)
      expect(screen.getByText(/InconsistentCacheState/i)).toBeInTheDocument()
    })
  })

  describe('PullRequestScorecard', () => {
    it('renders PR ID, title, author and verification checklist', () => {
      render(<PullRequestScorecard pullRequest={mockPR} />)
      expect(screen.getByText('PR-101')).toBeInTheDocument()
      expect(screen.getByText(/fix\(cache\): acquire distributed mutex lease/i)).toBeInTheDocument()
      expect(screen.getByText(/Ready for Merge/i)).toBeInTheDocument()
      expect(screen.getByText('Reproduction Test')).toBeInTheDocument()
      expect(screen.getByText(/50\/50 Clean/i)).toBeInTheDocument()
      expect(screen.getByText(/Security Gate/i)).toBeInTheDocument()
      expect(screen.getByText(/Cryptographic Patch Attestation Seal/i)).toBeInTheDocument()
    })
  })

  describe('SweAgentThoughtStream', () => {
    it('renders agent thought steps and allows expanding details', () => {
      render(<SweAgentThoughtStream steps={mockThoughtSteps} />)
      expect(screen.getByText(/Autonomous Agent Execution Stream/i)).toBeInTheDocument()
      expect(screen.getByText(/Ingestion & Triage/i)).toBeInTheDocument()
      expect(screen.getByText(/Ochiai ranking isolated suspicious line 142/i)).toBeInTheDocument()

      const toggleButtons = screen.getAllByRole('button', { name: /Toggle details/i })
      fireEvent.click(toggleButtons[0]!)
      expect(screen.getByText(/Analyzed 2 affected files/i)).toBeInTheDocument()
    })
  })

  describe('SwePatchDiffViewer', () => {
    it('renders unified diff view and file tabs', () => {
      render(<SwePatchDiffViewer patches={mockPatches} />)
      expect(screen.getAllByText(/CacheCoordinator.ts/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/\+2/).length).toBeGreaterThan(0)
      expect(screen.getByText(/Introduces distributed mutex guard/i)).toBeInTheDocument()
    })
  })
})

export type SweIssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type SweIssueCategory =
  | 'BUG_REGRESSION'
  | 'CONCURRENCY_RACE'
  | 'MEMORY_LEAK'
  | 'SECURITY_EXPLOIT'
  | 'PERFORMANCE_BLOWUP'
  | 'DISTRIBUTED_RESILIENCE'

export type SweAgentStepName =
  | 'INGESTION_AND_TRIAGE'
  | 'FAULT_LOCALIZATION'
  | 'REPRODUCTION_TEST_SYNTHESIS'
  | 'PATCH_GENERATION'
  | 'REGRESSION_AND_VERIFICATION'
  | 'PR_SYNTHESIS'

export type SweAgentStepStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'

export interface SweAgentThoughtStep {
  step: SweAgentStepName
  title: string
  status: SweAgentStepStatus
  durationMs: number
  summary: string
  details: string[]
  metrics?: Record<string, string | number>
}

export interface SuspiciousCodeLocation {
  filePath: string
  functionName: string
  startLine: number
  endLine: number
  ochiaiSuspiciousnessScore: number // 0.0 - 1.0 (SBFL Ochiai metric)
  tarantulaScore: number // 0.0 - 1.0
  culpritHypothesis: string
}

export interface MultiFilePatch {
  filePath: string
  originalCode: string
  patchedCode: string
  unifiedDiff: string
  linesAdded: number
  linesRemoved: number
  semanticRationale: string
}

export interface SweVerificationResult {
  reproductionTestPassed: boolean
  reproductionTestDetails: {
    testName: string
    executedInMs: number
    baselineResult: 'FAILED' | 'PASSED'
    patchedResult: 'FAILED' | 'PASSED'
    testCode: string
  }
  regressionTestSuitePassed: boolean
  totalRegressionTestsRun: number
  regressionsCount: number
  securityScanPassed: boolean
  securityNotes: string[]
}

export interface SynthesizedPullRequest {
  id: string
  branchName: string
  baseBranch: string
  prTitle: string
  prDescriptionMarkdown: string
  issueId: string
  author: string
  createdAt: string
  patches: MultiFilePatch[]
  verification: SweVerificationResult
  cryptographicPatchSeal: string // HMAC-SHA256 signature
  readyToMerge: boolean
}

export interface SweBenchmarkIssue {
  id: string
  title: string
  description: string
  category: SweIssueCategory
  severity: SweIssueSeverity
  stackTrace?: string
  affectedFiles: string[]
  expectedBehavior: string
  actualBehavior: string
  reproductionHint?: string
}

export interface SweResolutionPipelineResult {
  issue: SweBenchmarkIssue
  agentThoughtStream: SweAgentThoughtStep[]
  suspiciousLocations: SuspiciousCodeLocation[]
  patches: MultiFilePatch[]
  verification: SweVerificationResult
  pullRequest: SynthesizedPullRequest
  executionTimeMs: number
}

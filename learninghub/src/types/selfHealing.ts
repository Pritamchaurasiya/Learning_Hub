export type VulnerabilityCategory =
  | 'SECURITY_INJECTION'
  | 'PERFORMANCE_N_PLUS_ONE'
  | 'MEMORY_RESOURCE_LEAK'
  | 'ASYNC_EVENT_LOOP_BLOCKING'
  | 'REACT_RENDER_THRASHING'

export type VulnerabilitySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export interface CodeIssueDiagnostic {
  id: string
  title: string
  category: VulnerabilityCategory
  severity: VulnerabilitySeverity
  cweOrOwaspId: string
  lineNumberStart: number
  lineNumberEnd: number
  problematicSnippet: string
  explanation: string
  theoreticalImpact: string
}

export interface SelfHealingPatch {
  patchId: string
  unifiedDiff: string
  patchedCode: string
  cyclomaticComplexityBefore: number
  cyclomaticComplexityAfter: number
  estimatedLatencyReductionPct: number
  securityPostureImprovementPct: number
  safetyVerdict: 'SAFE_TO_APPLY' | 'REQUIRES_MANUAL_REVIEW' | 'BREAKING_CHANGE_RISK'
  verificationChecklist: string[]
}

export interface CodeAnalysisPayload {
  analysisId: string
  fileName: string
  originalCode: string
  detectedIssues: CodeIssueDiagnostic[]
  recommendedPatch: SelfHealingPatch
  overallHealthScoreBefore: number
  overallHealthScoreAfter: number
  analysisTimestamp: string
}

export type CodeSnippetPresetId =
  | 'N_PLUS_ONE_QUERY_LOOP'
  | 'SQL_INJECTION_CONCATENATION'
  | 'REACT_MEMORY_LEAK_INTERVAL'
  | 'EVENT_LOOP_SYNC_BLOCKING'

export type TargetRole =
  | 'SYSTEMS_ARCHITECT'
  | 'ALGORITHM_ENGINEER'
  | 'FULL_STACK_LEAD'
  | 'ML_DATA_ENGINEER'
  | 'GENERAL_SOFTWARE_ENGINEER'

export interface ResumeCandidateProfile {
  fullName: string
  headline: string
  email: string
  phone?: string
  location: string
  githubUrl: string
  linkedinUrl: string
  portfolioUrl?: string
  didIdentifier: string
}

export interface PlatformTelemetrySnapshot {
  duelRating?: {
    elo: number
    tier: string
    winRate: number
    matchesPlayed: number
    winStreak: number
  }
  bktMastery?: {
    totalSkillsMastered: number
    examReadinessScore: number
    readinessBand: string
    topMasteredConcepts: string[]
  }
  interviewSimulation?: {
    totalInterviews: number
    averageScore: number
    highestPercentile: number
    recommendedLevel: string
    strongestFactors: string[]
  }
  spacedRepetition?: {
    cardsMastered: number
    retentionRate: number
    streakDays: number
  }
  verifiableCredentialsCount?: number
}

export interface ResumeBulletPoint {
  id: string
  text: string
  quantifiedMetric: string
  category: 'IMPACT' | 'SYSTEMS' | 'ALGORITHMIC' | 'ARCHITECTURE' | 'LEADERSHIP'
  verifiedByPlatform: boolean
}

export interface ResumeProject {
  id: string
  title: string
  role: string
  technologies: string[]
  period: string
  bulletPoints: ResumeBulletPoint[]
  liveUrl?: string
  repoUrl?: string
  verifiedBadge?: string
}

export interface ResumeExperience {
  id: string
  company: string
  role: string
  location: string
  period: string
  bulletPoints: ResumeBulletPoint[]
}

export interface ResumeEducation {
  institution: string
  degree: string
  field: string
  graduationYear: string
  gpaOrHonors?: string
}

export interface ResumeCredentialItem {
  id: string
  title: string
  issuer: string
  issuerDid: string
  issuanceDate: string
  merkleRootHash: string
  credentialType: string
  verificationUrl: string
}

export interface ATSScoreBreakdown {
  overallScore: number // 0 - 100
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C'
  criteriaScores: {
    quantifiedMetricsScore: number // 0 - 25
    actionVerbsScore: number // 0 - 25
    keywordOptimizationScore: number // 0 - 25
    formattingComplianceScore: number // 0 - 25
  }
  actionableFeedback: string[]
  detectedKeywords: string[]
  missingKeywords: string[]
}

export interface VerifiableResumePayload {
  id: string
  userId: string
  targetRole: TargetRole
  roleTitle: string
  generatedAt: string
  profile: ResumeCandidateProfile
  summary: string
  skillsMatrix: {
    languages: string[]
    frameworks: string[]
    systemsAndCloud: string[]
    algorithmicCompetencies: string[]
  }
  verifiedPlatformHighlights: string[]
  experiences: ResumeExperience[]
  projects: ResumeProject[]
  education: ResumeEducation[]
  credentials: ResumeCredentialItem[]
  atsScoring: ATSScoreBreakdown
  cryptographicProof: {
    canonicalDigestSha256: string
    signatureHmac: string
    didAnchor: string
    verificationUrl: string
  }
  anchor?: {
    ipfsCid: string
    polygonTxHash: string
    blockNumber: number
    anchoredAt: string
    explorerUrl: string
  }
}

export interface ResumeAnchorResult {
  ipfsCid: string
  polygonTxHash: string
  blockNumber: number
  anchoredAt: string
  explorerUrl: string
}

export interface LinkedInImportResult {
  profile: Partial<ResumeCandidateProfile>
  importedSkills: string[]
  importedHighlights: string[]
}


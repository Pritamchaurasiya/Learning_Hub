export interface InstitutionBranding {
  primaryColor: string
  logoUrl: string
  portalTitle: string
}

export interface Institution {
  id: string
  name: string
  domain: string
  subdomain: string
  issuer: string
  clientId: string
  deploymentId: string
  authLoginUrl: string
  authTokensUrl: string
  keySetUrl: string
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED'
  branding: InstitutionBranding
  createdAt: string
  updatedAt: string
}

export interface LtiLaunchSession {
  sessionId: string
  institutionId: string
  institutionName: string
  userId: string
  email: string
  name: string
  roles: string[]
  isInstructor: boolean
  contextId: string
  contextTitle: string
  resourceLinkId: string
  resourceLinkTitle: string
  targetLinkUri: string
  lineItemUrl?: string
  launchTimestamp: number
  token: string
}

export interface GradePassbackResult {
  success: boolean
  transactionId: string
  lineItemUrl: string
  studentLtiUserId: string
  scoreGiven: number
  scoreMaximum: number
  normalizedScore: number
  proofDigest: string
  activityProgress: string
  gradingProgress: string
  timestamp: string
}

export interface InstitutionAnalytics {
  institutionId: string
  institutionName: string
  domain: string
  totalLearners: number
  totalInstructors: number
  totalLaunches: number
  totalAssessmentsCompleted: number
  averageScorePercent: number
  passRatePercent: number
  activeCohortsCount: number
  topExams: Array<{
    examId: string
    examTitle: string
    attempts: number
    avgScore: number
  }>
  recentPassbacks: GradePassbackResult[]
}

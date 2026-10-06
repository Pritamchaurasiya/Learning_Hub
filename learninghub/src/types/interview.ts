export type InterviewTrack =
  | 'ALGORITHM_CODING'
  | 'SYSTEM_DESIGN'
  | 'FULLSTACK_LIVE'
  | 'BEHAVIORAL_STAR'
  | 'QUANT_PROBLEM_SOLVING'

export type InterviewDifficulty = 'JUNIOR' | 'MID' | 'SENIOR' | 'STAFF' | 'PRINCIPAL'

export type InterviewPersona = 'ALEX_STAFF_ARCHITECT' | 'SOPHIA_ALGO_SPECIALIST'

export type TurnStage =
  | 'GREETING'
  | 'CLARIFICATION'
  | 'HIGH_LEVEL_DESIGN'
  | 'IMPLEMENTATION'
  | 'OPTIMIZATION_EDGE_CASES'
  | 'BEHAVIORAL_FOLLOWUP'
  | 'WRAPUP'
  | 'COMPLETED'

export interface InterviewMessage {
  id: string
  sender: 'interviewer' | 'candidate' | 'system'
  persona?: InterviewPersona
  text: string
  timestamp: string
  codeSnippet?: string
  suggestedAction?: 'ask_clarification' | 'sketch_approach' | 'write_code' | 'test_edge_cases' | 'submit_solution'
}

export interface ProgressiveHint {
  level: 1 | 2 | 3
  type: 'nudge' | 'structural_hint' | 'code_skeleton'
  text: string
  unlockedAt?: string
}

export interface RubricFactorScore {
  name: string
  factor: 'PROBLEM_SOLVING' | 'ALGORITHMIC_EFFICIENCY' | 'TECHNICAL_COMMUNICATION' | 'CODE_QUALITY' | 'SYSTEM_SCALABILITY'
  score: number
  weight: number
  feedback: string
  positiveSignals: string[]
  growthAreas: string[]
}

export interface InterviewEvaluationReport {
  sessionId: string
  overallScore: number
  percentileRanking: number
  hiringRecommendation: 'STRONG_HIRE' | 'HIRE' | 'LEANING_HIRE' | 'LEANING_NO_HIRE' | 'NO_HIRE'
  executiveSummary: string
  factorScores: RubricFactorScore[]
  starAnalysis?: {
    situation: string
    task: string
    action: string
    result: string
  }
  strengths: string[]
  weaknesses: string[]
  recommendedRevisionTopics: string[]
  curriculumModuleIds: string[]
  generatedAt: string
}

export interface InterviewQuestionItem {
  id: string
  title: string
  track: InterviewTrack
  difficulty: InterviewDifficulty
  targetRole: string
  companyStyle: 'GOOGLE' | 'META' | 'AMAZON' | 'UBER' | 'STRIPE' | 'CITADEL'
  problemStatement: string
  starterCode: {
    javascript: string
    python: string
    typescript: string
  }
  clarificationAnswers: Record<string, string>
  testCases: Array<{
    input: string
    expected: string
    explanation?: string
  }>
  hints: ProgressiveHint[]
}

export interface InterviewSession {
  id: string
  userId: string
  track: InterviewTrack
  difficulty: InterviewDifficulty
  persona: InterviewPersona
  question: InterviewQuestionItem
  currentStage: TurnStage
  transcript: InterviewMessage[]
  candidateCode: string
  whiteboardNotes: string
  activeLanguage: 'javascript' | 'python' | 'typescript'
  hintsRequested: number
  unlockedHints: ProgressiveHint[]
  startedAt: string
  completedAt?: string
  evaluation?: InterviewEvaluationReport
}

export interface InterviewTemplate {
  id: string
  title: string
  track: InterviewTrack
  difficulty: InterviewDifficulty
  targetRole: string
  companyStyle: string
  description: string
}

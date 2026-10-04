export type TargetExam =
  | 'JEE_ADVANCED'
  | 'GATE_CS'
  | 'SYSTEM_DESIGN_DSA'
  | 'SAT_DIGITAL'
  | 'FULL_STACK_DEV'

export type PacingMode = 'INTENSIVE' | 'BALANCED' | 'STEADY'

export interface ConceptItem {
  id: string
  name: string
  domain: string
  targetMastery: number
  estimatedMinutes: number
  formulaLatex?: string
  codeSnippet?: {
    language: string
    code: string
  }
  isCompleted: boolean
}

export interface ResourceLink {
  type: 'ebook' | 'visualizer' | 'flashcard' | 'test'
  title: string
  url: string
}

export interface CurriculumModule {
  id: string
  weekNumber: number
  title: string
  description: string
  domain: string
  concepts: ConceptItem[]
  recommendedPracticeSlugs: string[]
  resourceLinks: ResourceLink[]
  targetHours: number
  actualHoursSpent: number
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
}

export interface CurriculumPlan {
  id: string
  userId: string
  title: string
  targetExam: TargetExam
  targetDate: string
  weeksRemaining: number
  weeklyStudyHours: number
  pacingMode: PacingMode
  overallProgress: number
  estimatedReadinessScore: number
  bufferWeeks: number
  modules: CurriculumModule[]
  createdAt: string
  updatedAt: string
  recalibratedAt?: string
  notes?: string
}

export interface GenerateCurriculumInput {
  targetExam: TargetExam
  targetDate: string
  weeklyStudyHours: number
  diagnosticScorePercent?: number
}

export interface ExamMeta {
  key: TargetExam
  name: string
  badge: string
  description: string
  recommendedHours: number
  color: string
}

export const EXAM_REGISTRY: Record<TargetExam, ExamMeta> = {
  GATE_CS: {
    key: 'GATE_CS',
    name: 'GATE Computer Science & IT',
    badge: 'M.Tech / PSU Entrance',
    description: 'Algorithms, Operating Systems, Computer Networks, DBMS & Theory of Computation',
    recommendedHours: 15,
    color: '#6366F1', // indigo
  },
  SYSTEM_DESIGN_DSA: {
    key: 'SYSTEM_DESIGN_DSA',
    name: 'FAANG / Staff Engineer DSA & Systems',
    badge: 'Tech Career',
    description: 'High-yield LeetCode patterns, Dynamic Programming, and Scalable Distributed Systems',
    recommendedHours: 20,
    color: '#10B981', // emerald
  },
  JEE_ADVANCED: {
    key: 'JEE_ADVANCED',
    name: 'JEE Advanced Engineering',
    badge: 'IIT Entrance',
    description: 'Deep conceptual physics, rotational mechanics, calculus and advanced chemistry',
    recommendedHours: 25,
    color: '#F59E0B', // amber
  },
  SAT_DIGITAL: {
    key: 'SAT_DIGITAL',
    name: 'Digital SAT 1500+ Track',
    badge: 'Undergrad Admissions',
    description: 'Advanced algebra, coordinate geometry, data analysis & critical reading inference',
    recommendedHours: 10,
    color: '#EC4899', // pink
  },
  FULL_STACK_DEV: {
    key: 'FULL_STACK_DEV',
    name: 'Modern Full-Stack & Cloud Architecture',
    badge: 'Software Engineering',
    description: 'React Fiber, Node/Express, PostgreSQL optimization, Docker & AWS Deployment',
    recommendedHours: 15,
    color: '#06B6D4', // cyan
  },
}

import { cacheService } from './CacheService'
import logger from '../utils/logger'

export interface CurriculumTopic {
  id: string
  title: string
  subject: string
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  estimatedHours: number
  keyConcepts: string[]
  formulaLatex?: string
  practiceQuestionCount: number
}

export interface WeeklyModule {
  weekNumber: number
  theme: string
  phase: 'FOUNDATION' | 'CORE' | 'ADVANCED_SYNTHESIS' | 'MOCK_REINFORCEMENT'
  targetHours: number
  topics: CurriculumTopic[]
  checkpointTest: {
    title: string
    questionCount: number
    passingScorePercent: number
    durationMinutes: number
  }
  isCompleted: boolean
  completedAt?: string
}

export interface Milestone {
  week: number
  title: string
  targetReadinessPercent: number
  description: string
}

export interface SynthesizedCurriculum {
  id: string
  userId: string
  examTarget: string
  examTitle: string
  targetHorizonWeeks: number
  weeklyHours: number
  totalAllocatedHours: number
  bufferWeeks: number
  status: 'ACTIVE' | 'ARCHIVED' | 'PAUSED'
  pacingStatus: 'ON_TRACK' | 'BEHIND_PACING' | 'AHEAD_OF_SCHEDULE'
  currentWeek: number
  completedModulesCount: number
  totalModulesCount: number
  progressPercent: number
  createdAt: string
  updatedAt: string
  modules: WeeklyModule[]
  milestones: Milestone[]
}

export interface SynthesizeParams {
  examTarget: string
  targetHorizonWeeks?: number
  weeklyHours?: number
  diagnosticScore?: number
  weakAreas?: string[]
}

// Built-in Exam Syllabus Blueprints
const EXAM_BLUEPRINTS: Record<
  string,
  {
    title: string
    subjects: Array<{
      name: string
      topics: Array<{
        title: string
        difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
        hours: number
        keyConcepts: string[]
        formulaLatex?: string
      }>
    }>
  }
> = {
  GATE_CS: {
    title: 'GATE Computer Science & Information Technology',
    subjects: [
      {
        name: 'Algorithms & Data Structures',
        topics: [
          {
            title: 'Asymptotic Complexity & Master Theorem',
            difficulty: 'BEGINNER',
            hours: 6,
            keyConcepts: ['Big-O, Omega, Theta', 'Recurrence Relations', 'Akra-Bazzi Intuition'],
            formulaLatex: 'T(n) = aT(n/b) + f(n) \\implies T(n) = \\Theta(n^{\\log_b a})',
          },
          {
            title: 'Divide & Conquer and Sorting Invariants',
            difficulty: 'INTERMEDIATE',
            hours: 8,
            keyConcepts: ['Merge Sort', 'Quick Sort Partitioning', 'Comparison Lower Bounds'],
            formulaLatex: '\\Omega(N \\log N) \\text{ Lower Bound for Comparison Sorts}',
          },
          {
            title: 'Dynamic Programming & DAG Shortest Paths',
            difficulty: 'ADVANCED',
            hours: 12,
            keyConcepts: ['Optimal Substructure', 'Overlapping Subproblems', 'State Compression'],
            formulaLatex: 'DP[i][w] = \\max(DP[i-1][w], DP[i-1][w-w_i] + v_i)',
          },
          {
            title: 'Graph Theory & Disjoint Sets',
            difficulty: 'ADVANCED',
            hours: 10,
            keyConcepts: ['Tarjan SCC', 'Dijkstra', 'Union-Find with Path Compression'],
            formulaLatex: 'O((V + E) \\log V) \\text{ via Fibonacci / Binary Heap}',
          },
        ],
      },
      {
        name: 'Operating Systems & Concurrency',
        topics: [
          {
            title: 'Process Synchronization & Semaphores',
            difficulty: 'INTERMEDIATE',
            hours: 8,
            keyConcepts: ['Peterson Solution', 'Counting Semaphores', 'Deadlock Coffman Conditions'],
            formulaLatex: '\\text{Banker\'s Algorithm: } \\text{Need} = \\text{Max} - \\text{Allocation}',
          },
          {
            title: 'Virtual Memory & Page Replacement',
            difficulty: 'ADVANCED',
            hours: 9,
            keyConcepts: ['Multi-level Paging', 'TLB Hit Ratio', 'LRU vs Clock Algorithm'],
            formulaLatex: '\\text{EAT} = h \\cdot (t + m) + (1-h) \\cdot (t + 2m)',
          },
        ],
      },
      {
        name: 'Theory of Computation',
        topics: [
          {
            title: 'Regular Languages & Myhill-Nerode',
            difficulty: 'INTERMEDIATE',
            hours: 8,
            keyConcepts: ['DFA/NFA Equivalence', 'Pumping Lemma', 'State Minimization'],
            formulaLatex: 'L \\text{ regular} \\iff \\text{finite equivalence classes in } R_L',
          },
          {
            title: 'Context-Free Languages & Turing Decidability',
            difficulty: 'ADVANCED',
            hours: 10,
            keyConcepts: ['Pushdown Automata', 'Post Correspondence Problem', 'Rice\'s Theorem'],
            formulaLatex: 'A_{TM} = \\{ \\langle M, w \\rangle \\mid M \\text{ accepts } w \\} \\text{ is undecidable}',
          },
        ],
      },
    ],
  },
  JEE_ADVANCED: {
    title: 'JEE Advanced (Physics, Chemistry & Mathematics)',
    subjects: [
      {
        name: 'Physics',
        topics: [
          {
            title: 'Rotational Dynamics & Rigid Body Mechanics',
            difficulty: 'ADVANCED',
            hours: 14,
            keyConcepts: ['Moment of Inertia Tensor', 'Rolling Without Slipping', 'Angular Momentum Conservation'],
            formulaLatex: '\\tau_{\\text{ext}} = \\frac{d\\vec{L}}{dt}, \\quad E_k = \\frac{1}{2}mv_{cm}^2 + \\frac{1}{2}I_{cm}\\omega^2',
          },
          {
            title: 'Electromagnetic Induction & Maxwell Equations',
            difficulty: 'ADVANCED',
            hours: 12,
            keyConcepts: ['Faraday\'s Law', 'Lenz Law', 'Displacement Current', 'Self-Inductance'],
            formulaLatex: '\\mathcal{E} = -\\frac{d\\Phi_B}{dt} = -L \\frac{di}{dt}',
          },
        ],
      },
      {
        name: 'Mathematics',
        topics: [
          {
            title: 'Differential Calculus & Mean Value Theorems',
            difficulty: 'INTERMEDIATE',
            hours: 10,
            keyConcepts: ['Rolle\'s Theorem', 'Lagrange MVT', 'L\'Hopital Limits', 'Monotonicity'],
            formulaLatex: 'f\'(c) = \\frac{f(b) - f(a)}{b - a}, \\quad c \\in (a, b)',
          },
          {
            title: 'Integral Calculus & Definite Integrals',
            difficulty: 'ADVANCED',
            hours: 14,
            keyConcepts: ['King\'s Property', 'Leibniz Integral Rule', 'Areas Under Curves'],
            formulaLatex: '\\int_a^b f(x)dx = \\int_a^b f(a + b - x)dx',
          },
        ],
      },
    ],
  },
  AWS_SOLUTIONS_ARCHITECT: {
    title: 'AWS Certified Solutions Architect (Associate / Professional)',
    subjects: [
      {
        name: 'Resilient Cloud Architectures',
        topics: [
          {
            title: 'High Availability Multi-AZ Design',
            difficulty: 'BEGINNER',
            hours: 6,
            keyConcepts: ['VPC Subnets', 'Application Load Balancer', 'Auto Scaling Groups'],
            formulaLatex: '\\text{Availability} = 1 - (1 - A_1)(1 - A_2)',
          },
          {
            title: 'Event-Driven Decoupling & Queueing',
            difficulty: 'INTERMEDIATE',
            hours: 8,
            keyConcepts: ['SQS FIFO & Standard', 'SNS Fan-out Pattern', 'EventBridge Routing'],
            formulaLatex: '\\text{Visibility Timeout} \\ge 6 \\times \\text{Lambda Function Timeout}',
          },
          {
            title: 'Disaster Recovery Strategies',
            difficulty: 'ADVANCED',
            hours: 8,
            keyConcepts: ['Backup & Restore', 'Pilot Light', 'Warm Standby', 'Multi-Region Active-Active'],
            formulaLatex: '\\text{RTO} \\text{ (Recovery Time)}, \\quad \\text{RPO} \\text{ (Recovery Point)}',
          },
        ],
      },
    ],
  },
  SAT_GENERAL: {
    title: 'SAT Digital Diagnostic Roadmap',
    subjects: [
      {
        name: 'Math Section',
        topics: [
          {
            title: 'Heart of Algebra & Linear Systems',
            difficulty: 'BEGINNER',
            hours: 6,
            keyConcepts: ['Linear Equations', 'System of Inequalities', 'Slope-Intercept'],
            formulaLatex: 'y - y_1 = m(x - x_1), \\quad m = \\frac{y_2 - y_1}{x_2 - x_1}',
          },
          {
            title: 'Passport to Advanced Math & Quadratics',
            difficulty: 'INTERMEDIATE',
            hours: 8,
            keyConcepts: ['Quadratic Formula', 'Parabola Vertex Form', 'Polynomial Division'],
            formulaLatex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}, \\quad x_v = -\\frac{b}{2a}',
          },
        ],
      },
    ],
  },
}

export class CurriculumService {
  /**
   * Synthesizes an optimized, multi-week modular study curriculum based on diagnostic profile.
   */
  async synthesizeCurriculum(
    userId: string,
    params: SynthesizeParams
  ): Promise<SynthesizedCurriculum> {
    const examKey = (params.examTarget || 'GATE_CS').toUpperCase()
    const blueprint = EXAM_BLUEPRINTS[examKey] || EXAM_BLUEPRINTS.GATE_CS

    const horizonWeeks = Math.max(4, Math.min(52, params.targetHorizonWeeks ?? 12))
    const weeklyHours = Math.max(5, Math.min(60, params.weeklyHours ?? 15))
    const totalAllocatedHours = horizonWeeks * weeklyHours

    // Reserve 1-2 buffer weeks at the end for full-length mocks & weak area consolidation
    const bufferWeeks = horizonWeeks >= 10 ? 2 : 1
    const instructionWeeks = horizonWeeks - bufferWeeks

    // Flatten all blueprint topics
    const allTopics: Array<CurriculumTopic & { subject: string }> = []
    let topicCounter = 1

    for (const sub of blueprint.subjects) {
      for (const t of sub.topics) {
        allTopics.push({
          id: `topic-${examKey.toLowerCase()}-${topicCounter++}`,
          title: t.title,
          subject: sub.name,
          difficulty: t.difficulty,
          estimatedHours: t.hours,
          keyConcepts: t.keyConcepts,
          formulaLatex: t.formulaLatex,
          practiceQuestionCount: t.difficulty === 'ADVANCED' ? 25 : t.difficulty === 'INTERMEDIATE' ? 18 : 12,
        })
      }
    }

    // Boost priority of weak areas if provided
    if (params.weakAreas && params.weakAreas.length > 0) {
      const lowerWeak = params.weakAreas.map(w => w.toLowerCase())
      allTopics.sort((a, b) => {
        const aWeak = lowerWeak.some(w => a.title.toLowerCase().includes(w) || a.subject.toLowerCase().includes(w))
        const bWeak = lowerWeak.some(w => b.title.toLowerCase().includes(w) || b.subject.toLowerCase().includes(w))
        if (aWeak && !bWeak) return -1
        if (!aWeak && bWeak) return 1
        return 0
      })
    }

    // Distribute topics into weekly modules
    const modules: WeeklyModule[] = []
    const topicsPerWeek = Math.max(1, Math.ceil(allTopics.length / instructionWeeks))

    for (let w = 1; w <= horizonWeeks; w++) {
      if (w <= instructionWeeks) {
        const startIndex = (w - 1) * topicsPerWeek
        const weekTopics = allTopics.slice(startIndex, startIndex + topicsPerWeek)

        let phase: WeeklyModule['phase'] = 'CORE'
        if (w <= Math.ceil(instructionWeeks * 0.3)) {
          phase = 'FOUNDATION'
        } else if (w >= Math.floor(instructionWeeks * 0.75)) {
          phase = 'ADVANCED_SYNTHESIS'
        }

        const actualTopics = weekTopics.length > 0 ? weekTopics : [allTopics[allTopics.length - 1]]

        modules.push({
          weekNumber: w,
          theme: `Week ${w}: ${actualTopics.map(t => t.title).join(' & ')}`,
          phase,
          targetHours: weeklyHours,
          topics: actualTopics,
          checkpointTest: {
            title: `Week ${w} Diagnostic Mastery Sprint`,
            questionCount: actualTopics.reduce((acc, t) => acc + t.practiceQuestionCount, 0),
            passingScorePercent: 75,
            durationMinutes: 45,
          },
          isCompleted: false,
        })
      } else {
        // Buffer / Full-Length Mock Weeks
        modules.push({
          weekNumber: w,
          theme: `Week ${w}: Comprehensive Exam Simulation & Weak-Area Drilldown`,
          phase: 'MOCK_REINFORCEMENT',
          targetHours: weeklyHours,
          topics: [
            {
              id: `topic-${examKey.toLowerCase()}-final-${w}`,
              title: `High-Yield Grand Integration ${w - instructionWeeks}`,
              subject: 'All Subjects Combined',
              difficulty: 'ADVANCED',
              estimatedHours: weeklyHours,
              keyConcepts: ['Full-Length Simulated Timing', 'Error Log Categorization', 'Exam Strategy'],
              practiceQuestionCount: 50,
            },
          ],
          checkpointTest: {
            title: `Simulated Grand National Mock Exam #${w - instructionWeeks}`,
            questionCount: 65,
            passingScorePercent: 80,
            durationMinutes: 180,
          },
          isCompleted: false,
        })
      }
    }

    // Milestones definition
    const milestones: Milestone[] = [
      {
        week: Math.max(1, Math.floor(instructionWeeks * 0.3)),
        title: 'Foundations Clearance Benchmark',
        targetReadinessPercent: 40,
        description: 'Complete all base theorems and primary formula identities.',
      },
      {
        week: Math.max(2, Math.floor(instructionWeeks * 0.7)),
        title: 'Core Conceptual Invariants Benchmark',
        targetReadinessPercent: 70,
        description: 'Solve multi-step integrated problems with speed and precision.',
      },
      {
        week: instructionWeeks,
        title: 'Syllabus Mastery Completion',
        targetReadinessPercent: 85,
        description: '100% syllabus topic coverage across all exam domains.',
      },
      {
        week: horizonWeeks,
        title: 'Final Competitive Readiness Exam',
        targetReadinessPercent: 92,
        description: 'Peak exam readiness, minimal careless slips, calibrated pacing.',
      },
    ]

    const curriculum: SynthesizedCurriculum = {
      id: `curr-${userId.slice(0, 8)}-${Date.now()}`,
      userId,
      examTarget: examKey,
      examTitle: blueprint.title,
      targetHorizonWeeks: horizonWeeks,
      weeklyHours,
      totalAllocatedHours,
      bufferWeeks,
      status: 'ACTIVE',
      pacingStatus: 'ON_TRACK',
      currentWeek: 1,
      completedModulesCount: 0,
      totalModulesCount: modules.length,
      progressPercent: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      modules,
      milestones,
    }

    // Persist in cache for fast response times
    const cacheKey = cacheService.curriculumKey(userId)
    await cacheService.set(cacheKey, curriculum, 86400 * 7) // 7 days TTL

    logger.info(`[CurriculumService] Synthesized curriculum for user=${userId}, exam=${examKey}, weeks=${horizonWeeks}`)
    return curriculum
  }

  /**
   * Retrieves user's active personalized curriculum.
   */
  async getActiveCurriculum(userId: string): Promise<SynthesizedCurriculum> {
    const cacheKey = cacheService.curriculumKey(userId)
    const cached = await cacheService.get<SynthesizedCurriculum>(cacheKey)

    if (cached) {
      return cached
    }

    // Fallback: Synthesize a default GATE CS / Software Systems track
    return this.synthesizeCurriculum(userId, { examTarget: 'GATE_CS', targetHorizonWeeks: 12, weeklyHours: 15 })
  }

  /**
   * Updates completion status of a weekly curriculum module.
   */
  async updateModuleProgress(
    userId: string,
    weekNumber: number,
    completed: boolean
  ): Promise<SynthesizedCurriculum> {
    const curriculum = await this.getActiveCurriculum(userId)

    const targetModule = curriculum.modules.find(m => m.weekNumber === weekNumber)
    if (targetModule) {
      targetModule.isCompleted = completed
      if (completed) {
        targetModule.completedAt = new Date().toISOString()
      } else {
        delete targetModule.completedAt
      }
    }

    // Recalculate metrics
    curriculum.completedModulesCount = curriculum.modules.filter(m => m.isCompleted).length
    curriculum.progressPercent = Math.round(
      (curriculum.completedModulesCount / curriculum.totalModulesCount) * 100
    )

    // Dynamic pacing calculation
    const elapsedWeeks = curriculum.currentWeek
    const expectedCompleted = elapsedWeeks
    if (curriculum.completedModulesCount >= expectedCompleted) {
      curriculum.pacingStatus = 'ON_TRACK'
    } else if (curriculum.completedModulesCount >= expectedCompleted - 1) {
      curriculum.pacingStatus = 'ON_TRACK'
    } else {
      curriculum.pacingStatus = 'BEHIND_PACING'
    }

    curriculum.updatedAt = new Date().toISOString()

    const cacheKey = cacheService.curriculumKey(userId)
    await cacheService.set(cacheKey, curriculum, 86400 * 7)

    return curriculum
  }

  /**
   * Returns list of pre-configured curriculum blueprints.
   */
  getTemplates() {
    return Object.entries(EXAM_BLUEPRINTS).map(([key, bp]) => ({
      key,
      title: bp.title,
      subjectCount: bp.subjects.length,
      totalTopicCount: bp.subjects.reduce((acc, s) => acc + s.topics.length, 0),
      subjects: bp.subjects.map(s => ({
        name: s.name,
        topicCount: s.topics.length,
      })),
    }))
  }
}

export const curriculumService = new CurriculumService()

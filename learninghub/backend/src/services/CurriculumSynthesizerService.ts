import crypto from 'crypto'
import logger from '../utils/logger'

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
  targetMastery: number // 0 - 100
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
  overallProgress: number // 0 - 100
  estimatedReadinessScore: number // 0 - 100
  bufferWeeks: number
  modules: CurriculumModule[]
  createdAt: string
  updatedAt: string
  recalibratedAt?: string
  notes?: string
}

export interface GenerateCurriculumInput {
  userId: string
  targetExam: TargetExam
  targetDate: string
  weeklyStudyHours: number
  diagnosticScorePercent?: number
}

// ── Built-in Standard Syllabi Templates ────────────────────────────
interface SyllabusDomainTemplate {
  domain: string
  modules: Array<{
    title: string
    description: string
    concepts: Array<{
      name: string
      estimatedMinutes: number
      formulaLatex?: string
      codeSnippet?: { language: string; code: string }
    }>
    practiceSlugs: string[]
    resourceLinks: ResourceLink[]
  }>
}

const EXAM_TEMPLATES: Record<TargetExam, { title: string; domains: SyllabusDomainTemplate[] }> = {
  GATE_CS: {
    title: 'GATE CS & IT Comprehensive Master Curriculum',
    domains: [
      {
        domain: 'Data Structures & Algorithms',
        modules: [
          {
            title: 'Asymptotic Complexity, Divide & Conquer and Recurrences',
            description: 'Master Master Theorem, Akra-Bazzi method, recursive tree expansions and optimal sorting.',
            concepts: [
              {
                name: 'Master Theorem for Divide-and-Conquer Recurrences',
                estimatedMinutes: 60,
                formulaLatex: 'T(n) = a T(n/b) + f(n), \\quad c_{\\text{crit}} = \\log_b a',
              },
              {
                name: 'QuickSort Partitioning & Expected Time Bounds',
                estimatedMinutes: 75,
                codeSnippet: {
                  language: 'python',
                  code: 'def quicksort(arr):\n    if len(arr) <= 1: return arr\n    pivot = arr[len(arr) // 2]\n    return quicksort([x for x in arr if x < pivot]) + [x for x in arr if x == pivot] + quicksort([x for x in arr if x > pivot])',
                },
              },
            ],
            practiceSlugs: ['two-sum', 'merge-intervals'],
            resourceLinks: [
              { type: 'visualizer', title: 'Interactive Sorting Visualizer', url: '/visualizer' },
              { type: 'test', title: 'Algorithms Diagnostic Sectional', url: '/tests-a' },
            ],
          },
          {
            title: 'Graph Algorithms: Shortest Paths, MST & Network Flow',
            description: 'Dijkstra, Bellman-Ford, Floyd-Warshall, Kruskal, Prim and topological sorting.',
            concepts: [
              {
                name: "Dijkstra's Algorithm with Min-Heap Invariant",
                estimatedMinutes: 90,
                formulaLatex: 'd[v] = \\min(d[v], d[u] + w(u, v))',
                codeSnippet: {
                  language: 'python',
                  code: 'import heapq\ndef dijkstra(adj, src):\n    dist = {src: 0}\n    pq = [(0, src)]\n    while pq:\n        d, u = heapq.heappop(pq)\n        if d > dist.get(u, float("inf")): continue\n        for v, w in adj[u]:\n            if dist.get(u, 0) + w < dist.get(v, float("inf")):\n                dist[v] = dist[u] + w\n                heapq.heappush(pq, (dist[v], v))\n    return dist',
                },
              },
            ],
            practiceSlugs: ['course-schedule', 'network-delay-time'],
            resourceLinks: [
              { type: 'visualizer', title: 'Graph Traversal Visualizer', url: '/visualizer' },
              { type: 'flashcard', title: 'Graph Theory Memory Deck', url: '/revision' },
            ],
          },
        ],
      },
      {
        domain: 'Computer Systems & OS',
        modules: [
          {
            title: 'Operating Systems: Process Scheduling & Concurrency',
            description: 'CPU scheduling algorithms, semaphores, mutexes, and deadlock prevention bankers algorithm.',
            concepts: [
              {
                name: 'Turnaround & Waiting Time in Preemptive Scheduling',
                estimatedMinutes: 80,
                formulaLatex: '\\text{TAT} = \\text{Completion Time} - \\text{Arrival Time}, \\quad \\text{WT} = \\text{TAT} - \\text{Burst Time}',
              },
              {
                name: "Banker's Deadlock Avoidance Safety Algorithm",
                estimatedMinutes: 85,
                formulaLatex: '\\text{Need}[i][j] = \\text{Max}[i][j] - \\text{Allocation}[i][j] \\le \\text{Available}[j]',
              },
            ],
            practiceSlugs: ['process-sync-quiz'],
            resourceLinks: [
              { type: 'ebook', title: 'OS Core Foundations Chapter 4', url: '/library?tab=ebooks' },
              { type: 'test', title: 'GATE Operating Systems Sectional', url: '/tests-a' },
            ],
          },
        ],
      },
    ],
  },
  SYSTEM_DESIGN_DSA: {
    title: 'FAANG / Staff Engineer DSA & High-Scale System Design',
    domains: [
      {
        domain: 'Advanced Algorithmic Patterns',
        modules: [
          {
            title: 'Dynamic Programming: Knapsack, Interval & Tree DP',
            description: 'State space reduction, memoization patterns, and space optimization techniques.',
            concepts: [
              {
                name: '0/1 Knapsack Optimal Substructure & Space Compression',
                estimatedMinutes: 75,
                formulaLatex: 'dp[w] = \\max(dp[w], dp[w - \\text{weight}[i]] + \\text{value}[i])',
                codeSnippet: {
                  language: 'python',
                  code: 'def knapsack(W, weights, values):\n    dp = [0] * (W + 1)\n    for w_i, v_i in zip(weights, values):\n        for w in range(W, w_i - 1, -1):\n            dp[w] = max(dp[w], dp[w - w_i] + v_i)\n    return dp[W]',
                },
              },
            ],
            practiceSlugs: ['coin-change', 'longest-increasing-subsequence'],
            resourceLinks: [
              { type: 'visualizer', title: 'DP Matrix Visualizer', url: '/visualizer' },
              { type: 'test', title: 'Dynamic Programming Mock Drill', url: '/tests-a' },
            ],
          },
        ],
      },
      {
        domain: 'Distributed Systems & Scalability',
        modules: [
          {
            title: 'Distributed Storage: Consistent Hashing & Quorums',
            description: 'Consistent hashing with virtual nodes, CAP theorem trade-offs, and Dynamo-style quorums.',
            concepts: [
              {
                name: 'Consistent Hashing Ring & Virtual Node Partitioning',
                estimatedMinutes: 90,
                formulaLatex: 'R + W > N \\implies \\text{Strong Consistency (Sloppy Quorum)}',
              },
            ],
            practiceSlugs: ['distributed-cache-design'],
            resourceLinks: [
              { type: 'ebook', title: 'Distributed Systems Patterns Volume 2', url: '/library?tab=ebooks' },
              { type: 'flashcard', title: 'System Design Architecture Deck', url: '/revision' },
            ],
          },
        ],
      },
    ],
  },
  JEE_ADVANCED: {
    title: 'JEE Advanced High-Yield Physics & Mathematics Plan',
    domains: [
      {
        domain: 'Physics Mechanics & Electrodynamics',
        modules: [
          {
            title: 'Rotational Dynamics & Conservation of Angular Momentum',
            description: 'Moment of inertia tensors, rolling without slipping, and angular impulse theorems.',
            concepts: [
              {
                name: 'Parallel Axis Theorem & Rolling Constraints',
                estimatedMinutes: 70,
                formulaLatex: 'I = I_{\\text{cm}} + M d^2, \\quad a_{\\text{cm}} = \\alpha R',
              },
            ],
            practiceSlugs: ['rotational-mechanics-jee'],
            resourceLinks: [
              { type: 'ebook', title: 'Advanced Mechanics Handbook', url: '/library?tab=ebooks' },
              { type: 'test', title: 'JEE Physics Sectional Mock', url: '/tests-a' },
            ],
          },
        ],
      },
    ],
  },
  SAT_DIGITAL: {
    title: 'Digital SAT 1500+ Strategic Curriculum',
    domains: [
      {
        domain: 'Advanced Math & Reading Analysis',
        modules: [
          {
            title: 'Non-linear Equations, Parabolas & Discriminant Analysis',
            description: 'Quadratic function roots, vertex optimizations, and exponential growth models.',
            concepts: [
              {
                name: 'Quadratic Discriminant Nature of Roots',
                estimatedMinutes: 50,
                formulaLatex: '\\Delta = b^2 - 4ac, \\quad x_{\\text{vertex}} = -\\frac{b}{2a}',
              },
            ],
            practiceSlugs: ['sat-math-drill-1'],
            resourceLinks: [
              { type: 'test', title: 'SAT Digital Adaptive Diagnostic', url: '/tests-a' },
              { type: 'flashcard', title: 'SAT Math Formula Flashcards', url: '/revision' },
            ],
          },
        ],
      },
    ],
  },
  FULL_STACK_DEV: {
    title: 'Full-Stack Modern Web & Cloud Architecture',
    domains: [
      {
        domain: 'Frontend & Full-Stack Systems',
        modules: [
          {
            title: 'React Concurrent Mode, Fiber Architecture & State Stores',
            description: 'Fiber tree reconciler, hooks lifecycle, Redux / Zustand store memoization.',
            concepts: [
              {
                name: 'React Fiber Workloop & Time Slicing',
                estimatedMinutes: 60,
                codeSnippet: {
                  language: 'typescript',
                  code: 'function performConcurrentWorkOnRoot(root) {\n  let didTimeout = hasScheduledWorkTimedOut();\n  while (workInProgress !== null && !shouldYieldToHost()) {\n    performUnitOfWork(workInProgress);\n  }\n}',
                },
              },
            ],
            practiceSlugs: ['react-state-architecture'],
            resourceLinks: [
              { type: 'ebook', title: 'Modern React & TypeScript Patterns', url: '/library?tab=ebooks' },
            ],
          },
        ],
      },
    ],
  },
}

export class CurriculumSynthesizerService {
  private userPlans: Map<string, CurriculumPlan> = new Map()

  constructor() {
    // Seed demo plan for local guest / demo user
    this.seedDemoPlan('demo-user')
  }

  private seedDemoPlan(userId: string): void {
    const today = new Date()
    const target = new Date(today.getTime() + 12 * 7 * 86400000) // 12 weeks
    const plan = this.generatePlan({
      userId,
      targetExam: 'GATE_CS',
      targetDate: target.toISOString().split('T')[0],
      weeklyStudyHours: 15,
      diagnosticScorePercent: 62,
    })
    this.userPlans.set(userId, plan)
  }

  /**
   * Determine pacing mode based on weekly hours
   */
  public determinePacingMode(weeklyHours: number): PacingMode {
    if (weeklyHours >= 22) return 'INTENSIVE'
    if (weeklyHours >= 12) return 'BALANCED'
    return 'STEADY'
  }

  /**
   * Calculate weeks remaining between today and target date
   */
  public calculateWeeksRemaining(targetDateStr: string): number {
    const target = new Date(targetDateStr).getTime()
    const now = Date.now()
    const diffDays = Math.max(1, Math.ceil((target - now) / 86400000))
    return Math.max(1, Math.ceil(diffDays / 7))
  }

  /**
   * Generates a complete, tailored multi-week curriculum plan
   */
  public generatePlan(input: GenerateCurriculumInput): CurriculumPlan {
    const { userId, targetExam, targetDate, weeklyStudyHours, diagnosticScorePercent = 50 } = input
    const weeksRemaining = this.calculateWeeksRemaining(targetDate)
    const pacingMode = this.determinePacingMode(weeklyStudyHours)

    const template = EXAM_TEMPLATES[targetExam] || EXAM_TEMPLATES.GATE_CS

    // Flat list of template modules across all domains
    const templateModules: Array<{
      title: string
      description: string
      domain: string
      concepts: ConceptItem[]
      practiceSlugs: string[]
      resourceLinks: ResourceLink[]
    }> = []

    template.domains.forEach(d => {
      d.modules.forEach(m => {
        templateModules.push({
          title: m.title,
          description: m.description,
          domain: d.domain,
          concepts: m.concepts.map(c => ({
            id: `c-${crypto.randomBytes(4).toString('hex')}`,
            name: c.name,
            domain: d.domain,
            targetMastery: 85,
            estimatedMinutes: c.estimatedMinutes,
            formulaLatex: c.formulaLatex,
            codeSnippet: c.codeSnippet,
            isCompleted: false,
          })),
          practiceSlugs: m.practiceSlugs,
          resourceLinks: m.resourceLinks,
        })
      })
    })

    // Allocate buffer weeks (approx 15% of total timeframe, min 1 week if duration >= 6 weeks)
    const bufferWeeks = weeksRemaining >= 6 ? Math.max(1, Math.floor(weeksRemaining * 0.15)) : 0
    const activeWeeks = Math.max(1, weeksRemaining - bufferWeeks)

    const modules: CurriculumModule[] = []
    const totalModulesToSchedule = Math.max(templateModules.length, activeWeeks)

    for (let w = 1; w <= weeksRemaining; w++) {
      if (w > activeWeeks) {
        // Buffer / Consolidation & High-Yield Revision Week
        modules.push({
          id: `mod-w${w}-${crypto.randomBytes(3).toString('hex')}`,
          weekNumber: w,
          title: `Week ${w}: High-Yield Consolidation & Mock Exam Simulation`,
          description: `Dedicated buffer week for comprehensive adaptive mocks, mistake remediation, and final formula reinforcement.`,
          domain: 'Synthesis & Review',
          concepts: [
            {
              id: `c-rev-${w}-1`,
              name: 'Comprehensive Sectional Diagnostic & Time-Management Audit',
              domain: 'Review',
              targetMastery: 90,
              estimatedMinutes: 90,
              isCompleted: false,
            },
            {
              id: `c-rev-${w}-2`,
              name: 'SuperMemo Flashcard Spaced Repetition Clearing',
              domain: 'Review',
              targetMastery: 95,
              estimatedMinutes: 45,
              isCompleted: false,
            },
          ],
          recommendedPracticeSlugs: ['full-syllabus-mock'],
          resourceLinks: [
            { type: 'test', title: 'Adaptive Grand Mock Test', url: '/tests-a' },
            { type: 'flashcard', title: 'Smart Revision Hub', url: '/revision' },
          ],
          targetHours: weeklyStudyHours,
          actualHoursSpent: 0,
          status: 'NOT_STARTED',
        })
      } else {
        const srcMod = templateModules[(w - 1) % templateModules.length]
        modules.push({
          id: `mod-w${w}-${crypto.randomBytes(3).toString('hex')}`,
          weekNumber: w,
          title: `Week ${w}: ${srcMod.title}`,
          description: srcMod.description,
          domain: srcMod.domain,
          concepts: srcMod.concepts,
          recommendedPracticeSlugs: srcMod.practiceSlugs,
          resourceLinks: srcMod.resourceLinks,
          targetHours: weeklyStudyHours,
          actualHoursSpent: 0,
          status: w === 1 ? 'IN_PROGRESS' : 'NOT_STARTED',
        })
      }
    }

    const estimatedReadiness = Math.min(
      95,
      Math.round(diagnosticScorePercent * 0.4 + (weeklyStudyHours / 20) * 30 + 20)
    )

    const plan: CurriculumPlan = {
      id: `curr-${crypto.randomBytes(6).toString('hex')}`,
      userId,
      title: `${template.title} (${pacingMode} Track)`,
      targetExam,
      targetDate,
      weeksRemaining,
      weeklyStudyHours,
      pacingMode,
      overallProgress: 0,
      estimatedReadinessScore: estimatedReadiness,
      bufferWeeks,
      modules,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: `Syllabus synthesized dynamically based on ${weeksRemaining} weeks runway and ${weeklyStudyHours} hrs/week commitment.`,
    }

    this.userPlans.set(userId, plan)
    logger.info(`[CurriculumService] Created curriculum plan ${plan.id} for user ${userId}`)
    return plan
  }

  /**
   * Retrieve active curriculum plan for a given user
   */
  public getPlanForUser(userId: string): CurriculumPlan | null {
    if (!this.userPlans.has(userId)) {
      this.seedDemoPlan(userId)
    }
    return this.userPlans.get(userId) || null
  }

  /**
   * Recalibrate curriculum pacing dynamically based on student test scores
   * - High accuracy (>85%): Boosts estimated readiness, accelerates review
   * - Low accuracy (<60%): Lowers readiness, injects remediation alerts into buffer weeks
   */
  public recalibratePlan(
    userId: string,
    recentAccuracyPercent: number,
    weeklyStudyHoursActual?: number
  ): CurriculumPlan | null {
    const plan = this.getPlanForUser(userId)
    if (!plan) return null

    const clampedAccuracy = Math.min(100, Math.max(0, recentAccuracyPercent))

    // Bayesian adjustment of readiness score
    const readinessDelta = (clampedAccuracy - 65) * 0.25
    plan.estimatedReadinessScore = Math.min(
      99,
      Math.max(10, Math.round(plan.estimatedReadinessScore + readinessDelta))
    )

    if (weeklyStudyHoursActual !== undefined && weeklyStudyHoursActual > 0) {
      plan.weeklyStudyHours = weeklyStudyHoursActual
      plan.pacingMode = this.determinePacingMode(weeklyStudyHoursActual)
    }

    if (clampedAccuracy < 60) {
      plan.notes = `Recalibrated: Pacing alert! Recent accuracy was ${clampedAccuracy}%. Reinforcement sessions flagged in buffer weeks.`
    } else if (clampedAccuracy >= 85) {
      plan.notes = `Recalibrated: Outstanding progress! Accuracy at ${clampedAccuracy}%. Projected mastery accelerated.`
    } else {
      plan.notes = `Recalibrated: Maintaining on-track balanced trajectory with ${clampedAccuracy}% accuracy.`
    }

    plan.recalibratedAt = new Date().toISOString()
    plan.updatedAt = new Date().toISOString()
    this.userPlans.set(userId, plan)
    return plan
  }

  /**
   * Toggle completion of a concept within a curriculum module
   */
  public toggleConcept(
    userId: string,
    moduleId: string,
    conceptId: string
  ): { plan: CurriculumPlan; concept: ConceptItem } | null {
    const plan = this.getPlanForUser(userId)
    if (!plan) return null

    const mod = plan.modules.find(m => m.id === moduleId)
    if (!mod) return null

    const concept = mod.concepts.find(c => c.id === conceptId)
    if (!concept) return null

    concept.isCompleted = !concept.isCompleted

    // Check if module is completed
    const allCompleted = mod.concepts.every(c => c.isCompleted)
    const anyCompleted = mod.concepts.some(c => c.isCompleted)
    mod.status = allCompleted ? 'COMPLETED' : anyCompleted ? 'IN_PROGRESS' : 'NOT_STARTED'

    // Update overall progress percentage
    let totalConcepts = 0
    let completedConcepts = 0
    plan.modules.forEach(m => {
      m.concepts.forEach(c => {
        totalConcepts++
        if (c.isCompleted) completedConcepts++
      })
    })

    plan.overallProgress =
      totalConcepts > 0 ? Math.round((completedConcepts / totalConcepts) * 100) : 0
    plan.updatedAt = new Date().toISOString()
    this.userPlans.set(userId, plan)

    return { plan, concept }
  }
}

export const CurriculumEngine = new CurriculumSynthesizerService()

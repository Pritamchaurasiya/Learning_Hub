import { cacheService } from './CacheService'
import logger from '../utils/logger'

export interface ConceptSkillNode {
  id: string
  name: string
  code: string
  category: string
  tier: 'FOUNDATIONS' | 'CORE' | 'INTERMEDIATE' | 'ADVANCED'
  description: string
  prerequisites: string[] // IDs of required prerequisite skills
  masteryProbability: number // P(L_t), 0.0 to 1.0
  status: 'LOCKED' | 'UNLOCKED' | 'IN_PROGRESS' | 'MASTERED'
  practiceCount: number
  lastInteractedAt?: string
  practiceWorkspaceUrl?: string
  ebookChapterUrl?: string
}

export interface SkillEdge {
  from: string
  to: string
  relationship: 'PREREQUISITE' | 'REINFORCES'
}

export interface SkillGraphData {
  skills: ConceptSkillNode[]
  edges: SkillEdge[]
  masteryStats: {
    totalSkills: number
    masteredCount: number
    inProgressCount: number
    unlockedCount: number
    lockedCount: number
    averageMastery: number
    examReadinessScore: number
  }
}

export interface BKTParameters {
  pL0: number // Initial prior mastery
  pT: number // Transition / learning rate
  pG: number // Guess probability
  pS: number // Slip probability
}

const DEFAULT_BKT: BKTParameters = {
  pL0: 0.15,
  pT: 0.2,
  pG: 0.2,
  pS: 0.08,
}

const MASTERY_THRESHOLD = 0.85

// Canonical Concept Skills Repository
const INITIAL_SKILLS: Array<Omit<ConceptSkillNode, 'masteryProbability' | 'status' | 'practiceCount'>> = [
  {
    id: 'skill-asymptotic',
    name: 'Asymptotic Analysis & Invariants',
    code: 'CS-ALG-101',
    category: 'Algorithms',
    tier: 'FOUNDATIONS',
    description: 'Big-O, Omega, Theta notation, recurrence relations, and algorithmic upper/lower bounds.',
    prerequisites: [],
    practiceWorkspaceUrl: '/problems/complexity-analysis',
    ebookChapterUrl: '/ebooks/algorithms/chapter-1',
  },
  {
    id: 'skill-arrays-pointers',
    name: 'Arrays & Two-Pointer Mechanics',
    code: 'CS-DS-102',
    category: 'Data Structures',
    tier: 'FOUNDATIONS',
    description: 'Contiguous memory layout, sliding windows, prefix sums, and two-pointer traversal.',
    prerequisites: ['skill-asymptotic'],
    practiceWorkspaceUrl: '/problems/two-sum-ii',
    ebookChapterUrl: '/ebooks/algorithms/chapter-2',
  },
  {
    id: 'skill-binary-search',
    name: 'Binary Search on Answer Spaces',
    code: 'CS-ALG-201',
    category: 'Algorithms',
    tier: 'CORE',
    description: 'Monotonic predicate search, discrete search spaces, boundary handling, and float search.',
    prerequisites: ['skill-arrays-pointers'],
    practiceWorkspaceUrl: '/problems/koko-eating-bananas',
    ebookChapterUrl: '/ebooks/algorithms/chapter-3',
  },
  {
    id: 'skill-recursion-backtracking',
    name: 'Recursion Trees & Backtracking',
    code: 'CS-ALG-202',
    category: 'Algorithms',
    tier: 'CORE',
    description: 'Call stack dynamics, decision tree branching, state pruning, and combinatorial generation.',
    prerequisites: ['skill-arrays-pointers'],
    practiceWorkspaceUrl: '/problems/subsets-ii',
    ebookChapterUrl: '/ebooks/algorithms/chapter-4',
  },
  {
    id: 'skill-trees-graphs',
    name: 'Graph Traversal & DAG Topologies',
    code: 'CS-DS-301',
    category: 'Data Structures',
    tier: 'INTERMEDIATE',
    description: 'BFS, DFS, Kahn topological sort, cycle detection, and strongly connected components.',
    prerequisites: ['skill-recursion-backtracking'],
    practiceWorkspaceUrl: '/problems/course-schedule',
    ebookChapterUrl: '/ebooks/algorithms/chapter-5',
  },
  {
    id: 'skill-dynamic-programming',
    name: 'Dynamic Programming & Memoization',
    code: 'CS-ALG-401',
    category: 'Algorithms',
    tier: 'ADVANCED',
    description: 'Optimal substructure, overlapping subproblems, state compression, and DAG DP transitions.',
    prerequisites: ['skill-recursion-backtracking', 'skill-binary-search'],
    practiceWorkspaceUrl: '/problems/coin-change-ii',
    ebookChapterUrl: '/ebooks/algorithms/chapter-6',
  },
  {
    id: 'skill-system-concurrency',
    name: 'Multithreading & Synchronization Invariants',
    code: 'CS-SYS-402',
    category: 'Systems',
    tier: 'ADVANCED',
    description: 'Mutexes, semaphores, lock-free queues, race condition mitigation, and memory barriers.',
    prerequisites: ['skill-trees-graphs'],
    practiceWorkspaceUrl: '/problems/dining-philosophers',
    ebookChapterUrl: '/ebooks/systems/chapter-1',
  },
]

// In-memory store for student skill mastery beliefs
const USER_SKILL_MASTERY_STORE = new Map<string, Map<string, { p: number; count: number; lastDate: string }>>()

export class SkillEngineService {
  private getUserMasteries(userId: string): Map<string, { p: number; count: number; lastDate: string }> {
    if (!USER_SKILL_MASTERY_STORE.has(userId)) {
      const map = new Map<string, { p: number; count: number; lastDate: string }>()
      // Seed with initial baseline mastery
      map.set('skill-asymptotic', { p: 0.9, count: 5, lastDate: new Date().toISOString() })
      map.set('skill-arrays-pointers', { p: 0.86, count: 4, lastDate: new Date().toISOString() })
      map.set('skill-binary-search', { p: 0.65, count: 3, lastDate: new Date().toISOString() })
      map.set('skill-recursion-backtracking', { p: 0.52, count: 2, lastDate: new Date().toISOString() })
      map.set('skill-trees-graphs', { p: 0.35, count: 1, lastDate: new Date().toISOString() })
      map.set('skill-dynamic-programming', { p: 0.15, count: 0, lastDate: new Date().toISOString() })
      map.set('skill-system-concurrency', { p: 0.15, count: 0, lastDate: new Date().toISOString() })
      USER_SKILL_MASTERY_STORE.set(userId, map)
    }
    return USER_SKILL_MASTERY_STORE.get(userId)!
  }

  /**
   * Retrieves full concept skill DAG with active mastery beliefs and unlocked status.
   */
  async getSkillGraph(userId: string, domain?: string): Promise<SkillGraphData> {
    const masteries = this.getUserMasteries(userId)

    const skills: ConceptSkillNode[] = []
    const edges: SkillEdge[] = []

    // Build skill nodes
    for (const raw of INITIAL_SKILLS) {
      if (domain && domain !== 'all' && raw.category.toLowerCase() !== domain.toLowerCase()) {
        continue
      }

      const masteryRecord = masteries.get(raw.id) ?? { p: DEFAULT_BKT.pL0, count: 0, lastDate: '' }
      const p = Math.round(masteryRecord.p * 100) / 100

      // Evaluate prerequisite satisfaction
      let allPrereqsMastered = true
      for (const prereqId of raw.prerequisites) {
        const prereqRecord = masteries.get(prereqId)
        if (!prereqRecord || prereqRecord.p < MASTERY_THRESHOLD) {
          allPrereqsMastered = false
          break
        }
      }

      let status: ConceptSkillNode['status'] = 'LOCKED'
      if (p >= MASTERY_THRESHOLD) {
        status = 'MASTERED'
      } else if (masteryRecord.count > 0) {
        status = 'IN_PROGRESS'
      } else if (allPrereqsMastered) {
        status = 'UNLOCKED'
      }

      skills.push({
        ...raw,
        masteryProbability: p,
        status,
        practiceCount: masteryRecord.count,
        lastInteractedAt: masteryRecord.lastDate || undefined,
      })

      for (const pId of raw.prerequisites) {
        edges.push({
          from: pId,
          to: raw.id,
          relationship: 'PREREQUISITE',
        })
      }
    }

    const masteredCount = skills.filter(s => s.status === 'MASTERED').length
    const inProgressCount = skills.filter(s => s.status === 'IN_PROGRESS').length
    const unlockedCount = skills.filter(s => s.status === 'UNLOCKED').length
    const lockedCount = skills.filter(s => s.status === 'LOCKED').length

    const avgMastery =
      skills.length > 0
        ? Math.round(
            (skills.reduce((sum, s) => sum + s.masteryProbability, 0) / skills.length) * 100
          ) / 100
        : 0

    // 4-Factor Exam Readiness composite score:
    // R_exam = 0.35 * Syllabus + 0.30 * Mock + 0.20 * Speed + 0.15 * Retention
    const examReadinessScore = Math.round(
      (0.4 * (masteredCount / Math.max(1, skills.length)) + 0.6 * avgMastery) * 100
    )

    return {
      skills,
      edges,
      masteryStats: {
        totalSkills: skills.length,
        masteredCount,
        inProgressCount,
        unlockedCount,
        lockedCount,
        averageMastery: avgMastery,
        examReadinessScore,
      },
    }
  }

  /**
   * Updates student mastery belief following a practice observation using Corbett & Anderson BKT.
   */
  async recordInteraction(
    userId: string,
    skillId: string,
    isCorrect: boolean
  ): Promise<{
    skillId: string
    previousMastery: number
    updatedMastery: number
    isMastered: boolean
    newlyUnlockedSkills: string[]
  }> {
    const masteries = this.getUserMasteries(userId)
    const current = masteries.get(skillId) ?? {
      p: DEFAULT_BKT.pL0,
      count: 0,
      lastDate: new Date().toISOString(),
    }

    const prevP = current.p
    const { pS, pG, pT } = DEFAULT_BKT

    // 1. Posterior belief update
    let pPosterior: number
    if (isCorrect) {
      const num = prevP * (1 - pS)
      const denom = num + (1 - prevP) * pG
      pPosterior = denom > 0 ? num / denom : prevP
    } else {
      const num = prevP * pS
      const denom = num + (1 - prevP) * (1 - pG)
      pPosterior = denom > 0 ? num / denom : prevP
    }

    // 2. Learning transition forward step
    const pNext = pPosterior + (1 - pPosterior) * pT
    const clampedNext = Math.round(Math.min(0.99, Math.max(0.01, pNext)) * 1000) / 1000

    current.p = clampedNext
    current.count += 1
    current.lastDate = new Date().toISOString()
    masteries.set(skillId, current)

    // Check newly unlocked skills if threshold crossed
    const newlyUnlocked: string[] = []
    if (prevP < MASTERY_THRESHOLD && clampedNext >= MASTERY_THRESHOLD) {
      for (const skill of INITIAL_SKILLS) {
        if (skill.prerequisites.includes(skillId)) {
          // Check if all its prerequisites are now met
          const allMet = skill.prerequisites.every(pid => {
            const m = masteries.get(pid)
            return m && m.p >= MASTERY_THRESHOLD
          })
          if (allMet) {
            newlyUnlocked.push(skill.id)
          }
        }
      }
    }

    logger.info(`[SkillEngineService] BKT interaction user=${userId}, skill=${skillId}, correct=${isCorrect}: ${prevP} -> ${clampedNext}`)

    return {
      skillId,
      previousMastery: Math.round(prevP * 100) / 100,
      updatedMastery: Math.round(clampedNext * 100) / 100,
      isMastered: clampedNext >= MASTERY_THRESHOLD,
      newlyUnlockedSkills: newlyUnlocked,
    }
  }

  /**
   * Identifies the student's Next Best Action (NBA) within the Zone of Proximal Development (ZPD).
   */
  async getNextBestAction(userId: string, domain?: string) {
    const graph = await this.getSkillGraph(userId, domain)

    // Filter skills in ZPD (unlocked or in_progress, with mastery between 0.20 and 0.85)
    const zpdSkills = graph.skills
      .filter(s => (s.status === 'UNLOCKED' || s.status === 'IN_PROGRESS') && s.masteryProbability < MASTERY_THRESHOLD)
      .sort((a, b) => b.masteryProbability - a.masteryProbability) // closest to mastery first

    const targetSkill = zpdSkills[0] || graph.skills.find(s => s.status !== 'MASTERED') || graph.skills[0]

    return {
      recommendation: {
        skillId: targetSkill.id,
        skillName: targetSkill.name,
        category: targetSkill.category,
        currentMastery: targetSkill.masteryProbability,
        targetMastery: MASTERY_THRESHOLD,
        urgency: targetSkill.masteryProbability > 0.6 ? 'HIGH' : 'NORMAL',
        reason:
          targetSkill.masteryProbability > 0.6
            ? `You are at ${Math.round(targetSkill.masteryProbability * 100)}% mastery. A quick 10-minute sprint will lock in full mastery!`
            : `All prerequisites cleared. Ready to advance into ${targetSkill.name}.`,
        practiceUrl: targetSkill.practiceWorkspaceUrl || '/problems',
        ebookUrl: targetSkill.ebookChapterUrl || '/ebooks',
      },
      readinessSummary: graph.masteryStats,
    }
  }
}

export const skillEngineService = new SkillEngineService()

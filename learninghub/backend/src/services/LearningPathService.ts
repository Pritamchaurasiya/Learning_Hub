import { prisma } from '../prismaClient'
import { cacheService } from './CacheService'
import logger from '../utils/logger'

export interface LearningPath {
  id: string
  title: string
  description: string
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  duration: string
  courses: number
  enrolled: boolean
  progress: number
  completed_courses: number
  image?: string
  skills: string[]
  created_at: string
  updated_at: string
}

// In-memory user path enrollments
const USER_PATH_ENROLLMENTS = new Map<string, Set<string>>()

const CANONICAL_PATHS: LearningPath[] = [
  {
    id: 'path-fullstack-ts',
    title: 'Full-Stack TypeScript & Cloud Architect Mastery',
    description: 'End-to-end fullstack engineering with React 18, Node.js, PostgreSQL, Docker, and AWS Microservices.',
    level: 'Intermediate',
    duration: '14 Weeks',
    courses: 6,
    enrolled: false,
    progress: 0,
    completed_courses: 0,
    image: '/images/paths/fullstack.png',
    skills: ['TypeScript', 'React 18', 'Node.js', 'PostgreSQL', 'Docker', 'AWS'],
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'path-dsa-faang',
    title: 'Data Structures, Algorithms & Competitive Programming',
    description: 'Master dynamic programming, graph invariants, segment trees, and asymptotic optimizations.',
    level: 'Advanced',
    duration: '16 Weeks',
    courses: 8,
    enrolled: false,
    progress: 0,
    completed_courses: 0,
    image: '/images/paths/dsa.png',
    skills: ['Data Structures', 'Algorithms', 'Dynamic Programming', 'Graph Theory', 'C++ / Java / Python'],
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'path-ai-ml-systems',
    title: 'Applied Machine Learning & AI Systems Engineering',
    description: 'Deep dive into PyTorch, transformers, LLM prompt engineering, vector embeddings, and RAG pipelines.',
    level: 'Advanced',
    duration: '12 Weeks',
    courses: 5,
    enrolled: false,
    progress: 0,
    completed_courses: 0,
    image: '/images/paths/ai-ml.png',
    skills: ['PyTorch', 'Transformers', 'Vector Databases', 'LangChain', 'FastAPI', 'MLOps'],
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'path-gate-cs-prep',
    title: 'GATE Computer Science Comprehensive Sprint',
    description: 'Complete syllabus coverage for GATE CS: Theory of Computation, OS, DBMS, Networks, and Math.',
    level: 'Intermediate',
    duration: '24 Weeks',
    courses: 10,
    enrolled: false,
    progress: 0,
    completed_courses: 0,
    image: '/images/paths/gate.png',
    skills: ['TOC', 'Operating Systems', 'DBMS', 'Computer Networks', 'Discrete Mathematics'],
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export class LearningPathService {
  private getEnrolledSet(userId: string): Set<string> {
    if (!USER_PATH_ENROLLMENTS.has(userId)) {
      USER_PATH_ENROLLMENTS.set(userId, new Set(['path-fullstack-ts']))
    }
    return USER_PATH_ENROLLMENTS.get(userId)!
  }

  /**
   * Returns list of all available learning paths with user enrollment state.
   */
  async getLearningPaths(userId: string): Promise<LearningPath[]> {
    const cacheKey = cacheService.learningPathsKey(userId)
    const enrolled = this.getEnrolledSet(userId)

    return cacheService.cacheOrFetch(cacheKey, 60, async () => {
      return CANONICAL_PATHS.map(p => {
        const isEnrolled = enrolled.has(p.id)
        return {
          ...p,
          enrolled: isEnrolled,
          progress: isEnrolled ? 35 : 0,
          completed_courses: isEnrolled ? 2 : 0,
        }
      })
    })
  }

  /**
   * Retrieves single learning path details.
   */
  async getLearningPath(id: string, userId: string): Promise<LearningPath | null> {
    const enrolled = this.getEnrolledSet(userId)
    const target = CANONICAL_PATHS.find(p => p.id === id)
    if (!target) return null

    const isEnrolled = enrolled.has(target.id)
    return {
      ...target,
      enrolled: isEnrolled,
      progress: isEnrolled ? 35 : 0,
      completed_courses: isEnrolled ? 2 : 0,
    }
  }

  /**
   * Enrolls user in a learning path.
   */
  async enroll(userId: string, pathId: string): Promise<LearningPath> {
    const enrolled = this.getEnrolledSet(userId)
    enrolled.add(pathId)

    // Invalidate cache
    await cacheService.delete(cacheService.learningPathsKey(userId))

    const path = await this.getLearningPath(pathId, userId)
    if (!path) {
      throw new Error(`Learning path with id ${pathId} not found`)
    }

    logger.info(`[LearningPathService] User ${userId} enrolled in path ${pathId}`)
    return path
  }

  /**
   * Returns user's enrolled paths with active progress metrics.
   */
  async getMyProgress(userId: string): Promise<LearningPath[]> {
    const all = await this.getLearningPaths(userId)
    return all.filter(p => p.enrolled)
  }
}

export const learningPathService = new LearningPathService()

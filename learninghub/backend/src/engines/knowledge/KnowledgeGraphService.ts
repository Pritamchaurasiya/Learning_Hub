import { prisma } from '../../prismaClient'
import logger from '../../utils/logger'

export interface ConceptNode {
  id: string
  name: string
  slug: string
  description: string | null
  type: string
  order: number
  level: number
  masteryScore: number
  status: 'LOCKED' | 'UNLOCKED' | 'IN_PROGRESS' | 'MASTERED'
  prerequisiteIds: string[]
  isRecommended: boolean
}

export interface ConceptEdge {
  id: string
  from: string
  to: string
  strength: string
}

export interface KnowledgeGraphData {
  nodes: ConceptNode[]
  edges: ConceptEdge[]
  recommendedConceptId: string | null
  overallProgressPercentage: number
}

export class KnowledgeGraphService {
  private readonly ATTENUATION_FACTOR = 0.5 // How much the delta drops per hop
  private readonly MAX_DEPTH = 3 // Prevent infinite loops or excessive db load

  /**
   * Retrieves the full concept DAG with prerequisite relationships, levels, and user mastery status.
   */
  public async getConceptGraph(userId?: string): Promise<KnowledgeGraphData> {
    try {
      const rawConcepts = await prisma.concept.findMany({
        orderBy: { order: 'asc' },
        include: {
          prereqs: true,
        },
      })
      const concepts = Array.isArray(rawConcepts) ? rawConcepts : []

      const userMasteryMap = new Map<string, number>()
      if (userId) {
        const rawRecords = await prisma.userConceptMastery.findMany({
          where: { userId },
        })
        const masteryRecords = Array.isArray(rawRecords) ? rawRecords : []
        for (const m of masteryRecords) {
          if (m && m.conceptId) {
            userMasteryMap.set(m.conceptId, m.masteryScore ?? 0)
          }
        }
      }

      // If database has concepts, construct DAG from database records
      if (concepts.length > 0) {
        const edges: ConceptEdge[] = []
        for (const c of concepts) {
          for (const p of c.prereqs) {
            edges.push({
              id: p.id,
              from: p.prerequisiteId,
              to: c.id,
              strength: p.strength,
            })
          }
        }

        // Calculate levels using topological order
        const inDegree = new Map<string, number>()
        const adj = new Map<string, string[]>()
        for (const c of concepts) {
          inDegree.set(c.id, 0)
          adj.set(c.id, [])
        }
        for (const e of edges) {
          inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1)
          const list = adj.get(e.from) ?? []
          list.push(e.to)
          adj.set(e.from, list)
        }

        const levels = new Map<string, number>()
        const queue: string[] = []
        for (const [id, deg] of inDegree.entries()) {
          if (deg === 0) {
            queue.push(id)
            levels.set(id, 0)
          }
        }

        while (queue.length > 0) {
          const curr = queue.shift()!
          const currLevel = levels.get(curr) ?? 0
          const neighbors = adj.get(curr) ?? []
          for (const nxt of neighbors) {
            const nxtLevel = Math.max(levels.get(nxt) ?? 0, currLevel + 1)
            levels.set(nxt, nxtLevel)
            const newDeg = (inDegree.get(nxt) ?? 1) - 1
            inDegree.set(nxt, newDeg)
            if (newDeg === 0) {
              queue.push(nxt)
            }
          }
        }

        let recommendedId: string | null = null
        let totalMastery = 0

        const nodes: ConceptNode[] = concepts.map((c: any) => {
          const score = userMasteryMap.get(c.id) ?? 0
          totalMastery += score
          const prereqIds = (c.prereqs || []).map((p: any) => p.prerequisiteId as string)

          // Determine status based on prereqs
          let status: ConceptNode['status'] = 'UNLOCKED'
          const prereqsSatisfied = prereqIds.every(
            (pid: string) => (userMasteryMap.get(pid) ?? 0) >= 0.7
          )

          if (score >= 0.8) {
            status = 'MASTERED'
          } else if (score > 0) {
            status = 'IN_PROGRESS'
          } else if (!prereqsSatisfied && prereqIds.length > 0) {
            status = 'LOCKED'
          }

          return {
            id: c.id,
            name: c.name,
            slug: c.slug,
            description: c.description,
            type: String(c.type),
            order: c.order,
            level: levels.get(c.id) ?? 0,
            masteryScore: Math.round(score * 100) / 100,
            status,
            prerequisiteIds: prereqIds,
            isRecommended: false,
          }
        })

        // Pick first UNLOCKED or IN_PROGRESS node as recommended
        for (const n of nodes) {
          if (n.status === 'IN_PROGRESS' || n.status === 'UNLOCKED') {
            n.isRecommended = true
            recommendedId = n.id
            break
          }
        }

        const overallProgressPercentage =
          nodes.length > 0 ? Math.round((totalMastery / nodes.length) * 100) : 0

        return {
          nodes,
          edges,
          recommendedConceptId: recommendedId,
          overallProgressPercentage,
        }
      }

      // Default Rich Fallback Concept Map for CS & Software Engineering
      const defaultConcepts: Array<{
        id: string
        name: string
        slug: string
        description: string
        level: number
        prereqs: string[]
        order: number
      }> = [
        {
          id: 'concept_variables_types',
          name: 'Variables & Data Types',
          slug: 'variables-and-data-types',
          description:
            'Primitive data types, type casting, and variable scopes in modern languages.',
          level: 0,
          prereqs: [],
          order: 1,
        },
        {
          id: 'concept_control_flow',
          name: 'Control Flow & Conditionals',
          slug: 'control-flow-and-conditionals',
          description: 'Branching logic, boolean algebra, switch statements, and loop constructs.',
          level: 0,
          prereqs: [],
          order: 2,
        },
        {
          id: 'concept_arrays_strings',
          name: 'Arrays & String Manipulation',
          slug: 'arrays-and-strings',
          description:
            'Sequential memory allocation, two-pointer techniques, and string parsing algorithms.',
          level: 1,
          prereqs: ['concept_variables_types', 'concept_control_flow'],
          order: 3,
        },
        {
          id: 'concept_linked_lists',
          name: 'Linked Lists & Pointers',
          slug: 'linked-lists-and-pointers',
          description: 'Singly, doubly, and circular linked lists with pointer operations.',
          level: 2,
          prereqs: ['concept_arrays_strings'],
          order: 4,
        },
        {
          id: 'concept_stacks_queues',
          name: 'Stacks, Queues & Monotonic Deques',
          slug: 'stacks-and-queues',
          description:
            'LIFO & FIFO data structures, balanced parentheses, and sliding window maximums.',
          level: 2,
          prereqs: ['concept_arrays_strings'],
          order: 5,
        },
        {
          id: 'concept_trees_graphs',
          name: 'Binary Trees & Graph Traversals',
          slug: 'binary-trees-and-graphs',
          description: 'DFS, BFS, Binary Search Trees, and topological sorting algorithms.',
          level: 3,
          prereqs: ['concept_linked_lists', 'concept_stacks_queues'],
          order: 6,
        },
        {
          id: 'concept_dynamic_programming',
          name: 'Dynamic Programming & Memoization',
          slug: 'dynamic-programming',
          description: 'Overlapping subproblems, optimal substructure, 1D/2D state transitions.',
          level: 4,
          prereqs: ['concept_trees_graphs'],
          order: 7,
        },
        {
          id: 'concept_distributed_systems',
          name: 'System Design & Scalability',
          slug: 'system-design-scalability',
          description:
            'Load balancing, caching strategies, distributed consensus, and microservices architecture.',
          level: 5,
          prereqs: ['concept_dynamic_programming'],
          order: 8,
        },
      ]

      const edges: ConceptEdge[] = []
      let edgeIdx = 1
      for (const dc of defaultConcepts) {
        for (const p of dc.prereqs) {
          edges.push({
            id: `edge_${edgeIdx++}`,
            from: p,
            to: dc.id,
            strength: 'required',
          })
        }
      }

      let totalScore = 0
      const nodes: ConceptNode[] = defaultConcepts.map(dc => {
        const score =
          userMasteryMap.get(dc.id) ?? (dc.level === 0 ? 0.85 : dc.level === 1 ? 0.45 : 0)
        totalScore += score
        const prereqsSatisfied = dc.prereqs.every(
          pid =>
            (userMasteryMap.get(pid) ??
              (pid.includes('variables') || pid.includes('control') ? 0.85 : 0.45)) >= 0.7
        )

        let status: ConceptNode['status'] = 'UNLOCKED'
        if (score >= 0.8) status = 'MASTERED'
        else if (score > 0) status = 'IN_PROGRESS'
        else if (!prereqsSatisfied && dc.prereqs.length > 0) status = 'LOCKED'

        return {
          id: dc.id,
          name: dc.name,
          slug: dc.slug,
          description: dc.description,
          type: 'TOPIC',
          order: dc.order,
          level: dc.level,
          masteryScore: Math.round(score * 100) / 100,
          status,
          prerequisiteIds: dc.prereqs,
          isRecommended: false,
        }
      })

      const recommendedId = 'concept_arrays_strings'
      const recNode = nodes.find(n => n.id === recommendedId)
      if (recNode) recNode.isRecommended = true

      return {
        nodes,
        edges,
        recommendedConceptId: recommendedId,
        overallProgressPercentage: Math.round((totalScore / nodes.length) * 100),
      }
    } catch (error) {
      logger.error(
        'Error fetching concept graph',
        error instanceof Error ? error : new Error(String(error))
      )
      return {
        nodes: [],
        edges: [],
        recommendedConceptId: null,
        overallProgressPercentage: 0,
      }
    }
  }

  /**
   * Propagates a mastery score change through the prerequisite graph
   * @param userId The user whose mastery is changing
   * @param conceptId The starting concept ID that just had its mastery updated
   * @param masteryDelta The change in mastery score (e.g. +0.1 or -0.05)
   * @param depth Current recursion depth
   */
  public async propagateMastery(
    userId: string,
    conceptId: string,
    masteryDelta: number,
    depth: number = 0
  ): Promise<void> {
    if (depth >= this.MAX_DEPTH || Math.abs(masteryDelta) < 0.01) {
      return // Stop propagation if too deep or impact is negligible
    }

    try {
      // Find all prerequisites for this concept
      const prereqs = await prisma.conceptPrerequisite.findMany({
        where: { conceptId },
      })

      if (prereqs.length === 0) return

      const attenuatedDelta = masteryDelta * this.ATTENUATION_FACTOR

      for (const prereq of prereqs) {
        // Fetch existing mastery
        const userMastery = await prisma.userConceptMastery.findUnique({
          where: {
            userId_conceptId: { userId, conceptId: prereq.prerequisiteId },
          },
        })

        if (userMastery) {
          // Update existing mastery via prerequisite impact
          const newScore = Math.max(0, Math.min(1, userMastery.masteryScore + attenuatedDelta))

          await prisma.userConceptMastery.update({
            where: { id: userMastery.id },
            data: {
              masteryScore: newScore,
              prerequisiteScore: Math.max(
                0,
                Math.min(1, userMastery.prerequisiteScore + attenuatedDelta)
              ),
              updatedAt: new Date(),
            },
          })

          logger.debug('Propagated mastery down graph', {
            userId,
            fromConcept: conceptId,
            toConcept: prereq.prerequisiteId,
            delta: attenuatedDelta,
          })

          // Recurse downwards
          await this.propagateMastery(userId, prereq.prerequisiteId, attenuatedDelta, depth + 1)
        }
      }
    } catch (error) {
      logger.error('Error propagating knowledge graph mastery', error as Error, {
        userId,
        conceptId,
      })
    }
  }

  /**
   * Synchronizes Topic Mastery to Concept Mastery
   * Since our BKT engine operates on Topics, we mirror the score to UserConceptMastery
   * so the Knowledge Graph can process it.
   */
  public async syncTopicToConceptMastery(
    userId: string,
    topicName: string,
    masteryScore: number,
    masteryDelta: number
  ): Promise<void> {
    try {
      // Find concept by name (slug usually matches topic name or similar)
      const concept = await prisma.concept.findFirst({
        where: { name: topicName },
      })

      if (!concept) return

      let userConceptMastery = await prisma.userConceptMastery.findUnique({
        where: {
          userId_conceptId: { userId, conceptId: concept.id },
        },
      })

      if (!userConceptMastery) {
        userConceptMastery = await prisma.userConceptMastery.create({
          data: {
            userId,
            conceptId: concept.id,
            conceptName: concept.name,
            masteryScore,
            totalAttempts: 1,
            lastAttemptAt: new Date(),
          },
        })
      } else {
        await prisma.userConceptMastery.update({
          where: { id: userConceptMastery.id },
          data: {
            masteryScore,
            totalAttempts: { increment: 1 },
            lastAttemptAt: new Date(),
          },
        })
      }

      // Propagate the change through the graph
      await this.propagateMastery(userId, concept.id, masteryDelta, 0)
    } catch (error) {
      logger.error('Failed to sync topic to concept mastery', error as Error, {
        userId,
        topicName,
      })
    }
  }
}

export const knowledgeGraphService = new KnowledgeGraphService()

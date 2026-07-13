import { prisma } from '../../prismaClient'
import { logger } from '../../utils/logger'

export class KnowledgeGraphService {
  private readonly ATTENUATION_FACTOR = 0.5 // How much the delta drops per hop
  private readonly MAX_DEPTH = 3 // Prevent infinite loops or excessive db load

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
        } else {
          // If the user has never interacted with this prerequisite concept,
          // we can optionally initialize it. But normally we only track if they have attempted it.
          // For now, we skip initializing un-attempted prerequisites to avoid DB bloat.
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

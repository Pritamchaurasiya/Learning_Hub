import { prisma } from '../../prismaClient'
import logger from '../../utils/logger'

export interface AdaptivePathStep {
  stepIndex: number
  topicId: string
  topicName: string
  targetDifficulty: number
  estimatedDurationMinutes: number
  reasoning: string
}

export interface AdaptiveLearningPath {
  userId: string
  targetSkill: string
  currentMastery: number
  projectedMastery: number
  steps: AdaptivePathStep[]
  generatedAt: Date
}

export interface DifficultyPrediction {
  questionText: string
  estimatedTheta: number // IRT difficulty parameter (-3.0 to +3.0)
  bloomsTaxonomyLevel: 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE'
  confidenceScore: number
}

export interface SemanticHint {
  questionId?: string
  hintLevel: number
  hintText: string
  pedagogicalGoal: string
}

export interface DropoutRiskAnalysis {
  userId: string
  riskScore: number // 0 to 100
  riskTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  primaryRiskFactors: string[]
  recommendedInterventions: string[]
}

export class AIEngine {
  /**
   * Generates a personalized adaptive learning path based on current mastery and target skill.
   */
  public async generateAdaptiveLearningPath(
    userId: string,
    targetSkill: string,
    currentMastery: number = 0
  ): Promise<AdaptiveLearningPath> {
    logger.info(
      `[AIEngine] Generating adaptive learning path for user ${userId}, skill: ${targetSkill}`
    )

    // Fetch user topic mastery if available
    let knownMastery = currentMastery
    try {
      const userMastery = await prisma.userTopicMastery.findFirst({
        where: { userId, topicName: { contains: targetSkill, mode: 'insensitive' } },
      })
      if (userMastery) {
        knownMastery = userMastery.masteryScore
      }
    } catch (err) {
      logger.warn(
        `[AIEngine] Could not fetch DB topic mastery for ${userId}: ${err instanceof Error ? err.message : String(err)}`
      )
    }

    const projectedMastery = Math.min(100, knownMastery + 35)
    const baseDifficulty = knownMastery < 30 ? 1 : knownMastery < 60 ? 2 : 3

    const steps: AdaptivePathStep[] = [
      {
        stepIndex: 1,
        topicId: `topic_${targetSkill.toLowerCase().replace(/\s+/g, '_')}_foundation`,
        topicName: `${targetSkill} - Core Fundamentals & Concepts`,
        targetDifficulty: baseDifficulty,
        estimatedDurationMinutes: 20,
        reasoning: `Establishes core prerequisite comprehension at difficulty level ${baseDifficulty}.`,
      },
      {
        stepIndex: 2,
        topicId: `topic_${targetSkill.toLowerCase().replace(/\s+/g, '_')}_application`,
        topicName: `${targetSkill} - Practical Problem Solving`,
        targetDifficulty: Math.min(5, baseDifficulty + 1),
        estimatedDurationMinutes: 30,
        reasoning: `Applies concepts to real-world scenarios to solidify mastery and retention.`,
      },
      {
        stepIndex: 3,
        topicId: `topic_${targetSkill.toLowerCase().replace(/\s+/g, '_')}_synthesis`,
        topicName: `${targetSkill} - Advanced Synthesis & Edge Cases`,
        targetDifficulty: Math.min(5, baseDifficulty + 2),
        estimatedDurationMinutes: 25,
        reasoning: `Tests boundary conditions and complex integration tasks for mastery verification.`,
      },
    ]

    return {
      userId,
      targetSkill,
      currentMastery: knownMastery,
      projectedMastery,
      steps,
      generatedAt: new Date(),
    }
  }

  /**
   * Evaluates and predicts IRT difficulty parameter and Bloom's taxonomy level for a question text.
   */
  public predictQuestionDifficulty(
    questionText: string,
    historicalAttempts: number = 0,
    accuracy: number = 0.5
  ): DifficultyPrediction {
    logger.info(
      `[AIEngine] Predicting question difficulty for text: "${questionText.substring(0, 40)}..."`
    )

    let estimatedTheta = 0.0 // average difficulty
    if (historicalAttempts >= 5) {
      // Calibrate empirical theta based on accuracy logit
      const clampedAcc = Math.max(0.05, Math.min(0.95, accuracy))
      estimatedTheta = -Math.log(clampedAcc / (1 - clampedAcc))
    } else {
      // Heuristic string complexity assessment
      const wordCount = questionText.split(/\s+/).length
      if (wordCount > 50 || /analyze|evaluate|synthesize|compare/i.test(questionText)) {
        estimatedTheta = 1.2
      } else if (wordCount < 15 || /what is|define|list|name/i.test(questionText)) {
        estimatedTheta = -1.0
      }
    }

    let bloomsTaxonomyLevel: DifficultyPrediction['bloomsTaxonomyLevel'] = 'APPLY'
    if (/design|create|formulate|construct/i.test(questionText)) {
      bloomsTaxonomyLevel = 'CREATE'
    } else if (/evaluate|judge|justify|critique/i.test(questionText)) {
      bloomsTaxonomyLevel = 'EVALUATE'
    } else if (/analyze|compare|contrast|examine/i.test(questionText)) {
      bloomsTaxonomyLevel = 'ANALYZE'
    } else if (/explain|summarize|interpret/i.test(questionText)) {
      bloomsTaxonomyLevel = 'UNDERSTAND'
    } else if (/define|list|recall|what is/i.test(questionText)) {
      bloomsTaxonomyLevel = 'REMEMBER'
    }

    return {
      questionText,
      estimatedTheta: Math.round(estimatedTheta * 100) / 100,
      bloomsTaxonomyLevel,
      confidenceScore: historicalAttempts > 10 ? 0.95 : 0.75,
    }
  }

  /**
   * Generates a calibrated semantic hint tailored to the user's attempt without revealing the answer.
   */
  public generateSemanticHint(
    questionText: string,
    userAttempt: string,
    hintLevel: number = 1
  ): SemanticHint {
    logger.info(
      `[AIEngine] Generating semantic hint level ${hintLevel} for attempt: "${userAttempt.substring(0, 30)}..."`
    )

    let hintText = 'Consider reviewing the key definitions and formulas related to this problem.'
    let pedagogicalGoal = 'Encourage foundational recall.'

    if (hintLevel === 1) {
      hintText = `Look closely at what the question is asking regarding "${questionText.split(' ').slice(0, 4).join(' ')}". Are there any keywords you overlooked?`
      pedagogicalGoal = 'Provide subtle cognitive nudge without direct assistance.'
    } else if (hintLevel === 2) {
      hintText = `Your attempt "${userAttempt}" shows good progress, but check if you accounted for boundary rules or sign conversions in the main expression.`
      pedagogicalGoal = 'Guide conceptual correction and identify systematic error.'
    } else {
      hintText = `Step-by-step guide: 1) Identify the primary variables. 2) Apply the standard formula. 3) Notice how your attempt "${userAttempt}" differs in the final operation.`
      pedagogicalGoal = 'Provide comprehensive structured scaffold.'
    }

    return {
      hintLevel,
      hintText,
      pedagogicalGoal,
    }
  }

  /**
   * Analyzes user engagement metrics to estimate dropout risk and suggest interventions.
   */
  public analyzeDropoutRisk(
    userId: string,
    inactivityDays: number,
    recentScores: number[] = []
  ): DropoutRiskAnalysis {
    logger.info(
      `[AIEngine] Analyzing dropout risk for user ${userId}, inactivity: ${inactivityDays} days`
    )

    let riskScore = Math.min(60, inactivityDays * 5)
    const avgScore =
      recentScores.length > 0 ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length : 70

    if (avgScore < 50) {
      riskScore += 25
    } else if (avgScore < 65) {
      riskScore += 15
    }

    riskScore = Math.min(100, Math.max(0, Math.round(riskScore)))

    let riskTier: DropoutRiskAnalysis['riskTier'] = 'LOW'
    if (riskScore >= 80) riskTier = 'CRITICAL'
    else if (riskScore >= 60) riskTier = 'HIGH'
    else if (riskScore >= 35) riskTier = 'MEDIUM'

    const primaryRiskFactors: string[] = []
    if (inactivityDays >= 7)
      primaryRiskFactors.push(`Prolonged inactivity (${inactivityDays} days since last session)`)
    if (avgScore < 60)
      primaryRiskFactors.push(
        `Declining or low assessment performance (avg: ${Math.round(avgScore)}%)`
      )
    if (primaryRiskFactors.length === 0)
      primaryRiskFactors.push('Consistent engagement pattern maintained')

    const recommendedInterventions: string[] = []
    if (riskTier === 'CRITICAL' || riskTier === 'HIGH') {
      recommendedInterventions.push(
        'Send personalized re-engagement push notification with 2x XP bonus offer'
      )
      recommendedInterventions.push(
        'Recommend a lower difficulty review quiz to restore learner confidence'
      )
    } else if (riskTier === 'MEDIUM') {
      recommendedInterventions.push(
        'Suggest a 5-minute daily streak freeze or quick practice session'
      )
    } else {
      recommendedInterventions.push(
        'Maintain standard milestone notifications and positive reinforcement'
      )
    }

    return {
      userId,
      riskScore,
      riskTier,
      primaryRiskFactors,
      recommendedInterventions,
    }
  }
}

export const aiEngineInstance = new AIEngine()

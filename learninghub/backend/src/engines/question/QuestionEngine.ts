import logger from '../../utils/logger'

export type BloomsTaxonomyLevel =
  'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE'

export interface QuestionItem {
  id: string
  text: string
  bloomsLevel?: BloomsTaxonomyLevel
  difficulty: number
  tags: string[]
}

export interface DistractorGenerationResult {
  correctAnswer: string
  distractors: Array<{
    text: string
    targetedMisconception: string
    plausibilityScore: number // 0 to 1
  }>
  domainTopic: string
}

export interface SimilarityCheckResult {
  isDuplicate: boolean
  highestSimilarityScore: number // 0 to 1
  mostSimilarQuestionId?: string
  mostSimilarQuestionText?: string
  comparisonSummary: string
}

export interface TagRecommendationResult {
  questionText: string
  recommendedTags: string[]
  inferredDifficulty: number // 1 to 5
  inferredBloomsLevel: BloomsTaxonomyLevel
}

export class QuestionEngine {
  /**
   * Filters and sorts a list of questions based on target Bloom's taxonomy cognitive level.
   */
  public filterByBloomsTaxonomy(
    questions: QuestionItem[],
    targetLevel: BloomsTaxonomyLevel
  ): QuestionItem[] {
    logger.info(
      `[QuestionEngine] Filtering ${questions.length} items by Bloom's level: ${targetLevel}`
    )

    return questions.filter(q => {
      if (q.bloomsLevel) return q.bloomsLevel === targetLevel

      // Infer if missing
      const text = q.text.toLowerCase()
      if (targetLevel === 'CREATE' && /create|design|construct|formulate/.test(text)) return true
      if (targetLevel === 'EVALUATE' && /evaluate|judge|justify|critique/.test(text)) return true
      if (targetLevel === 'ANALYZE' && /analyze|compare|contrast|differentiate/.test(text))
        return true
      if (targetLevel === 'APPLY' && /apply|solve|calculate|demonstrate/.test(text)) return true
      if (targetLevel === 'UNDERSTAND' && /explain|summarize|describe|interpret/.test(text))
        return true
      if (targetLevel === 'REMEMBER' && /define|list|state|what is|name/.test(text)) return true

      return false
    })
  }

  /**
   * Generates plausible distractor choices targeting common student misconceptions.
   */
  public generatePlausibleDistractors(
    correctAnswer: string,
    domainTopic: string,
    count: number = 3
  ): DistractorGenerationResult {
    logger.info(
      `[QuestionEngine] Generating ${count} distractors for answer: "${correctAnswer}" in topic: "${domainTopic}"`
    )

    const distractors: DistractorGenerationResult['distractors'] = []
    const cleanAnswer = correctAnswer.trim()

    // Numeric check for mathematical/algebraic misconceptions
    const numVal = parseFloat(cleanAnswer)
    if (!isNaN(numVal) && isFinite(numVal)) {
      distractors.push({
        text: String(Math.round(numVal * -1 * 100) / 100),
        targetedMisconception: 'Sign reversal or omitted negative sign during calculation',
        plausibilityScore: 0.95,
      })
      distractors.push({
        text: String(Math.round(numVal * 2 * 100) / 100),
        targetedMisconception: 'Doubled term or unsimplified ratio factor',
        plausibilityScore: 0.85,
      })
      distractors.push({
        text: String(Math.round((numVal + 10) * 100) / 100),
        targetedMisconception: 'Order of operations / constant addition error',
        plausibilityScore: 0.8,
      })
    } else {
      // Semantic / conceptual misconceptions for text answers
      distractors.push({
        text: `Inverse or opposite principle of ${cleanAnswer}`,
        targetedMisconception: `Confusing ${cleanAnswer} with its complementary domain concept in ${domainTopic}`,
        plausibilityScore: 0.9,
      })
      distractors.push({
        text: `Partial implementation of ${cleanAnswer}`,
        targetedMisconception: 'Omitting a required secondary condition or constraint',
        plausibilityScore: 0.85,
      })
      distractors.push({
        text: `Legacy or deprecated approach to ${cleanAnswer}`,
        targetedMisconception: 'Relying on outdated or unoptimized methodologies',
        plausibilityScore: 0.75,
      })
    }

    return {
      correctAnswer,
      distractors: distractors.slice(0, count),
      domainTopic,
    }
  }

  /**
   * Evaluates text similarity against an existing question bank using Jaccard token overlap to prevent duplicates.
   */
  public checkQuestionSimilarity(
    newQuestionText: string,
    existingQuestions: QuestionItem[],
    similarityThreshold: number = 0.75
  ): SimilarityCheckResult {
    logger.info(
      `[QuestionEngine] Checking duplicate similarity against ${existingQuestions.length} existing items`
    )

    const tokenize = (str: string): Set<string> => {
      return new Set(
        str
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter(w => w.length > 2)
      )
    }

    const newTokens = tokenize(newQuestionText)
    let highestSimilarityScore = 0.0
    let mostSimilarQuestionId: string | undefined
    let mostSimilarQuestionText: string | undefined

    for (const item of existingQuestions) {
      const existingTokens = tokenize(item.text)
      if (existingTokens.size === 0 || newTokens.size === 0) continue

      let intersectionCount = 0
      for (const token of newTokens) {
        if (existingTokens.has(token)) intersectionCount++
      }

      const unionCount = newTokens.size + existingTokens.size - intersectionCount
      const jaccardScore = intersectionCount / unionCount

      if (jaccardScore > highestSimilarityScore) {
        highestSimilarityScore = jaccardScore
        mostSimilarQuestionId = item.id
        mostSimilarQuestionText = item.text
      }
    }

    highestSimilarityScore = Math.round(highestSimilarityScore * 100) / 100
    const isDuplicate = highestSimilarityScore >= similarityThreshold

    return {
      isDuplicate,
      highestSimilarityScore,
      mostSimilarQuestionId,
      mostSimilarQuestionText,
      comparisonSummary: isDuplicate
        ? `HIGH SIMILARITY (${Math.round(highestSimilarityScore * 100)}% overlap): Potential duplicate of question ID ${mostSimilarQuestionId}.`
        : `UNIQUE ITEM (${Math.round(highestSimilarityScore * 100)}% max overlap): Safely distinct from existing bank.`,
    }
  }

  /**
   * Recommends content tags, difficulty level, and Bloom's cognitive level based on item text analysis.
   */
  public recommendTags(questionText: string): TagRecommendationResult {
    logger.info(
      `[QuestionEngine] Recommending tags for question: "${questionText.substring(0, 40)}..."`
    )

    const text = questionText.toLowerCase()
    const recommendedTags: string[] = []

    // Subject area heuristics
    if (/react|jsx|component|hook|state|effect|prop/.test(text))
      recommendedTags.push('React', 'Frontend', 'Web Development')
    if (/node|express|api|server|middleware|http|rest/.test(text))
      recommendedTags.push('Node.js', 'Backend', 'API')
    if (/sql|database|table|query|join|index|prisma|mongo/.test(text))
      recommendedTags.push('Database', 'SQL', 'Data Modeling')
    if (/algorithm|sort|search|tree|graph|array|complexity|big o/.test(text))
      recommendedTags.push('Algorithms', 'Data Structures', 'CS Fundamentals')
    if (/test|jest|mock|assert|coverage|vitest|e2e/.test(text))
      recommendedTags.push('Testing', 'QA', 'Automation')
    if (/security|auth|jwt|token|encryption|xss|csrf|sql injection/.test(text))
      recommendedTags.push('Security', 'Authentication', 'Cybersecurity')

    if (recommendedTags.length === 0) {
      recommendedTags.push('General Knowledge', 'Core Concepts')
    }

    // Deduplicate tags
    const uniqueTags = Array.from(new Set(recommendedTags))

    let inferredDifficulty = 3
    const wordCount = text.split(/\s+/).length
    if (wordCount > 60 || /analyze|evaluate|architect|optimize|concurrency/.test(text))
      inferredDifficulty = 5
    else if (wordCount > 35 || /implement|configure|integrate/.test(text)) inferredDifficulty = 4
    else if (wordCount < 15 || /define|what is|name/.test(text)) inferredDifficulty = 1
    else if (wordCount < 25) inferredDifficulty = 2

    let inferredBloomsLevel: BloomsTaxonomyLevel = 'APPLY'
    if (/create|design|architect/.test(text)) inferredBloomsLevel = 'CREATE'
    else if (/evaluate|critique|judge/.test(text)) inferredBloomsLevel = 'EVALUATE'
    else if (/analyze|compare|contrast/.test(text)) inferredBloomsLevel = 'ANALYZE'
    else if (/explain|summarize/.test(text)) inferredBloomsLevel = 'UNDERSTAND'
    else if (/define|what is|list/.test(text)) inferredBloomsLevel = 'REMEMBER'

    return {
      questionText,
      recommendedTags: uniqueTags,
      inferredDifficulty,
      inferredBloomsLevel,
    }
  }
}

export const questionEngineInstance = new QuestionEngine()

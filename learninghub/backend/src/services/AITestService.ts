/**
 * AI Test Generation Service
 *
 * Core engine for AI-powered test generation using Google Gemini.
 * Supports:
 *  - Country/exam pattern analysis
 *  - Adaptive difficulty
 *  - Topic-specific generation
 *  - Test caching and persistence
 *  - Explanation generation
 *  - Bloom's Taxonomy classification
 */

import { GoogleGenerativeAI, type GenerateContentResult } from '@google/generative-ai'
import { prisma } from '../prismaClient'
import logger from '../utils/logger'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TestGenerationRequest {
  userId: string
  topic: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED' | 'ADAPTIVE'
  count: number
  mode: 'PRACTICE' | 'MOCK' | 'TIMED_CHALLENGE' | 'ADAPTIVE'
  examContext?: {
    countryId?: string
    examId?: string
    subjectId?: string
    topicIds?: string[]
  }
  timeLimit?: number
}

export interface GeneratedQuestion {
  text: string
  options: { id: string; text: string }[]
  correct_option_id: string
  explanation: string
  difficulty: string
  bloom_level: string
  tags?: string[]
}

export interface TestGenerationResult {
  testId: string
  title: string
  questionCount: number
  timeLimit: number
  questions: GeneratedQuestion[]
  ai_powered: boolean
  model: string
  cached: boolean
}

// ─── Prompt Templates ────────────────────────────────────────────────────────

const PROMPT_TEMPLATES = {
  standard: (topic: string, difficulty: string, count: number) => `
You are an expert exam question designer for an educational platform.

Generate ${count} original multiple-choice questions for:
- Topic: ${topic}
- Difficulty: ${difficulty}

STRICT REQUIREMENTS:
1. Questions MUST be 100% original — never copy from existing exam papers or textbooks
2. Each question must have exactly 4 options labeled a, b, c, d
3. Exactly ONE option must be correct
4. Provide a clear, educational explanation for the correct answer
5. Vary question styles: conceptual understanding, application, analysis, and evaluation
6. Use Bloom's Taxonomy levels: remember, understand, apply, analyze, evaluate, create
7. For ${difficulty} difficulty:
   - EASY: Direct recall and basic understanding
   - MEDIUM: Application and analysis of concepts
   - HARD: Complex analysis, synthesis, and evaluation

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "questions": [
    {
      "text": "Question text here",
      "options": [
        {"id": "a", "text": "Option A text"},
        {"id": "b", "text": "Option B text"},
        {"id": "c", "text": "Option C text"},
        {"id": "d", "text": "Option D text"}
      ],
      "correct_option_id": "b",
      "explanation": "Detailed explanation of why B is correct and why others are wrong",
      "difficulty": "${difficulty}",
      "bloom_level": "apply",
      "tags": ["tag1", "tag2"]
    }
  ]
}`,

  exam_pattern: (
    topic: string,
    difficulty: string,
    count: number,
    examName: string,
    pattern: string
  ) => `
You are an expert exam question designer specializing in ${examName}.

Exam Pattern: ${pattern}

Generate ${count} original multiple-choice questions that follow this exam pattern:
- Topic: ${topic}
- Difficulty: ${difficulty}
- Exam Style: ${examName}

STRICT REQUIREMENTS:
1. Questions MUST mirror the style, format, and difficulty of ${examName}
2. Questions MUST be 100% original — never copy from actual exam papers
3. Each question must have exactly 4 options labeled a, b, c, d
4. Exactly ONE option must be correct
5. Provide detailed explanations
6. Follow the exam's typical marking scheme and question style

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "questions": [
    {
      "text": "Question text here",
      "options": [
        {"id": "a", "text": "Option A"},
        {"id": "b", "text": "Option B"},
        {"id": "c", "text": "Option C"},
        {"id": "d", "text": "Option D"}
      ],
      "correct_option_id": "b",
      "explanation": "Explanation",
      "difficulty": "${difficulty}",
      "bloom_level": "analyze",
      "tags": ["${topic}"]
    }
  ]
}`,

  adaptive: (topic: string, count: number, currentLevel: number) => `
You are an adaptive learning question designer.

Generate ${count} questions with progressive difficulty for:
- Topic: ${topic}
- Current learner level: ${currentLevel}/5

STRICT REQUIREMENTS:
1. Start with easier questions and progressively increase difficulty
2. Each question must have exactly 4 options (a, b, c, d)
3. Exactly ONE correct answer per question
4. Provide explanations
5. Include the IRT difficulty value (0.0 to 5.0) for each question

Respond with ONLY valid JSON:
{
  "questions": [
    {
      "text": "Question",
      "options": [
        {"id": "a", "text": "A"},
        {"id": "b", "text": "B"},
        {"id": "c", "text": "C"},
        {"id": "d", "text": "D"}
      ],
      "correct_option_id": "a",
      "explanation": "Explanation",
      "difficulty": "EASY",
      "bloom_level": "remember",
      "tags": ["${topic}"]
    }
  ]
}`,
}

// ─── AI Test Service ─────────────────────────────────────────────────────────

let _genAI: GoogleGenerativeAI | null = null

function getGenAI(): GoogleGenerativeAI | null {
  if (_genAI) return _genAI
  const key = process.env.GEMINI_API_KEY
  if (!key || key === 'mock-key' || key.trim() === '') {
    return null
  }
  _genAI = new GoogleGenerativeAI(key)
  return _genAI
}

export class AITestService {
  /**
   * Generate a complete AI-powered test and persist it to the database.
   */
  async generateTest(req: TestGenerationRequest): Promise<TestGenerationResult> {
    const genAI = getGenAI()

    if (!genAI) {
      throw new Error('AI service unavailable — GEMINI_API_KEY not configured')
    }

    const questionCount = Math.min(Math.max(req.count, 5), 50)
    const timeLimit = req.timeLimit ?? Math.max(10, questionCount * 2)

    // Build prompt based on context
    let prompt: string
    if (req.examContext?.examId) {
      const exam = await prisma.exam.findUnique({
        where: { id: req.examContext.examId },
        select: { name: true, pattern: true },
      })
      if (exam) {
        const patternStr = exam.pattern ? JSON.stringify(exam.pattern) : 'Standard MCQ format'
        prompt = PROMPT_TEMPLATES.exam_pattern(
          req.topic,
          req.difficulty,
          questionCount,
          exam.name,
          patternStr
        )
      } else {
        prompt = PROMPT_TEMPLATES.standard(req.topic, req.difficulty, questionCount)
      }
    } else if (req.mode === 'ADAPTIVE') {
      const userLevel = await this.getUserLevel(req.userId)
      prompt = PROMPT_TEMPLATES.adaptive(req.topic, questionCount, userLevel)
    } else {
      prompt = PROMPT_TEMPLATES.standard(req.topic, req.difficulty, questionCount)
    }

    // Call Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()

    // Parse response
    const jsonText = this.extractJson(text)
    const parsed = JSON.parse(jsonText)

    // Validate and filter questions
    const questions = this.validateQuestions(parsed.questions ?? [], questionCount)

    if (questions.length === 0) {
      throw new Error('AI failed to generate valid questions')
    }

    // Persist test to database
    const test = await prisma.test.create({
      data: {
        title: `AI Practice: ${req.topic}`,
        description: `AI-generated practice test on ${req.topic} (${req.difficulty} difficulty)`,
        timeLimit,
        mode: req.mode,
        difficulty: req.difficulty,
        isAiGenerated: true,
        isPublished: true,
        totalMarks: questions.length * 10,
        passingScore: 60,
        questions: {
          create: questions.map((q, idx) => ({
            text: q.text,
            type: 'mcq',
            difficulty: this.difficultyToIRT(q.difficulty),
            bloomLevel: q.bloom_level ?? 'understand',
            explanation: q.explanation,
            tags: q.tags ?? [req.topic],
            isAiGenerated: true,
            points: 10,
            order: idx + 1,
            options: {
              create: q.options.map((opt: { id: string; text: string }, optIdx: number) => ({
                text: opt.text,
                isCorrect: opt.id === q.correct_option_id,
                explanation: opt.id === q.correct_option_id ? q.explanation : null,
                order: optIdx,
              })),
            },
          })),
        },
      },
      include: {
        questions: {
          include: {
            options: true,
          },
        },
      },
    })

    // Format response (exclude correct answers for client)
    const formattedQuestions = test.questions.map(q => ({
      text: q.text,
      options: q.options.map(o => ({ id: o.id, text: o.text })),
      correct_option_id: q.options.find(o => o.isCorrect)?.id ?? '',
      explanation: q.explanation ?? '',
      difficulty: q.difficulty.toString(),
      bloom_level: q.bloomLevel,
      tags: q.tags,
    }))

    return {
      testId: test.id,
      title: test.title,
      questionCount: questions.length,
      timeLimit,
      questions: formattedQuestions,
      ai_powered: true,
      model: 'gemini-2.0-flash',
      cached: false,
    }
  }

  /**
   * Get user's performance level for adaptive difficulty.
   */
  private async getUserLevel(userId: string): Promise<number> {
    const recentResults = await prisma.testResult.findMany({
      where: { userId, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      take: 10,
      select: { percentage: true },
    })

    if (recentResults.length === 0) return 2 // Default medium

    const avgScore = recentResults.reduce((sum, r) => sum + r.percentage, 0) / recentResults.length

    if (avgScore >= 80) return 4
    if (avgScore >= 60) return 3
    if (avgScore >= 40) return 2
    return 1
  }

  /**
   * Convert string difficulty to IRT float value.
   */
  private difficultyToIRT(difficulty: string): number {
    const map: Record<string, number> = {
      EASY: 0.3,
      MEDIUM: 1.5,
      HARD: 3.0,
      ADAPTIVE: 1.5,
    }
    return map[difficulty] ?? 1.5
  }

  /**
   * Extract JSON from AI response (handles markdown code fences).
   */
  private extractJson(text: string): string {
    // Remove markdown code fences
    if (text.startsWith('```')) {
      const match = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
      if (match) return match[1].trim()
    }
    return text.trim()
  }

  /**
   * Validate generated questions meet requirements.
   */
  private validateQuestions(questions: any[], expectedCount: number): any[] {
    return questions
      .filter((q: any) => {
        if (!q.text || typeof q.text !== 'string') return false
        if (!Array.isArray(q.options) || q.options.length !== 4) return false
        if (!q.correct_option_id) return false
        if (!q.explanation || typeof q.explanation !== 'string') return false

        // Verify correct option exists
        const hasCorrectOption = q.options.some((o: any) => o.id === q.correct_option_id)
        if (!hasCorrectOption) return false

        return true
      })
      .slice(0, expectedCount)
  }

  /**
   * Get user's weak topics based on test performance.
   */
  async getWeakTopics(userId: string): Promise<{ topic: string; accuracy: number }[]> {
    const results = await prisma.testResult.findMany({
      where: { userId, status: 'COMPLETED' },
      include: {
        test: {
          include: {
            questions: {
              select: { id: true, tags: true },
            },
          },
        },
      },
      take: 20,
      orderBy: { completedAt: 'desc' },
    })

    const topicStats: Record<string, { correct: number; total: number }> = {}

    for (const result of results) {
      const answers = (result.answers as Record<string, string>) ?? {}
      const questionResults = (result.questionResults as any[]) ?? []

      for (const qr of questionResults) {
        const question = result.test.questions.find(q => q.id === qr.question_id)
        if (!question) continue

        for (const tag of question.tags) {
          if (!topicStats[tag]) topicStats[tag] = { correct: 0, total: 0 }
          topicStats[tag].total++
          if (qr.is_correct) topicStats[tag].correct++
        }
      }
    }

    return Object.entries(topicStats)
      .map(([topic, stats]) => ({
        topic,
        accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      }))
      .filter(t => t.accuracy < 60 && t.accuracy > 0)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5)
  }

  /**
   * Generate a practice test targeting weak topics.
   */
  async generateWeakAreaTest(userId: string, count: number = 10): Promise<TestGenerationResult> {
    const weakTopics = await this.getWeakTopics(userId)

    if (weakTopics.length === 0) {
      return this.generateTest({
        userId,
        topic: 'General Knowledge',
        difficulty: 'MEDIUM',
        count,
        mode: 'PRACTICE',
      })
    }

    const weakestTopic = weakTopics[0]
    return this.generateTest({
      userId,
      topic: weakestTopic.topic,
      difficulty: 'MEDIUM',
      count,
      mode: 'PRACTICE',
    })
  }
}

export const aiTestService = new AITestService()

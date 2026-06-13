import { prisma } from '../../prismaClient'
import { AIServiceFactory } from './AIServiceFactory'
import logger from '../../utils/logger'
import { cacheService } from '../CacheService'

export interface LearningPathNode {
  title: string
  description: string
  resources: string[]
}

export interface AICodeReviewResult {
  timeComplexity: string
  spaceComplexity: string
  vulnerabilities: string[]
  optimizationHints: string[]
  overallFeedback: string
}

export class AILearningService {
  async buildLearningContext(userId: string): Promise<string> {
    try {
      const [user, completedCourses, recentTests] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { username: true, xp: true, level: true, streak: true },
        }),
        prisma.userProgress.count({ where: { userId, status: 'COMPLETED' } }),
        prisma.testResult.findMany({
          where: { userId, status: 'COMPLETED' },
          orderBy: { completedAt: 'desc' },
          take: 5,
          select: { percentage: true, passed: true, test: { select: { title: true } } },
        }),
      ])

      const avgScore =
        recentTests.length > 0
          ? Math.round(recentTests.reduce((s, r) => s + r.percentage, 0) / recentTests.length)
          : null

      return [
        `Student: ${user?.username ?? 'Learner'}`,
        `Level: ${user?.level ?? 1} | XP: ${user?.xp ?? 0} | Streak: ${user?.streak ?? 0} days`,
        `Completed courses: ${completedCourses}`,
        avgScore !== null ? `Recent test average: ${avgScore}%` : '',
      ]
        .filter(Boolean)
        .join('\n')
    } catch {
      return ''
    }
  }

  async analyzeLearningPath(userId: string) {
    const cacheKey = `ai:learningPath:${userId}`
    const cachedAnalysis = await cacheService.get(cacheKey)
    if (cachedAnalysis) {
      return cachedAnalysis
    }

    const [completedCourses, inProgressCourses, testResults, weakTopics] = await Promise.all([
      prisma.userProgress.findMany({
        where: { userId, status: 'COMPLETED' },
        include: { course: { select: { title: true, category: true, difficulty: true } } },
        take: 10,
      }),
      prisma.userProgress.findMany({
        where: { userId, status: 'IN_PROGRESS' },
        include: { course: { select: { title: true, category: true } } },
        take: 5,
      }),
      prisma.testResult.findMany({
        where: { userId, status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        take: 10,
        select: {
          percentage: true,
          passed: true,
          test: { select: { title: true, difficulty: true } },
        },
      }),
      prisma.testResult.findMany({
        where: { userId, status: 'COMPLETED', percentage: { lt: 50 } },
        orderBy: { completedAt: 'desc' },
        take: 5,
        select: { test: { select: { title: true } }, percentage: true },
      }),
    ])

    const avgScore =
      testResults.length > 0
        ? Math.round(testResults.reduce((s, r) => s + r.percentage, 0) / testResults.length)
        : 0
    const passRate =
      testResults.length > 0
        ? Math.round((testResults.filter(r => r.passed).length / testResults.length) * 100)
        : 0

    const prompt = `
You are a personalised learning coach for an edtech platform.

Student data:
- Completed courses: ${completedCourses.map(c => `${c.course.title} (${c.course.difficulty})`).join(', ') || 'None yet'}
- In-progress courses: ${inProgressCourses.map(c => c.course.title).join(', ') || 'None'}
- Recent test scores: ${testResults.map(r => `${r.test.title}: ${Math.round(r.percentage)}%`).join(', ') || 'No tests taken'}
- Struggling areas (< 50%): ${weakTopics.map(t => `${t.test.title} (${Math.round(t.percentage)}%)`).join(', ') || 'None identified'}

Respond with ONLY valid JSON (no markdown):
{
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2"],
  "recommendation": "One actionable sentence",
  "next_steps": ["step1", "step2", "step3"]
}
`

    let finalResult: any
    try {
      const ai = AIServiceFactory.getAgent()
      const analysis = await ai.generateJSON<Record<string, any>>(prompt, {
        model: 'gemini-2.0-flash',
      })
      finalResult = { ...analysis, ai_powered: true }
    } catch (aiError) {
      logger.error(
        '[AILearningService] AI generation failed, falling back to basic analysis',
        aiError instanceof Error ? aiError : new Error(String(aiError))
      )
      finalResult = {
        strengths: completedCourses.map(c => c.course.title).slice(0, 3),
        weaknesses: weakTopics.map(t => t.test.title).slice(0, 3),
        recommendation:
          inProgressCourses.length > 0
            ? `Continue with "${inProgressCourses[0].course.title}" to maintain momentum.`
            : 'Enrol in a new course to keep progressing.',
        stats: {
          avg_score: avgScore,
          pass_rate: passRate,
          completed_courses: completedCourses.length,
        },
        ai_powered: false,
      }
    }

    // Cache the result for 24 hours (86400 seconds) to avoid LLM rate limit and billing bloat
    await cacheService.set(cacheKey, finalResult, 86400)
    return finalResult
  }

  async getChatSessions(userId: string) {
    return prisma.aIChatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  async getChatSessionById(userId: string, sessionId: string) {
    const session = await prisma.aIChatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (session?.userId !== userId) {
      throw new Error('Session not found')
    }

    return session
  }

  async createChatSession(userId: string, title: string) {
    return prisma.aIChatSession.create({
      data: {
        userId,
        title,
      },
    })
  }

  async deleteChatSession(userId: string, sessionId: string) {
    const session = await prisma.aIChatSession.findUnique({
      where: { id: sessionId },
    })

    if (session?.userId !== userId) {
      throw new Error('Session not found')
    }

    await prisma.aIChatSession.delete({
      where: { id: sessionId },
    })

    return { success: true }
  }

  async getTutorResponse(userId: string, message: string, courseId?: string, sessionId?: string) {
    const userContext = await this.buildLearningContext(userId)
    let courseContext = ''
    if (courseId) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { title: true, description: true, category: true },
      })
      if (course) {
        courseContext = `\nCurrent course: ${course.title} (${course.category})\n${course.description?.substring(0, 300)}`
      }
    }

    const systemPrompt = `You are an expert AI Tutor for LearningHub, an edtech platform.

Your traits:
- Encouraging, precise, and deeply knowledgeable
- Explain complex topics simply without dumbing them down
- Use analogies and concrete examples
- Always respond in the same language as the student's question
- Keep responses focused and under 400 words unless a detailed explanation is explicitly needed
- Format code with proper markdown code blocks

Student context:
${userContext}${courseContext}

If you don't know something, say so honestly rather than guessing.`

    let history: { role: 'user' | 'assistant' | 'system'; content: string }[] = []
    
    if (sessionId) {
      const pastMessages = await prisma.aIChatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        take: 20, // Keep context window manageable
      })
      
      history = pastMessages.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content
      }))
    }

    try {
      const ai = AIServiceFactory.getAgent()
      const result = await ai.generateChat(
        [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: message },
        ],
        { model: 'gemini-2.0-flash' }
      )

      const response = {
        response: result.text,
        usage: result.usage
          ? {
              prompt_tokens: result.usage.promptTokens,
              completion_tokens: result.usage.completionTokens,
              total_tokens: result.usage.totalTokens,
            }
          : undefined,
        model: 'gemini-2.0-flash',
        ai_powered: true,
      }

      if (sessionId) {
        Promise.all([
          prisma.aIChatMessage.create({
            data: {
              sessionId,
              role: 'user',
              content: message,
            },
          }),
          prisma.aIChatMessage.create({
            data: {
              sessionId,
              role: 'assistant',
              content: result.text,
              metadata: response as any,
            },
          }),
          prisma.aIChatSession.update({
            where: { id: sessionId },
            data: { updatedAt: new Date() },
          }),
        ]).catch(e => logger.error('[AILearningService] Failed to save chat messages', e))
      }

      return response
    } catch (aiError) {
      logger.error(
        '[AILearningService] AI Tutor failed',
        aiError instanceof Error ? aiError : new Error(String(aiError))
      )
      return {
        response:
          'The AI tutor is currently unavailable. Please check the course materials or contact support.',
        model: 'unavailable',
        ai_powered: false,
      }
    }
  }

  async *getTutorResponseStream(
    userId: string,
    message: string,
    courseId?: string,
    sessionId?: string
  ) {
    const userContext = await this.buildLearningContext(userId)
    let courseContext = ''
    if (courseId) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { title: true, description: true, category: true },
      })
      if (course) {
        courseContext = `\nCurrent course: ${course.title} (${course.category})\n${course.description?.substring(0, 300)}`
      }
    }

    const systemPrompt = `You are an expert AI Tutor for LearningHub, an edtech platform.

Your traits:
- Encouraging, precise, and deeply knowledgeable
- Explain complex topics simply without dumbing them down
- Use analogies and concrete examples
- Always respond in the same language as the student's question
- Keep responses focused and under 400 words unless a detailed explanation is explicitly needed
- Format code with proper markdown code blocks

Student context:
${userContext}${courseContext}

If you don't know something, say so honestly rather than guessing.`

    let history: { role: 'user' | 'assistant' | 'system'; content: string }[] = []
    
    if (sessionId) {
      const pastMessages = await prisma.aIChatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        take: 20, // Limit history to last 20 messages for context
      })
      
      history = pastMessages.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content
      }))
    }

    try {
      const ai = AIServiceFactory.getAgent()
      if (!ai.generateChatStream) {
        throw new Error('Streaming is not supported by this AI adapter')
      }

      const stream = ai.generateChatStream(
        [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: message },
        ],
        { model: 'gemini-2.0-flash' }
      )

      let fullResponse = ''
      for await (const chunk of stream) {
        fullResponse += chunk
        yield chunk
      }

      if (sessionId) {
        const sid = sessionId
        // Save messages in background
        Promise.all([
          prisma.aIChatMessage.create({
            data: {
              sessionId: sid,
              role: 'user',
              content: message,
            },
          }),
          prisma.aIChatMessage.create({
            data: {
              sessionId: sid,
              role: 'assistant',
              content: fullResponse,
              metadata: { ai_powered: true, model: 'gemini-2.0-flash' },
            },
          }),
          prisma.aIChatSession.update({
            where: { id: sid },
            data: { updatedAt: new Date() },
          }),
        ]).catch(e => logger.error('[AILearningService] Failed to save streaming chat messages', e))
      }
    } catch (aiError) {
      logger.error(
        '[AILearningService] AI Tutor Stream failed',
        aiError instanceof Error ? aiError : new Error(String(aiError))
      )
      yield 'The AI tutor is currently unavailable. Please check the course materials or contact support.'
    }
  }

  async generateCourse(userId: string, prompt: string, difficulty: string, modulesCount: number) {
    const systemInstruction = `You are a world-class curriculum designer and course creator.
You are tasked with generating a fully complete Course curriculum based on a user prompt.
You must return ONLY a raw JSON object (without markdown code blocks like \`\`\`json) matching exactly this schema:
{
  "title": "String",
  "description": "String (engaging, 3-4 paragraphs)",
  "shortDescription": "String (1 sentence)",
  "category": "String (e.g. Programming, Marketing, Design)",
  "duration": number (total minutes estimated),
  "price": number (e.g. 0, 49.99),
  "modules": [
    {
      "title": "String",
      "lessons": [
        {
          "title": "String",
          "description": "String (brief)",
          "content": "String (Extremely detailed Markdown content for the lesson, minimum 500 words, including examples, code snippets if technical, and formatting)",
          "duration": number (minutes estimated)
        }
      ]
    }
  ]
}

Ensure that you generate EXACTLY ${Math.min(modulesCount, 8)} modules.
Each module should have 2-4 comprehensive lessons.
The difficulty requested is ${difficulty.toUpperCase()}.
Do not include any text outside the JSON. Ensure JSON is strictly valid.`

    const ai = AIServiceFactory.getAgent()

    // We use generateJSON to force structured output
    const courseData = await ai.generateJSON<any>(
      `System Instruction:\n${systemInstruction}\n\nUser Request:\nTopic: ${prompt}`,
      { model: 'gemini-2.0-flash', maxTokens: 8192 }
    )

    // Persist to database atomically
    const newCourse = await prisma.$transaction(async tx => {
      const course = await tx.course.create({
        data: {
          title: courseData.title,
          description: courseData.description,
          shortDescription: courseData.shortDescription,
          category: courseData.category,
          difficulty: difficulty.toUpperCase() as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
          phase: 'FOUNDATION', // Default
          duration: courseData.duration ?? 120,
          price: courseData.price ?? 0,
          content: 'Auto-generated syllabus overview',
          isPublished: false,
          instructorId: userId,
        },
      })

      for (let mIdx = 0; mIdx < courseData.modules.length; mIdx++) {
        const mod = courseData.modules[mIdx]
        const moduleRecord = await tx.module.create({
          data: {
            courseId: course.id,
            title: mod.title,
            order: mIdx + 1,
          },
        })

        for (let lIdx = 0; lIdx < mod.lessons.length; lIdx++) {
          const less = mod.lessons[lIdx]
          await tx.lesson.create({
            data: {
              moduleId: moduleRecord.id,
              title: less.title,
              description: less.description,
              content: less.content,
              duration: less.duration ?? 15,
              order: lIdx + 1,
              isFree: lIdx === 0 && mIdx === 0, // Make first lesson free
            },
          })
        }
      }

      return course
    })

    return newCourse
  }

  /**
   * ML Code Review Pipeline
   * Takes raw code and performs static/dynamic algorithmic analysis via Gemini
   */
  async reviewCode(
    userId: string,
    code: string,
    language: string,
    problemDescription: string
  ): Promise<AICodeReviewResult> {
    try {
      const adapter = AIServiceFactory.getAgent()
      
      const prompt = `
      You are an elite Senior Staff Software Engineer and Security Auditor.
      Perform a deep algorithmic and security review of the following student submission.
      
      Language: ${language}
      Problem Context: ${problemDescription}
      
      Code to Review:
      \`\`\`${language}
      ${code}
      \`\`\`
      
      Analyze the Time Complexity (Big-O), Space Complexity (Big-O), detect any potential vulnerabilities or logical edge cases, and provide concise optimization hints.
      Respond strictly in the following JSON schema:
      {
        "timeComplexity": "O(N)",
        "spaceComplexity": "O(1)",
        "vulnerabilities": ["array out of bounds if empty", ...],
        "optimizationHints": ["use a hash map instead of nested loops", ...],
        "overallFeedback": "Great attempt, but fails on large inputs."
      }
      `

      const result = await adapter.generateText(prompt, {
        temperature: 0.2, // Low temp for deterministic logic analysis
        maxTokens: 1000,
      })

      // Strip markdown code block wrappers if Gemini adds them
      const cleanJson = result.text.replace(/```json/g, '').replace(/```/g, '').trim()
      
      try {
        const parsed = JSON.parse(cleanJson) as AICodeReviewResult
        return parsed
      } catch (parseError) {
        logger.error('[AILearningService] Failed to parse code review JSON', new Error(result.text))
        return {
          timeComplexity: "Unknown",
          spaceComplexity: "Unknown",
          vulnerabilities: [],
          optimizationHints: ["Error parsing AI response"],
          overallFeedback: result.text
        }
      }
    } catch (error) {
      logger.error('[AILearningService] Code review failed', error instanceof Error ? error : new Error(String(error)))
      throw new Error('AI Code Review failed')
    }
  }
}

export const aiLearningService = new AILearningService()

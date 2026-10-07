import { Request, Response } from 'express'
import { aiTestService } from '../services/AITestService'
import { aiLearningService } from '../services/ai/AILearningService'
import type { TutorContext } from '../services/ai/AILearningService'
import { asyncHandler } from '../utils/errorHandler'
import { sendSuccess, sendValidationError, sendInternalError } from '../utils/responseHelper'
import logger from '../utils/logger'
import { multiAgentCouncilService } from '../services/ai/MultiAgentCouncilService'

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/v1/ai/learning-path
 */
export const analyzeLearningPath = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId
    const analysis = await aiLearningService.analyzeLearningPath(userId)
    sendSuccess(res, analysis)
  }
)

/**
 * POST /api/v1/ai/tutor
 */
export const getTutorResponse = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const { message, context } = req.body

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    sendValidationError(res, 'Message is required')
    return
  }

  const sanitizedMessage = message.trim().substring(0, 2000)

  const tutorContext: TutorContext | undefined = context
    ? {
        course_id: context.course_id,
        question_text: context.question_text,
        options: Array.isArray(context.options) ? context.options : undefined,
        selected_option: context.selected_option,
        problem_title: context.problem_title,
        problem_description: context.problem_description,
        user_code:
          typeof context.user_code === 'string' ? context.user_code.substring(0, 5000) : undefined,
        language: context.language,
        is_review: context.is_review === true,
      }
    : undefined

  const result = await aiLearningService.getTutorResponse(
    userId,
    sanitizedMessage,
    tutorContext,
    req.body.session_id
  )

  sendSuccess(res, result)
})

/**
 * POST /api/v1/ai/tutor/stream
 */
export const getTutorResponseStream = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId
    const { message, context } = req.body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      sendValidationError(res, 'Message is required')
      return
    }

    const sanitizedMessage = message.trim().substring(0, 2000)

    const tutorContext: TutorContext | undefined = context
      ? {
          course_id: context.course_id,
          question_text: context.question_text,
          options: Array.isArray(context.options) ? context.options : undefined,
          selected_option: context.selected_option,
          problem_title: context.problem_title,
          problem_description: context.problem_description,
          user_code:
            typeof context.user_code === 'string'
              ? context.user_code.substring(0, 5000)
              : undefined,
          language: context.language,
          is_review: context.is_review === true,
        }
      : undefined

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering if proxied
    })

    // AbortController for client disconnect detection
    const abortController = new AbortController()
    const onClose = () => {
      abortController.abort()
      logger.debug('[AIController] Client disconnected from SSE stream')
    }
    req.on('close', onClose)

    try {
      const stream = aiLearningService.getTutorResponseStream(
        userId,
        sanitizedMessage,
        tutorContext,
        req.body.session_id,
        abortController.signal
      )

      for await (const chunk of stream) {
        if (abortController.signal.aborted) break
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`)
        // Flush for compression middleware compatibility
        if (typeof (res as any).flush === 'function') {
          ;(res as any).flush()
        }
      }

      if (!abortController.signal.aborted) {
        res.write('data: [DONE]\n\n')
      }
      res.end()
    } catch (error) {
      logger.error(
        '[AIController] getTutorResponseStream error',
        error instanceof Error ? error : new Error(String(error))
      )
      if (!res.headersSent) {
        sendInternalError(res, 'Internal server error')
      } else {
        res.write(`data: ${JSON.stringify({ error: 'Internal server error' })}\n\n`)
        res.end()
      }
    } finally {
      req.off('close', onClose)
    }
  }
)

/**
 * POST /api/v1/ai/generate-test
 */
export const generatePracticeTest = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId
    const {
      topic,
      difficulty = 'MEDIUM',
      count = 10,
      mode = 'PRACTICE',
      ai_mode,
      aiMode,
      question_source,
      questionSource,
      exam_context,
      time_limit,
    } = req.body

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      sendValidationError(res, 'Topic is required')
      return
    }

    const rawMode = (typeof mode === 'string' ? mode : 'PRACTICE').toUpperCase()
    const validModes = ['PRACTICE', 'MOCK', 'TIMED_CHALLENGE', 'ADAPTIVE'] as const
    const resolvedMode = (validModes as readonly string[]).includes(rawMode)
      ? (rawMode as (typeof validModes)[number])
      : 'PRACTICE'

    const rawDifficulty = (typeof difficulty === 'string' ? difficulty : 'MEDIUM').toUpperCase()
    const validDifficulties = ['EASY', 'MEDIUM', 'HARD', 'MIXED', 'ADAPTIVE'] as const
    const resolvedDifficulty = (validDifficulties as readonly string[]).includes(rawDifficulty)
      ? (rawDifficulty as (typeof validDifficulties)[number])
      : 'MEDIUM'

    // Accept both snake_case and camelCase for AI mode
    const resolvedAIMode = (ai_mode ?? aiMode ?? 'AI_OPTIONAL').toString().toUpperCase()
    const validAIModes = ['NO_AI', 'AI_OPTIONAL', 'AI_REQUIRED', 'HYBRID'] as const
    const finalAIMode = (validAIModes as readonly string[]).includes(resolvedAIMode)
      ? (resolvedAIMode as (typeof validAIModes)[number])
      : 'AI_OPTIONAL'

    const resolvedQuestionSource = (question_source ?? questionSource ?? 'AI_GENERATED')
      .toString()
      .toUpperCase()
    const validSources = ['MANUAL', 'DATABASE', 'IMPORT', 'AI_GENERATED', 'HYBRID'] as const
    const finalQuestionSource = (validSources as readonly string[]).includes(resolvedQuestionSource)
      ? (resolvedQuestionSource as (typeof validSources)[number])
      : 'AI_GENERATED'

    const params = {
      userId,
      topic: topic.trim().substring(0, 500),
      difficulty: resolvedDifficulty,
      count: Math.min(Math.max(parseInt(String(count), 10) || 10, 5), 50),
      mode: resolvedMode,
      aiMode: finalAIMode,
      questionSource: finalQuestionSource,
      examContext: exam_context,
      timeLimit: time_limit,
    }

    const { async: isAsync } = req.body

    if (isAsync) {
      const { jobQueueService } = await import('../services/JobQueueService')
      await jobQueueService.addAIJob({
        userId,
        operation: 'GENERATE_PRACTICE_TEST',
        params,
      })
      sendSuccess(res, {
        message: 'Test generation queued. You will be notified when it completes.',
        isAsync: true,
      })
      return
    }

    try {
      const result = await aiTestService.generateTest(params)
      sendSuccess(res, result)
    } catch (err) {
      // If AI fails AND mode allows fallback, try question bank
      if (params.aiMode === 'AI_OPTIONAL' || params.aiMode === 'HYBRID' || params.aiMode === 'NO_AI') {
        logger.warn('[AIController] AI generation failed, falling back to question bank', {
          aiMode: params.aiMode,
          error: err instanceof Error ? err.message : String(err),
        })
        try {
          const fallbackResult = await aiTestService.generateTest({
            ...params,
            aiMode: 'NO_AI', // force NO_AI fallback path
          })
          sendSuccess(res, fallbackResult)
          return
        } catch (fallbackErr) {
          logger.error(
            '[AIController] Fallback also failed',
            fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr))
          )
        }
      }
      // Re-throw to be handled by error middleware
      throw err
    }
  }
)

/**
 * POST /api/v1/ai/generate-weak-area-test
 */
export const generateWeakAreaTest = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId
    const { count = 10 } = req.body

    const result = await aiTestService.generateWeakAreaTest(
      userId,
      Math.min(Math.max(parseInt(String(count), 10) || 10, 5), 50)
    )

    sendSuccess(res, result)
  }
)

/**
 * GET /api/v1/ai/weak-topics
 */
export const getWeakTopics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const weakTopics = await aiTestService.getWeakTopics(userId)
  sendSuccess(res, { weak_topics: weakTopics })
})

/**
 * POST /api/v1/ai/code-review
 */
export const reviewCodeSubmission = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId
    const { code, language, problemDescription } = req.body

    if (
      !code ||
      !language ||
      !problemDescription ||
      typeof code !== 'string' ||
      typeof language !== 'string' ||
      typeof problemDescription !== 'string'
    ) {
      sendValidationError(res, 'Code, language, and problemDescription must be non-empty strings')
      return
    }

    const sanitizedCode = code.trim().substring(0, 50000)
    const sanitizedLanguage = language.trim().substring(0, 100)
    const sanitizedProblemDescription = problemDescription.trim().substring(0, 5000)

    const reviewResult = await aiLearningService.reviewCode(
      userId,
      sanitizedCode,
      sanitizedLanguage,
      sanitizedProblemDescription
    )

    sendSuccess(res, reviewResult)
  }
)

/**
 * GET /api/v1/ai/tutor/sessions
 */
export const getChatSessions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const sessions = await aiLearningService.getChatSessions(userId)
  sendSuccess(res, sessions)
})

/**
 * GET /api/v1/ai/tutor/sessions/:id
 */
export const getChatSessionById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId
    const sessionId = req.params.id as string

    if (!sessionId) {
      sendValidationError(res, 'Session ID is required')
      return
    }

    const session = await aiLearningService.getChatSessionById(userId, sessionId)
    sendSuccess(res, session)
  }
)

/**
 * POST /api/v1/ai/tutor/sessions
 */
export const createChatSession = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId
    const { title } = req.body

    const session = await aiLearningService.createChatSession(
      userId,
      title ?? `Chat ${new Date().toLocaleDateString()}`
    )
    sendSuccess(res, session)
  }
)

/**
 * DELETE /api/v1/ai/tutor/sessions/:id
 */
export const deleteChatSession = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId
    const sessionId = req.params.id as string

    if (!sessionId) {
      sendValidationError(res, 'Session ID is required')
      return
    }

    await aiLearningService.deleteChatSession(userId, sessionId)
    sendSuccess(res, { success: true })
  }
)

/**
 * POST /api/v1/ai/council/consult
 */
export const consultCouncil = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId
    const { query, codeSnippet, language, problemTitle, problemDescription, studentLevel } = req.body

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      sendValidationError(res, 'Query is required')
      return
    }

    const result = await multiAgentCouncilService.consultCouncil({
      userId,
      query: query.trim(),
      codeSnippet: typeof codeSnippet === 'string' ? codeSnippet : undefined,
      language: typeof language === 'string' ? language : undefined,
      problemTitle: typeof problemTitle === 'string' ? problemTitle : undefined,
      problemDescription: typeof problemDescription === 'string' ? problemDescription : undefined,
      studentLevel: studentLevel || 'intermediate',
    })

    sendSuccess(res, result)
  }
)

/**
 * POST /api/v1/ai/council/specialist
 */
export const consultSpecialist = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId
    const { role, query, codeSnippet, language, problemTitle, studentLevel } = req.body

    if (!role || !['socratic_guide', 'code_reviewer', 'motivational_coach'].includes(role)) {
      sendValidationError(res, 'Valid specialist role is required')
      return
    }

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      sendValidationError(res, 'Query is required')
      return
    }

    const result = await multiAgentCouncilService.consultSpecialist(role, {
      userId,
      query: query.trim(),
      codeSnippet: typeof codeSnippet === 'string' ? codeSnippet : undefined,
      language: typeof language === 'string' ? language : undefined,
      problemTitle: typeof problemTitle === 'string' ? problemTitle : undefined,
      studentLevel: studentLevel || 'intermediate',
    })

    sendSuccess(res, result)
  }
)

/**
 * GET /api/v1/ai/models
 * Returns available AI models, highlighting free high-performance providers (Groq, Ollama, Gemini, Edge WebGPU).
 */
export const getAvailableAIModels = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const hasGroq = Boolean(process.env.GROQ_API_KEY)
    const hasGemini = Boolean(process.env.GEMINI_API_KEY)
    const hasOpenAI = Boolean(process.env.OPENAI_API_KEY)
    const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY)

    const modelCatalog = {
      defaultProvider: process.env.AI_PROVIDER || (hasGroq ? 'groq' : hasGemini ? 'gemini' : 'mock'),
      providers: [
        {
          id: 'groq',
          name: 'Groq Cloud LPU',
          description: 'Ultra-fast LPU inference (300-800 tok/s). Free tier available.',
          isConfigured: hasGroq,
          isFreeTier: true,
          models: [
            {
              id: 'deepseek-r1-distill-llama-70b',
              name: 'DeepSeek R1 (Distill 70B)',
              category: 'Deep Reasoning & Logic',
              speedFormatted: '500+ tok/s',
              isFree: true,
              recommendedFor: 'Complex math, algorithmic deduction & Socratic reasoning',
            },
            {
              id: 'llama-3.3-70b-versatile',
              name: 'Meta Llama 3.3 (70B)',
              category: 'Full-Stack Software Engineering',
              speedFormatted: '380 tok/s',
              isFree: true,
              recommendedFor: 'Full-stack coding, system architecture & code review',
            },
            {
              id: 'llama-3.1-8b-instant',
              name: 'Meta Llama 3.1 (8B Instant)',
              category: 'Instant Tutoring',
              speedFormatted: '850+ tok/s',
              isFree: true,
              recommendedFor: 'Sub-second conversational Q&A and hints',
            },
          ],
        },
        {
          id: 'gemini',
          name: 'Google Gemini Flash',
          description: 'Google multimodal high-speed models with generous free tier.',
          isConfigured: hasGemini,
          isFreeTier: true,
          models: [
            {
              id: 'gemini-1.5-flash',
              name: 'Gemini 1.5 Flash',
              category: 'Multimodal Long Context',
              speedFormatted: '150 tok/s',
              isFree: true,
              recommendedFor: 'Large codebases, document ingestion & explanations',
            },
            {
              id: 'gemini-2.0-flash',
              name: 'Gemini 2.0 Flash',
              category: 'Next-Gen Ultra Fast',
              speedFormatted: '220 tok/s',
              isFree: true,
              recommendedFor: 'Real-time conversational tutoring',
            },
          ],
        },
        {
          id: 'ollama',
          name: 'Local Ollama Engine',
          description: '100% Free, Private, Offline AI running directly on your laptop/workstation.',
          isConfigured: true,
          isFreeTier: true,
          isLocalOffline: true,
          defaultUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
          models: [
            {
              id: 'deepseek-r1:latest',
              name: 'DeepSeek R1 (Local)',
              category: 'Local Reasoning',
              isFree: true,
              isOffline: true,
            },
            {
              id: 'llama3.3:latest',
              name: 'Llama 3.3 (Local)',
              category: 'Local General Assistant',
              isFree: true,
              isOffline: true,
            },
            {
              id: 'qwen2.5-coder:latest',
              name: 'Qwen 2.5 Coder (Local)',
              category: 'Local Code Generation',
              isFree: true,
              isOffline: true,
            },
          ],
        },
        {
          id: 'edge_webgpu',
          name: 'Client-Side WebGPU Edge AI (Milestone 13)',
          description: 'Runs directly in your browser tab via WebGPU shaders. Zero server cost, zero latency, works completely offline.',
          isConfigured: true,
          isFreeTier: true,
          isInBrowser: true,
          isAirGapped: true,
          models: [
            {
              id: 'llama-3.2-1b-instruct',
              name: 'Llama 3.2 1B (WebGPU)',
              size: '1.2 GB',
              vram: '~1.8 GB VRAM',
              isFree: true,
              isOffline: true,
            },
            {
              id: 'qwen2.5-coder-1.5b',
              name: 'Qwen 2.5 Coder 1.5B (WebGPU)',
              size: '1.4 GB',
              vram: '~2.0 GB VRAM',
              isFree: true,
              isOffline: true,
            },
            {
              id: 'smollm2-360m',
              name: 'SmolLM2 360M (Instant WebGPU)',
              size: '390 MB',
              vram: '~600 MB VRAM',
              isFree: true,
              isOffline: true,
            },
          ],
        },
        {
          id: 'openai',
          name: 'OpenAI',
          description: 'Cloud proprietary models (API key required).',
          isConfigured: hasOpenAI,
          isFreeTier: false,
          models: [{ id: 'gpt-4o-mini', name: 'GPT-4o Mini', isFree: false }],
        },
        {
          id: 'anthropic',
          name: 'Anthropic Claude',
          description: 'Claude models (API key required).',
          isConfigured: hasAnthropic,
          isFreeTier: false,
          models: [{ id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', isFree: false }],
        },
      ],
    }

    sendSuccess(res, modelCatalog)
  }
)



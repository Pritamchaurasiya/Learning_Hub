import { Request, Response } from 'express'
import logger from '../utils/logger'
import { aiTestService } from '../services/AITestService'
import { aiLearningService } from '../services/ai/AILearningService'
import {
  sendSuccess,
  sendUnauthorized,
  sendValidationError,
  sendInternalError,
} from '../utils/responseHelper'

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/v1/ai/learning-path
 */
export const analyzeLearningPath = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res, 'Authentication required')
      return
    }

    const analysis = await aiLearningService.analyzeLearningPath(userId)
    sendSuccess(res, analysis)
  } catch (error) {
    logger.error(
      '[AIController] analyzeLearningPath error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res, 'Internal server error')
  }
}

/**
 * POST /api/v1/ai/tutor
 */
export const getTutorResponse = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res, 'Authentication required')
      return
    }

    const { message, context } = req.body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      sendValidationError(res, 'Message is required')
      return
    }

    const sanitizedMessage = message.trim().substring(0, 2000)
    const result = await aiLearningService.getTutorResponse(
      userId,
      sanitizedMessage,
      context?.course_id,
      req.body.session_id
    )

    sendSuccess(res, result)
  } catch (error) {
    logger.error(
      '[AIController] getTutorResponse error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res, 'Internal server error')
  }
}

/**
 * POST /api/v1/ai/tutor/stream
 */
export const getTutorResponseStream = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res, 'Authentication required')
      return
    }

    const { message, context } = req.body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      sendValidationError(res, 'Message is required')
      return
    }

    const sanitizedMessage = message.trim().substring(0, 2000)

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    })

    const stream = aiLearningService.getTutorResponseStream(
      userId,
      sanitizedMessage,
      context?.course_id,
      req.body.session_id
    )

    for await (const chunk of stream) {
      // Send SSE data payload
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`)
      // Try to flush immediately if possible
      if (res.flushHeaders) res.flushHeaders()
    }

    // End the SSE connection
    res.write('data: [DONE]\n\n')
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
  }
}

/**
 * POST /api/v1/ai/generate-test
 */
export const generatePracticeTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res, 'Authentication required')
      return
    }

    const {
      topic,
      difficulty = 'MEDIUM',
      count = 10,
      mode = 'PRACTICE',
      exam_context,
      time_limit,
    } = req.body

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      sendValidationError(res, 'Topic is required')
      return
    }

    const rawMode = (mode ?? 'PRACTICE').toUpperCase()
    const validModes = ['PRACTICE', 'MOCK', 'TIMED_CHALLENGE', 'ADAPTIVE'] as const
    const resolvedMode = (validModes as readonly string[]).includes(rawMode)
      ? (rawMode as (typeof validModes)[number])
      : 'PRACTICE'

    const result = await aiTestService.generateTest({
      userId,
      topic: topic.trim().substring(0, 500),
      difficulty: difficulty.toUpperCase() as 'EASY' | 'MEDIUM' | 'HARD',
      count: Math.min(Math.max(parseInt(String(count), 10) || 10, 5), 50),
      mode: resolvedMode,
      examContext: exam_context,
      timeLimit: time_limit,
    })

    sendSuccess(res, result)
  } catch (error) {
    logger.error(
      '[AIController] generatePracticeTest error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res, error instanceof Error ? error.message : 'Internal server error')
  }
}

/**
 * POST /api/v1/ai/generate-weak-area-test
 */
export const generateWeakAreaTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res, 'Authentication required')
      return
    }

    const { count = 10 } = req.body

    const result = await aiTestService.generateWeakAreaTest(
      userId,
      Math.min(Math.max(parseInt(String(count), 10) || 10, 5), 50)
    )

    sendSuccess(res, result)
  } catch (error) {
    logger.error(
      '[AIController] generateWeakAreaTest error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res, 'Internal server error')
  }
}

/**
 * GET /api/v1/ai/weak-topics
 */
export const getWeakTopics = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res, 'Authentication required')
      return
    }

    const weakTopics = await aiTestService.getWeakTopics(userId)

    sendSuccess(res, { weak_topics: weakTopics })
  } catch (error) {
    logger.error(
      '[AIController] getWeakTopics error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res, 'Internal server error')
  }
}

/**
 * POST /api/v1/ai/code-review
 */
export const reviewCodeSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res, 'Authentication required')
      return
    }

    const { code, language, problemDescription } = req.body

    if (!code || !language || !problemDescription) {
      sendValidationError(res, 'Code, language, and problemDescription are required')
      return
    }

    const sanitizedCode = code.trim().substring(0, 50000) // generous but bounded limit for code
    const sanitizedLanguage = language.trim().substring(0, 100)
    const sanitizedProblemDescription = problemDescription.trim().substring(0, 5000)

    const reviewResult = await aiLearningService.reviewCode(
      userId,
      sanitizedCode,
      sanitizedLanguage,
      sanitizedProblemDescription
    )

    sendSuccess(res, reviewResult)
  } catch (error) {
    logger.error(
      '[AIController] reviewCodeSubmission error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res, 'Internal server error')
  }
}

/**
 * POST /api/v1/admin/ai/generate-course
 */
export const generateCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res, 'Authentication required')
      return
    }

    const { prompt, difficulty = 'BEGINNER', modulesCount = 3 } = req.body

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      sendValidationError(res, 'Prompt/Topic is required')
      return
    }

    const sanitizedPrompt = prompt.trim().substring(0, 1000)

    const newCourse = await aiLearningService.generateCourse(
      userId,
      sanitizedPrompt,
      difficulty,
      modulesCount
    )
    sendSuccess(res, { courseId: newCourse.id, message: 'Course autonomously generated!' })
  } catch (error) {
    logger.error(
      '[AIController] generateCourse error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res, 'Course generation failed')
  }
}

/**
 * GET /api/v1/ai/tutor/sessions
 */
export const getChatSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res, 'Authentication required')
      return
    }

    const sessions = await aiLearningService.getChatSessions(userId)
    sendSuccess(res, sessions)
  } catch (error) {
    logger.error(
      '[AIController] getChatSessions error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res, 'Internal server error')
  }
}

/**
 * GET /api/v1/ai/tutor/sessions/:id
 */
export const getChatSessionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res, 'Authentication required')
      return
    }

    const sessionId = req.params.id as string
    if (!sessionId) {
      sendValidationError(res, 'Session ID is required')
      return
    }

    const session = await aiLearningService.getChatSessionById(userId, sessionId)
    sendSuccess(res, session)
  } catch (error) {
    logger.error(
      '[AIController] getChatSessionById error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res, error instanceof Error ? error.message : 'Internal server error')
  }
}

/**
 * POST /api/v1/ai/tutor/sessions
 */
export const createChatSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res, 'Authentication required')
      return
    }

    const { title } = req.body
    const session = await aiLearningService.createChatSession(
      userId,
      title ?? `Chat ${new Date().toLocaleDateString()}`
    )
    sendSuccess(res, session)
  } catch (error) {
    logger.error(
      '[AIController] createChatSession error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res, 'Internal server error')
  }
}

/**
 * DELETE /api/v1/ai/tutor/sessions/:id
 */
export const deleteChatSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res, 'Authentication required')
      return
    }

    const sessionId = req.params.id as string
    if (!sessionId) {
      sendValidationError(res, 'Session ID is required')
      return
    }

    await aiLearningService.deleteChatSession(userId, sessionId)
    sendSuccess(res, { success: true })
  } catch (error) {
    logger.error(
      '[AIController] deleteChatSession error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res, error instanceof Error ? error.message : 'Internal server error')
  }
}

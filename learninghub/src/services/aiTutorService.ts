/**
 * AI Tutor Service
 * Calls the real backend AI endpoints (Gemini-powered).
 * Falls back gracefully when the backend is unavailable.
 */
import { fetchApi } from '../utils/api'

export interface AIChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  metadata?: {
    sources?: string[]
    confidence?: number
    ai_powered?: boolean
    model?: string
  }
}

export interface AIChatSession {
  id: string
  title: string
  messages: AIChatMessage[]
  createdAt: string
  updatedAt: string
}

export interface AIRecommendation {
  id: string
  type: 'course' | 'lesson' | 'practice' | 'resource'
  title: string
  description: string
  reason: string
  relevance_score: number
  content_id?: string
}

export interface ChatHistoryResponse {
  status: string
  data: AIChatSession[]
  count: number
}

export interface ChatSessionResponse {
  status: string
  data: AIChatSession
}

export interface SendMessageResponse {
  status: string
  data: {
    message: AIChatMessage
    session: AIChatSession
  }
}

export interface RecommendationsResponse {
  status: string
  data: AIRecommendation[]
}

export interface ChatRequest {
  message: string
  session_id?: string
  context?: {
    course_id?: string
    lesson_id?: string
    topic?: string
    /** Rich context for context-aware AI tutor */
    question_text?: string
    options?: string[]
    selected_option?: string
    problem_title?: string
    problem_description?: string
    user_code?: string
    language?: string
    is_review?: boolean
  }
}

export interface GeneratedQuestion {
  id?: string
  text: string
  options: { id: string; text: string }[]
  correct_option_id: string
  explanation: string
  difficulty: string
  bloom_level: string
  points?: number
}

export interface GenerateTestResponse {
  status: string
  data: {
    testId: string
    test_id: string
    title: string
    topic?: string
    difficulty: string
    question_count: number
    questionCount: number
    time_limit: number
    timeLimit: number
    time_limit_minutes: number
    questions: GeneratedQuestion[]
    ai_powered: boolean
    model: string
    error?: string
  }
}

export interface AICodeReviewResult {
  timeComplexity: string
  spaceComplexity: string
  vulnerabilities: string[]
  optimizationHints: string[]
  overallFeedback: string
}

export interface CodeReviewResponse {
  status: string
  data: AICodeReviewResult
}

const toNumber = (value: unknown, fallback: number): number => {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const normalizeGeneratedTestResponse = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  response: any,
  fallbackTopic: string
): GenerateTestResponse => {
  const data = response?.data ?? {}
  const questions = Array.isArray(data.questions) ? data.questions : []
  const questionCount = toNumber(data.question_count ?? data.questionCount, questions.length)
  const timeLimit = toNumber(
    data.time_limit ?? data.timeLimit ?? data.time_limit_minutes,
    Math.max(10, questionCount * 2)
  )
  const testId = String(data.testId ?? data.test_id ?? '')

  return {
    status: response?.status ?? 'success',
    data: {
      ...data,
      testId,
      test_id: String(data.test_id ?? testId),
      title: String(
        data.title ?? (fallbackTopic ? `AI Practice: ${fallbackTopic}` : 'AI Practice')
      ),
      topic: data.topic ? String(data.topic) : fallbackTopic,
      difficulty: String(data.difficulty ?? 'medium').toLowerCase(),
      question_count: questionCount,
      questionCount,
      time_limit: timeLimit,
      timeLimit,
      time_limit_minutes: timeLimit,
      questions,
      ai_powered: data.ai_powered ?? false,
      model: String(data.model ?? 'unknown'),
    },
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────
export const aiTutorService = {
  getChatHistory: async (): Promise<ChatHistoryResponse> => {
    try {
      const res = await fetchApi('/ai/tutor/sessions')
      return res as ChatHistoryResponse
    } catch {
      return { status: 'error', data: [], count: 0 }
    }
  },

  getChatSession: async (sessionId: string): Promise<ChatSessionResponse> => {
    try {
      const res = await fetchApi(`/ai/tutor/sessions/${sessionId}`)
      return res as ChatSessionResponse
    } catch {
      return {
        status: 'error',
        data: { id: sessionId, title: 'Chat', messages: [], createdAt: '', updatedAt: '' },
      }
    }
  },

  createChatSession: async (title?: string): Promise<ChatSessionResponse> => {
    try {
      const res = await fetchApi('/ai/tutor/sessions', {
        method: 'POST',
        body: JSON.stringify({ title }),
      })
      return res as ChatSessionResponse
    } catch {
      return {
        status: 'error',
        data: {
          id: `local-${Date.now()}`,
          title: title ?? 'Chat',
          messages: [],
          createdAt: '',
          updatedAt: '',
        },
      }
    }
  },

  sendMessage: async (data: ChatRequest): Promise<SendMessageResponse> => {
    // Call the real backend AI tutor endpoint
    let responseContent: string
    let metadata: AIChatMessage['metadata']

    try {
      const res = await fetchApi('/ai/tutor', {
        method: 'POST',
        body: JSON.stringify({
          message: data.message,
          context: data.context,
        }),
      })

      if (res.status === 'success' && res.data?.response) {
        responseContent = res.data.response as string
        metadata = {
          sources: ['LearningHub AI Tutor'],
          confidence: 0.9,
          ai_powered: (res.data.ai_powered as boolean) ?? true,
          model: (res.data.model as string) ?? 'gemini-2.0-flash',
        }
      } else {
        throw new Error('Invalid response from AI backend')
      }
    } catch {
      // Graceful degradation — inform the user rather than silently failing
      const isOffline = !navigator.onLine
      responseContent = isOffline
        ? 'You appear to be offline. Please check your connection and try again.'
        : "I'm having trouble connecting to the AI service right now. Please try again in a moment."
      metadata = {
        sources: ['Fallback'],
        confidence: 0,
        ai_powered: false,
      }
    }

    const aiMessage: AIChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: responseContent,
      createdAt: new Date().toISOString(),
      metadata,
    }

    return {
      status: 'success',
      data: {
        message: aiMessage,
        session: {
          id: data.session_id ?? 'default',
          title: 'Chat',
          messages: [],
          createdAt: '',
          updatedAt: '',
        },
      },
    }
  },

  getRecommendations: async (): Promise<RecommendationsResponse> => {
    try {
      const res = await fetchApi('/ai/learning-path', { method: 'POST', body: JSON.stringify({}) })
      if (res.status === 'success' && res.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d = res.data as any
        const recs: AIRecommendation[] = []

        if (Array.isArray(d.next_steps)) {
          d.next_steps.forEach((step: unknown, i: number) => {
            const stepStr = String(step)
            recs.push({
              id: `rec-${i}`,
              type: 'practice',
              title: stepStr,
              description: stepStr,
              reason: d.recommendation ? String(d.recommendation) : '',
              relevance_score: 0.9 - i * 0.1,
            })
          })
        }

        return { status: 'success', data: recs }
      }
      return { status: 'success', data: [] }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[AITutor] getRecommendations failed:', error)
      }
      return { status: 'error', data: [] }
    }
  },

  explainConcept: async (concept: string, context?: string) => {
    try {
      const res = await fetchApi('/ai/tutor', {
        method: 'POST',
        body: JSON.stringify({
          message: `Explain ${concept}${context ? ` in context: ${context}` : ''}`,
        }),
      })
      return {
        status: 'success',
        data: { explanation: (res.data?.response as string) ?? '', examples: [] },
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[AITutor] explainConcept failed:', error)
      }
      return {
        status: 'error',
        data: { explanation: 'Failed to load explanation. Please try again.', examples: [] },
      }
    }
  },

  generatePracticeQuestions: async (
    topic: string,
    difficulty: 'easy' | 'medium' | 'hard',
    count: number = 5,
    asyncQueue: boolean = false
  ): Promise<GenerateTestResponse> => {
    try {
      const res = await fetchApi('/ai/generate-test', {
        method: 'POST',
        body: JSON.stringify({ topic, difficulty, count, async: asyncQueue }),
      })
      if (asyncQueue) {
        return res as unknown as GenerateTestResponse
      }
      return normalizeGeneratedTestResponse(res, topic)
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[AITutor] generatePracticeQuestions failed:', error)
      }
      return {
        status: 'error',
        data: {
          testId: '',
          test_id: '',
          title: '',
          topic,
          difficulty,
          question_count: 0,
          questionCount: 0,
          time_limit: 0,
          timeLimit: 0,
          time_limit_minutes: 0,
          questions: [],
          ai_powered: false,
          model: 'unavailable',
          error: 'Failed to generate questions',
        },
      }
    }
  },

  generateWeakAreaTest: async (count: number = 10): Promise<GenerateTestResponse> => {
    try {
      const res = await fetchApi('/ai/generate-weak-area-test', {
        method: 'POST',
        body: JSON.stringify({ count }),
      })
      return normalizeGeneratedTestResponse(res, 'Weak Areas')
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[AITutor] generateWeakAreaTest failed:', error)
      }
      return {
        status: 'error',
        data: {
          testId: '',
          test_id: '',
          title: 'Weak Areas',
          topic: 'Weak Areas',
          difficulty: 'mixed',
          question_count: 0,
          questionCount: 0,
          time_limit: 0,
          timeLimit: 0,
          time_limit_minutes: 0,
          questions: [],
          ai_powered: false,
          model: 'unavailable',
          error: 'Failed to generate questions',
        },
      }
    }
  },

  reviewCode: async (
    code: string,
    language: string,
    problemDescription: string
  ): Promise<CodeReviewResponse> => {
    try {
      const res = await fetchApi('/ai/code-review', {
        method: 'POST',
        body: JSON.stringify({ code, language, problemDescription }),
      })
      return res as CodeReviewResponse
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[AITutor] reviewCode failed:', error)
      }
      return {
        status: 'error',
        data: {
          timeComplexity: 'Unknown',
          spaceComplexity: 'Unknown',
          vulnerabilities: [],
          optimizationHints: [],
          overallFeedback: 'Failed to review code.',
        },
      }
    }
  },

  deleteChatSession: async (sessionId: string): Promise<{ status: string }> => {
    try {
      await fetchApi(`/ai/tutor/sessions/${sessionId}`, { method: 'DELETE' })
      return { status: 'success' }
    } catch {
      return { status: 'error' }
    }
  },
}

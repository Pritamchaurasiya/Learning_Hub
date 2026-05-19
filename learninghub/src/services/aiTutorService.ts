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
  timestamp: string
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
  created_at: string
  updated_at: string
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
  }
}

export interface GeneratedQuestion {
  text: string
  options: { id: string; text: string }[]
  correct_option_id: string
  explanation: string
  difficulty: string
  bloom_level: string
}

export interface GenerateTestResponse {
  status: string
  data: {
    topic: string
    difficulty: string
    question_count: number
    questions: GeneratedQuestion[]
    ai_powered: boolean
    model: string
  }
}

// ─── In-memory session store (client-side only, no persistence needed) ────────
const sessionStore = new Map<string, AIChatSession>()

function createSession(title?: string): AIChatSession {
  const id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const session: AIChatSession = {
    id,
    title: title ?? `Chat ${new Date().toLocaleDateString()}`,
    messages: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  sessionStore.set(id, session)
  return session
}

// ─── Service ──────────────────────────────────────────────────────────────────
export const aiTutorService = {
  getChatHistory: async (): Promise<ChatHistoryResponse> => {
    const sessions = Array.from(sessionStore.values()).sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
    return { status: 'success', data: sessions, count: sessions.length }
  },

  getChatSession: async (sessionId: string): Promise<ChatSessionResponse> => {
    const session = sessionStore.get(sessionId)
    if (session) {
      return { status: 'success', data: session }
    }
    // Session not found — create a fresh one
    const fresh = createSession()
    return { status: 'success', data: fresh }
  },

  createChatSession: async (title?: string): Promise<ChatSessionResponse> => {
    const session = createSession(title)
    return { status: 'success', data: session }
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
    } catch (err) {
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
      timestamp: new Date().toISOString(),
      metadata,
    }

    // Update session store
    const sessionId = data.session_id ?? 'default'
    const session = sessionStore.get(sessionId) ?? createSession()
    session.messages.push(aiMessage)
    session.updated_at = new Date().toISOString()
    // Always store under the requested sessionId to maintain key consistency
    sessionStore.set(sessionId, session)

    return {
      status: 'success',
      data: {
        message: aiMessage,
        session,
      },
    }
  },

  getRecommendations: async (): Promise<RecommendationsResponse> => {
    try {
      const res = await fetchApi('/ai/learning-path', { method: 'POST', body: JSON.stringify({}) })
      if (res.status === 'success' && res.data) {
        const d = res.data as any
        const recs: AIRecommendation[] = []

        if (d.next_steps) {
          ;(d.next_steps as string[]).forEach((step: string, i: number) => {
            recs.push({
              id: `rec-${i}`,
              type: 'practice',
              title: step,
              description: step,
              reason: d.recommendation ?? '',
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
    count: number = 5
  ): Promise<GenerateTestResponse> => {
    try {
      const res = await fetchApi('/ai/generate-test', {
        method: 'POST',
        body: JSON.stringify({ topic, difficulty, count }),
      })
      return res as GenerateTestResponse
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[AITutor] generatePracticeQuestions failed:', error)
      }
      return {
        status: 'error',
        data: { test_id: '', questions: [], error: 'Failed to generate questions' },
      } as unknown as GenerateTestResponse
    }
  },

  deleteChatSession: async (sessionId: string): Promise<{ status: string }> => {
    sessionStore.delete(sessionId)
    return { status: 'success' }
  },
}

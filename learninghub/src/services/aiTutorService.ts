import { fetchApi } from '../utils/api';

export interface AIChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  metadata?: {
    sources?: string[]
    confidence?: number
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

export const aiTutorService = {
  getChatHistory: async (): Promise<ChatHistoryResponse> => {
    // No persistent history; return empty
    return { status: 'success', data: [], count: 0 };
  },

  getChatSession: async (sessionId: string): Promise<ChatSessionResponse> => {
    return { status: 'success', data: { id: sessionId, title: '', messages: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() } };
  },

  createChatSession: async (title?: string): Promise<ChatSessionResponse> => {
    // Generate a simple session ID locally; no backend storage needed
    const sessionId = `session-${Date.now()}`;
    return {
      status: 'success',
      data: {
        id: sessionId,
        title: title || 'New Chat',
        messages: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    };
  },

  sendMessage: async (data: ChatRequest): Promise<SendMessageResponse> => {
    const response = await fetchApi('/ai/tutor', {
      method: 'POST',
      body: JSON.stringify({ message: data.message })
    });
    // Backend returns { response: string }
    const aiMessage: AIChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: (response.data?.response || response.response || 'I cannot help with that right now.'),
      timestamp: new Date().toISOString()
    };
    return {
      status: 'success',
      data: {
        message: aiMessage,
        session: {
          id: data.session_id || 'anon',
          title: '',
          messages: [aiMessage],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }
    };
  },

  getRecommendations: async (): Promise<RecommendationsResponse> => {
    // Not implemented
    return { status: 'success', data: [] };
  },

  explainConcept: async (concept: string, context?: string) => {
    const res = await fetchApi('/ai/tutor', {
      method: 'POST',
      body: JSON.stringify({ message: `Explain ${concept}${context ? ' in context: ' + context : ''}` })
    });
    return { status: 'success', data: { explanation: res.response || '', examples: [] } };
  },

  generatePracticeQuestions: async (_topic: string, _difficulty: 'easy' | 'medium' | 'hard', _count: number = 5) => {
    // Not implemented
    return { status: 'success', data: { questions: [] } };
  },

  deleteChatSession: async (_sessionId: string): Promise<{ status: string }> => {
    return { status: 'success' };
  }
};

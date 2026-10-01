import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '../test/test-utils'
import AITutorPage from './AITutorPage'

vi.mock('../services/aiTutorService', () => ({
  aiTutorService: {
    getChatHistory: vi.fn().mockResolvedValue({
      data: [{ id: 'sess-1', title: 'Python Closures', createdAt: new Date().toISOString() }],
    }),
    getChatSession: vi.fn().mockResolvedValue({
      data: {
        id: 'sess-1',
        title: 'Python Closures',
        messages: [
          {
            id: 'm1',
            role: 'assistant',
            content: 'Hello! I am your AI Tutor.',
            createdAt: new Date().toISOString(),
          },
        ],
      },
    }),
    createChatSession: vi.fn().mockResolvedValue({
      data: { id: 'sess-2', title: 'New Chat', createdAt: new Date().toISOString() },
    }),
    deleteChatSession: vi.fn().mockResolvedValue({ status: 204 }),
  },
}))

describe('AITutorPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders AI Tutor page header, session view, and quick actions', async () => {
    render(<AITutorPage />)

    const textarea = await screen.findByPlaceholderText(/Ask your tutor anything/i)
    expect(textarea).toBeDefined()
    expect(screen.getByLabelText(/voice recording/i)).toBeDefined()
  })

  it('allows typing a prompt and updates the textarea', async () => {
    render(<AITutorPage />)

    const textarea = await screen.findByPlaceholderText(/Ask your tutor anything/i)
    fireEvent.change(textarea, { target: { value: 'Explain quicksort in detail' } })
    expect((textarea as HTMLTextAreaElement).value).toBe('Explain quicksort in detail')
  })
})

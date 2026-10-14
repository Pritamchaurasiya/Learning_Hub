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

  it('toggles Socratic mode when Socratic button is clicked', async () => {
    render(<AITutorPage />)

    const socraticBtn = await screen.findByRole('button', { name: /socratic/i })
    expect(socraticBtn).toBeInTheDocument()
    fireEvent.click(socraticBtn)
    expect(screen.getByText(/socratic/i)).toBeInTheDocument()
  })

  it('opens AI Council modal when AI Council button is clicked', async () => {
    render(<AITutorPage />)

    const councilBtn = await screen.findByRole('button', { name: /ai council/i })
    expect(councilBtn).toBeInTheDocument()
    fireEvent.click(councilBtn)

    expect(await screen.findByText(/Multi-Agent Collaborative Tutor/i)).toBeInTheDocument()
  })
})

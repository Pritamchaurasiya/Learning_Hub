import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../test/test-utils'
import SupportPage from './SupportPage'

vi.mock('../services/supportService', () => ({
  supportService: {
    getTickets: vi.fn().mockResolvedValue([
      {
        id: 't-1',
        ticketNumber: 'LH-1001',
        subject: 'WASM Sandbox memory allocation question',
        category: 'Technical',
        priority: 'medium',
        status: 'open',
        description: 'Details about WASM.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
      },
    ]),
    createTicket: vi.fn().mockResolvedValue({
      id: 't-2',
      ticketNumber: 'LH-1002',
      status: 'open',
    }),
    replyToTicket: vi.fn().mockResolvedValue({
      id: 't-1',
      messages: [],
    }),
  },
}))

describe('SupportPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders FAQ questions and knowledge base title', async () => {
    render(<SupportPage />)
    expect(screen.getByText(/How Can We Assist Your Learning\?/i)).toBeInTheDocument()
    expect(screen.getByText(/Platform Knowledge Base & FAQs/i)).toBeInTheDocument()
  })

  it('switches to My Tickets tab and shows open ticket button', async () => {
    render(<SupportPage />)
    const ticketsBtn = screen.getByRole('button', { name: /My Tickets/i })
    fireEvent.click(ticketsBtn)
    await waitFor(() => {
      expect(screen.getByText(/Your Support Inquiries & Tickets/i)).toBeInTheDocument()
    })
  })
})

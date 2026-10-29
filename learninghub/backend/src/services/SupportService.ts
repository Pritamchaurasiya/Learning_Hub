import crypto from 'crypto'

export type TicketCategory = 'Technical' | 'Billing' | 'Content' | 'Account' | 'General'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export interface TicketMessage {
  id: string
  sender: 'user' | 'support' | 'ai_assistant'
  senderName: string
  text: string
  timestamp: string
}

export interface SupportTicket {
  id: string
  ticketNumber: string
  subject: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  description: string
  createdAt: string
  updatedAt: string
  messages: TicketMessage[]
}

export interface CreateTicketPayload {
  subject: string
  category: TicketCategory
  priority: TicketPriority
  description: string
}

const initialTickets: SupportTicket[] = [
  {
    id: 't-101',
    ticketNumber: 'LH-8821',
    subject: 'WebAssembly execution timeout on large C++ graph benchmark',
    category: 'Technical',
    priority: 'medium',
    status: 'in_progress',
    description:
      'When running a 100,000 node Dijkstra benchmark in Problem Workspace, the sandbox worker times out after 10 seconds.',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    messages: [
      {
        id: 'msg-1',
        sender: 'user',
        senderName: 'You',
        text: 'When running a 100,000 node Dijkstra benchmark, the sandbox worker times out.',
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: 'msg-2',
        sender: 'support',
        senderName: 'Alex (Support Engineer)',
        text: 'Hi there! We have increased the client-side WebAssembly execution buffer and memory limit to 256MB in the latest patch. Please refresh and verify.',
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
    ],
  },
  {
    id: 't-102',
    ticketNumber: 'LH-8822',
    subject: 'Proctoring webcam permissions on Safari / macOS Monterey',
    category: 'General',
    priority: 'low',
    status: 'resolved',
    description:
      'Webcam feed occasionally failed to bind before starting a timed exam on Safari 16.',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    messages: [
      {
        id: 'msg-3',
        sender: 'user',
        senderName: 'You',
        text: 'Camera stream gave NotAllowedError on initial start.',
        timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
      {
        id: 'msg-4',
        sender: 'support',
        senderName: 'Priya (Tech Support)',
        text: 'We updated the camera constraint fallback from 1080p to flexible 720p/480p fallback. Works reliably across all browsers now.',
        timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
    ],
  },
]

export class SupportService {
  private tickets: SupportTicket[] = [...initialTickets]

  async getTickets(): Promise<SupportTicket[]> {
    return this.tickets
  }

  async getTicketById(id: string): Promise<SupportTicket | null> {
    return this.tickets.find(t => t.id === id || t.ticketNumber === id) || null
  }

  async createTicket(payload: CreateTicketPayload): Promise<SupportTicket> {
    const newTicket: SupportTicket = {
      id: `t-${crypto.randomUUID().slice(0, 8)}`,
      ticketNumber: `LH-${Math.floor(1000 + Math.random() * 9000)}`,
      subject: payload.subject,
      category: payload.category,
      priority: payload.priority,
      status: 'open',
      description: payload.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender: 'user',
          senderName: 'You',
          text: payload.description,
          timestamp: new Date().toISOString(),
        },
      ],
    }
    this.tickets.unshift(newTicket)
    return newTicket
  }

  async replyToTicket(ticketId: string, message: string, senderName = 'You'): Promise<SupportTicket> {
    const ticket = this.tickets.find(t => t.id === ticketId || t.ticketNumber === ticketId)
    if (!ticket) throw new Error('Ticket not found')

    ticket.messages.push({
      id: `msg-${Date.now()}`,
      sender: 'user',
      senderName,
      text: message,
      timestamp: new Date().toISOString(),
    })
    ticket.updatedAt = new Date().toISOString()
    return ticket
  }
}

export const supportService = new SupportService()

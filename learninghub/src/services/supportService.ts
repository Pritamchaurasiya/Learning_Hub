/**
 * Support & Help Desk Service
 * Manages student tickets, bug reporting, billing inquiries, and resolution status.
 * Replaces Flutter support_screen.dart with TypeScript implementation.
 */

import { fetchApi } from '../utils/api'

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

const LOCAL_STORAGE_KEY = 'learninghub_support_tickets_v1'

const MOCK_TICKETS: SupportTicket[] = [
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
    ticketNumber: 'LH-8419',
    subject: 'Receipt generation for Annual Pro Subscription',
    category: 'Billing',
    priority: 'low',
    status: 'resolved',
    description: 'Need an official GST / tax invoice for corporate reimbursement.',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 9).toISOString(),
    messages: [
      {
        id: 'msg-1',
        sender: 'user',
        senderName: 'You',
        text: 'Need an official GST / tax invoice for corporate reimbursement.',
        timestamp: new Date(Date.now() - 86400000 * 10).toISOString(),
      },
      {
        id: 'msg-2',
        sender: 'support',
        senderName: 'Finance Desk',
        text: 'Your tax invoice has been generated and emailed to your registered account.',
        timestamp: new Date(Date.now() - 86400000 * 9).toISOString(),
      },
    ],
  },
]

function getLocalTickets(): SupportTicket[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // fallback
  }
  return MOCK_TICKETS
}

function saveLocalTickets(tickets: SupportTicket[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tickets))
  } catch {
    // fallback
  }
}

export const supportService = {
  getTickets: async (): Promise<SupportTicket[]> => {
    try {
      const res = await fetchApi<{ status: string; data: SupportTicket[] }>('/support/tickets')
      if (res?.data) return res.data
    } catch {
      // fallback
    }
    return getLocalTickets()
  },

  createTicket: async (payload: CreateTicketPayload): Promise<SupportTicket> => {
    try {
      const res = await fetchApi<{ status: string; data: SupportTicket }>('/support/tickets', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      if (res?.data) return res.data
    } catch {
      // fallback
    }
    const tickets = getLocalTickets()
    const newTicket: SupportTicket = {
      id: `t-${Date.now()}`,
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
    tickets.unshift(newTicket)
    saveLocalTickets(tickets)
    return newTicket
  },

  replyToTicket: async (ticketId: string, message: string): Promise<SupportTicket> => {
    try {
      const res = await fetchApi<{ status: string; data: SupportTicket }>(
        `/support/tickets/${ticketId}/reply`,
        {
          method: 'POST',
          body: JSON.stringify({ message }),
        }
      )
      if (res?.data) return res.data
    } catch {
      // fallback
    }
    const tickets = getLocalTickets()
    const target = tickets.find(t => t.id === ticketId)
    if (target) {
      target.messages.push({
        id: `msg-${Date.now()}`,
        sender: 'user',
        senderName: 'You',
        text: message,
        timestamp: new Date().toISOString(),
      })
      target.updatedAt = new Date().toISOString()
      saveLocalTickets(tickets)
      return target
    }
    throw new Error('Ticket not found')
  },
}

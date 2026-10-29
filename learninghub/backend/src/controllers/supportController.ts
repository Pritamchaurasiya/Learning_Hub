import { Request, Response } from 'express'
import { supportService, CreateTicketPayload } from '../services/SupportService'
import { asyncHandler } from '../utils/errorHandler'
import { sendSuccess, sendNotFound, sendValidationError } from '../utils/responseHelper'

export const listTickets = asyncHandler(async (_req: Request, res: Response) => {
  const tickets = await supportService.getTickets()
  sendSuccess(res, tickets, undefined, 200, { count: tickets.length })
})

export const getTicket = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string
  const ticket = await supportService.getTicketById(id)
  if (!ticket) {
    sendNotFound(res, 'Ticket not found')
    return
  }
  sendSuccess(res, ticket)
})

export const createTicket = asyncHandler(async (req: Request, res: Response) => {
  const { subject, category, priority, description } = req.body as CreateTicketPayload
  if (!subject || !category || !priority || !description) {
    sendValidationError(res, 'subject, category, priority, and description are required')
    return
  }
  const ticket = await supportService.createTicket({
    subject,
    category,
    priority,
    description,
  })
  sendSuccess(res, ticket, 'Support ticket created successfully', 201)
})

export const replyToTicket = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string
  const { message } = req.body
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    sendValidationError(res, 'message is required')
    return
  }
  const senderName = (req.user as any)?.username || (req.user as any)?.email?.split('@')[0] || 'You'
  const ticket = await supportService.replyToTicket(id, message.trim(), senderName)
  sendSuccess(res, ticket, 'Reply added successfully')
})

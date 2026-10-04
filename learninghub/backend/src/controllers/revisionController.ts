import { Request, Response } from 'express'
import { revisionService, CardType } from '../services/RevisionService'
import { sendSuccess, sendBadRequest, sendNotFound } from '../utils/responseHelper'
import { asyncHandler } from '../utils/errorHandler'

export const getDailyDeck = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || 'guest-user'
  const topic = req.query.topic as string | undefined
  const card_type = req.query.card_type as string | undefined

  const result = await revisionService.getDailyDeck(userId, { topic, card_type })
  sendSuccess(res, result)
})

export const submitReview = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || 'guest-user'
  const { card_id, quality } = req.body

  if (!card_id) {
    sendBadRequest(res, 'card_id is required')
    return
  }

  const q = Number(quality)
  if (isNaN(q) || q < 1 || q > 5) {
    sendBadRequest(res, 'quality must be a number between 1 and 5')
    return
  }

  try {
    const result = await revisionService.recordReview(userId, card_id, q)
    sendSuccess(res, result, 'Review recorded successfully')
  } catch (err: any) {
    sendNotFound(res, err.message || 'Card not found')
  }
})

export const createCustomCard = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || 'guest-user'
  const { front, back, explanation, topic, subject, card_type } = req.body

  if (!front || !back) {
    sendBadRequest(res, 'front and back are required for revision cards')
    return
  }

  const card = await revisionService.createCard(userId, {
    front: String(front),
    back: String(back),
    explanation: explanation ? String(explanation) : undefined,
    topic: topic ? String(topic) : undefined,
    subject: subject ? String(subject) : undefined,
    card_type: card_type as CardType,
  })

  sendSuccess(res, card, 'Revision card created', 201)
})

export const generateCards = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || 'guest-user'
  const { source, count } = req.body

  const result = await revisionService.generateCards(userId, {
    source: source === 'bookmarks' ? 'bookmarks' : 'mistakes',
    count: count ? Number(count) : 3,
  })

  sendSuccess(res, result, 'Cards successfully generated', 201)
})

export const getRetentionStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || 'guest-user'
  const stats = await revisionService.getRetentionStats(userId)
  sendSuccess(res, stats)
})

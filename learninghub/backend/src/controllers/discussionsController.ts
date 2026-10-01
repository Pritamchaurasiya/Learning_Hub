import { Request, Response } from 'express'
import { discussionService } from '../services/DiscussionService'
import { asyncHandler } from '../utils/errorHandler'
import { sendSuccess, sendNotFound, sendError } from '../utils/responseHelper'

export const listThreads = asyncHandler(async (req: Request, res: Response) => {
  const { course, search, ordering, page, limit } = req.query
  const userId = req.user?.userId
  const result = await discussionService.getThreads({
    course: course as string,
    search: search as string,
    ordering: ordering as string,
    page: page ? parseInt(page as string, 10) : 1,
    limit: limit ? parseInt(limit as string, 10) : 20,
    userId,
  })
  sendSuccess(res, result.data, undefined, 200, result.meta)
})

export const getTrendingThreads = asyncHandler(async (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10
  const data = await discussionService.getTrending(limit)
  sendSuccess(res, data)
})

export const searchThreads = asyncHandler(async (req: Request, res: Response) => {
  const q = (req.query.q as string) || ''
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20
  const result = await discussionService.getThreads({ search: q, limit })
  sendSuccess(res, result.data, undefined, 200, { query: q, count: result.data.length })
})

export const getThread = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string
  const userId = req.user?.userId
  const thread = await discussionService.getThreadById(id, userId)
  if (!thread) {
    sendNotFound(res, 'Discussion thread not found')
    return
  }
  sendSuccess(res, thread)
})

export const createThread = asyncHandler(async (req: Request, res: Response) => {
  const { title, content, course_id, tags } = req.body
  if (!title || !content) {
    sendError(res, 'Title and content are required', 400)
    return
  }
  const userId = req.user!.userId
  const thread = await discussionService.createThread({
    title,
    content,
    course_id,
    tags,
    userId,
  })
  sendSuccess(res, thread, 'Thread created successfully', 201)
})

export const addReply = asyncHandler(async (req: Request, res: Response) => {
  const threadId = req.params.id as string
  const { content, parent_id } = req.body
  if (!content) {
    sendError(res, 'Reply content is required', 400)
    return
  }
  const userId = req.user!.userId
  const reply = await discussionService.addReply(threadId, {
    content,
    parent_id,
    userId,
  })
  if (!reply) {
    sendNotFound(res, 'Discussion thread not found')
    return
  }
  sendSuccess(res, reply, 'Reply added successfully', 201)
})

export const voteThread = asyncHandler(async (req: Request, res: Response) => {
  const threadId = req.params.id as string
  const vote = req.body.vote ?? 1
  const result = await discussionService.voteThread(threadId, vote)
  sendSuccess(res, result)
})

export const voteReply = asyncHandler(async (req: Request, res: Response) => {
  const replyId = (req.params.replyId || req.params.id) as string
  const vote = req.body.vote ?? 1
  const result = await discussionService.voteReply(replyId, vote)
  sendSuccess(res, result)
})

export const getThreadReplies = asyncHandler(async (req: Request, res: Response) => {
  const threadId = req.params.id as string
  const replies = await discussionService.getReplies(threadId)
  sendSuccess(res, replies)
})

export const pinThread = asyncHandler(async (req: Request, res: Response) => {
  const threadId = req.params.id as string
  const result = await discussionService.pinThread(threadId)
  sendSuccess(res, result)
})

export const resolveThread = asyncHandler(async (req: Request, res: Response) => {
  const threadId = req.params.id as string
  const result = await discussionService.resolveThread(threadId)
  sendSuccess(res, result)
})

export const acceptReply = asyncHandler(async (req: Request, res: Response) => {
  const threadId = req.params.id as string
  const replyId = (req.params.replyId || req.body.replyId) as string
  const result = await discussionService.acceptReply(threadId, replyId)
  sendSuccess(res, result)
})

export const summarizeThread = asyncHandler(async (req: Request, res: Response) => {
  const threadId = req.params.id as string
  const result = await discussionService.summarizeThread(threadId)
  sendSuccess(res, result)
})

export const bookmarkThread = asyncHandler(async (req: Request, res: Response) => {
  const threadId = req.params.id as string
  const userId = req.user!.userId
  const result = await discussionService.bookmarkThread(threadId, userId)
  sendSuccess(res, result)
})

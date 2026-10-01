import { Router } from 'express'
import {
  listThreads,
  getTrendingThreads,
  searchThreads,
  getThread,
  getThreadReplies,
  createThread,
  addReply,
  voteThread,
  voteReply,
  pinThread,
  resolveThread,
  acceptReply,
  summarizeThread,
  bookmarkThread,
} from '../../controllers/discussionsController'
import { authenticate, optionalAuth } from '../../middleware/authMiddleware'
import { requireInstructorOrAdmin } from '../../middleware/roleMiddleware'

const router = Router()

// Public / optionally authenticated routes
router.get('/threads', optionalAuth, listThreads)
router.get('/trending', optionalAuth, getTrendingThreads)
router.get('/threads/search', optionalAuth, searchThreads)
router.get('/threads/:id', optionalAuth, getThread)
router.get('/threads/:id/replies', optionalAuth, getThreadReplies)
router.get('/threads/:id/summarize', optionalAuth, summarizeThread)

// Authenticated routes
router.post('/threads', authenticate, createThread)
router.post('/threads/:id/replies', authenticate, addReply)
router.post('/threads/:id/vote', authenticate, voteThread)
router.post('/threads/:id/replies/:replyId/vote', authenticate, voteReply)
router.post('/replies/:id/vote', authenticate, voteReply)
router.post('/threads/:id/pin', authenticate, requireInstructorOrAdmin, pinThread)
router.post('/threads/:id/resolve', authenticate, resolveThread)
router.post('/threads/:id/replies/:replyId/accept', authenticate, acceptReply)
router.post('/threads/:id/summarize', authenticate, summarizeThread)
router.post('/threads/:id/bookmark', authenticate, bookmarkThread)

export default router

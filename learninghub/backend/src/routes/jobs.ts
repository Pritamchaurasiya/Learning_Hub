import { Router, Request, Response } from 'express'
import { jobQueueService } from '../services/JobQueueService'
import { authenticate } from '../middleware/authMiddleware'
import { sendSuccess, sendError, sendNotFound } from '../utils/responseHelper'

const router = Router()

router.get('/status/:queue/:jobId', authenticate, async (req: Request, res: Response) => {
  const queue = req.params.queue as string
  const jobId = req.params.jobId as string

  if (!['email', 'ai', 'report'].includes(queue)) {
    return sendError(res, 'Invalid queue name', 400, 'INVALID_QUEUE')
  }

  const job = await jobQueueService.getJob(queue as 'email' | 'ai' | 'report', jobId)

  if (!job) {
    return sendNotFound(res, 'Job not found')
  }

  // IDOR protection: Verify ownership unless user is an Admin
  const jobUserId = (job.data as { userId?: string })?.userId
  const currentUserId = req.user?.userId
  const userRole = (req.user?.role ?? '').toUpperCase()
  const isAdmin = ['ADMIN', 'SUPERADMIN', 'MODERATOR'].includes(userRole)

  if (jobUserId && jobUserId !== currentUserId && !isAdmin) {
    return sendError(
      res,
      'Forbidden: You do not have permission to view this job',
      403,
      'FORBIDDEN'
    )
  }

  const state = await job.getState()
  const progress = job.progress()

  sendSuccess(res, { state, progress }, 'Job status retrieved')
})

export default router

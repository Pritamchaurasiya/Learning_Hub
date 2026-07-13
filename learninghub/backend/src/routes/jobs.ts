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

  const status = await jobQueueService.getJobStatus(queue as 'email' | 'ai' | 'report', jobId)

  if (!status) {
    return sendNotFound(res, 'Job not found')
  }

  sendSuccess(res, status, 'Job status retrieved')
})

export default router

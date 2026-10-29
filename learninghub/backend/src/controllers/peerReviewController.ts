import { Request, Response } from 'express'
import { peerReviewService, PeerReviewStatus } from '../services/PeerReviewService'
import { asyncHandler } from '../utils/errorHandler'
import { sendSuccess, sendNotFound, sendValidationError } from '../utils/responseHelper'

export const listAssignments = asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status as PeerReviewStatus | undefined
  const assignments = await peerReviewService.getAssignments(status)
  sendSuccess(res, assignments, undefined, 200, { count: assignments.length })
})

export const getAssignment = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string
  const assignment = await peerReviewService.getAssignmentById(id)
  if (!assignment) {
    sendNotFound(res, 'Assignment not found')
    return
  }
  sendSuccess(res, assignment)
})

export const submitReview = asyncHandler(async (req: Request, res: Response) => {
  const id = (req.params.id || req.body.assignmentId) as string
  const { comments, criteriaScores, score } = req.body
  if (!id) {
    sendValidationError(res, 'Assignment ID is required')
    return
  }
  if (!comments || typeof score !== 'number' || !criteriaScores) {
    sendValidationError(res, 'comments, score, and criteriaScores are required')
    return
  }
  const updated = await peerReviewService.submitReview(id, {
    comments,
    criteriaScores,
    score,
  })
  sendSuccess(res, updated, 'Review submitted successfully')
})

export const disputeReview = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string
  const { reason } = req.body
  if (!reason || typeof reason !== 'string') {
    sendValidationError(res, 'reason is required for dispute')
    return
  }
  const updated = await peerReviewService.disputeReview(id, reason)
  sendSuccess(res, updated, 'Review marked as disputed')
})

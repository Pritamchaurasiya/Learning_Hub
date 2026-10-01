import { Request, Response } from 'express'
import { questionBankService } from '../services/QuestionBankService'
import { asyncHandler } from '../utils/errorHandler'
import { sendSuccess, sendCreated, sendValidationError } from '../utils/responseHelper'

/**
 * POST /api/v1/question-bank/import
 * Bulk import questions into the master question bank or a specific test.
 */
export const importQuestions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { testId, topicId, defaultTopic, questions, skipDuplicates } = req.body
  const instructorId = req.user?.userId

  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    sendValidationError(res, 'questions array is required and must contain at least one item')
    return
  }

  const result = await questionBankService.importQuestions(
    {
      testId,
      topicId,
      defaultTopic,
      questions,
      skipDuplicates: skipDuplicates !== false,
    },
    instructorId
  )

  sendCreated(
    res,
    result,
    `Successfully processed ${result.totalProcessed} questions (${result.importedCount} imported, ${result.skippedDuplicates} duplicates skipped, ${result.errorCount} errors)`
  )
})

/**
 * POST /api/v1/question-bank/validate
 * Validate a raw question payload without persisting.
 */
export const validateQuestion = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const validation = questionBankService.validateQuestion(req.body)
  if (!validation.isValid) {
    sendValidationError(res, validation.error || 'Invalid question shape')
    return
  }
  sendSuccess(res, validation.normalized, 'Question is valid')
})

/**
 * GET /api/v1/question-bank/export
 * Export Question Bank questions.
 */
export const exportQuestions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { testId, topicId, type } = req.query
  const questions = await questionBankService.exportQuestions({
    testId: testId as string,
    topicId: topicId as string,
    type: type as string,
  })
  sendSuccess(res, { questions, count: questions.length })
})

/**
 * GET /api/v1/question-bank/stats
 * Get Question Bank statistics.
 */
export const getQuestionBankStats = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const stats = await questionBankService.getQuestionBankStats()
    sendSuccess(res, stats)
  }
)

/**
 * GET /api/v1/question-bank/questions
 * List questions with pagination, search, status, and filtering.
 */
export const listQuestions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { testId, topicId, type, difficultyMin, difficultyMax, search, status, page, limit } =
    req.query

  const result = await questionBankService.listQuestions({
    testId: testId as string,
    topicId: topicId as string,
    type: type as string,
    difficultyMin: difficultyMin ? parseFloat(difficultyMin as string) : undefined,
    difficultyMax: difficultyMax ? parseFloat(difficultyMax as string) : undefined,
    search: search as string,
    status: status as string,
    page: page ? parseInt(page as string, 10) : 1,
    limit: limit ? parseInt(limit as string, 10) : 20,
  })

  sendSuccess(res, result)
})

/**
 * GET /api/v1/question-bank/questions/:id
 * Retrieve a single question by ID.
 */
export const getQuestion = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id)
  const question = await questionBankService.getQuestion(id)
  sendSuccess(res, question)
})

/**
 * POST /api/v1/question-bank/questions
 * Create a single question in the question bank or a test.
 */
export const createQuestion = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const instructorId = req.user?.userId
  const question = await questionBankService.createSingleQuestion(req.body, instructorId)
  sendCreated(res, question, 'Question created successfully')
})

/**
 * PUT /api/v1/question-bank/questions/:id
 * Update an existing question and its options.
 */
export const updateQuestion = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id)
  const instructorId = req.user?.userId
  const question = await questionBankService.updateQuestion(id, req.body, instructorId)
  sendSuccess(res, question, 'Question updated successfully')
})

/**
 * DELETE /api/v1/question-bank/questions/:id
 * Delete a question by ID.
 */
export const deleteQuestion = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id)
  const result = await questionBankService.deleteQuestion(id)
  sendSuccess(res, result, 'Question deleted successfully')
})

/**
 * POST /api/v1/question-bank/questions/:id/review
 * Update review status (APPROVED, REJECTED, PENDING_REVIEW, DRAFT) with audit feedback.
 */
export const reviewQuestion = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id)
  const reviewerId = req.user?.userId
  const reviewerName = req.user?.email || 'Instructor'
  const { status, feedback, rating } = req.body

  if (!status) {
    sendValidationError(res, 'Review status is required (APPROVED, REJECTED, PENDING_REVIEW, DRAFT)')
    return
  }

  const result = await questionBankService.reviewQuestion(id, {
    status,
    reviewerId,
    reviewerName,
    feedback,
    rating: rating ? parseInt(String(rating), 10) : undefined,
  })

  sendSuccess(res, result, `Question review status updated to ${result.status}`)
})

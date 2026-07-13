import { Request, Response } from 'express'
import { ExamContentService } from '../services/ExamContentService'
import {
  sendSuccess,
  sendCreated,
  sendNotFound,
  sendValidationError,
} from '../utils/responseHelper'
import { asyncHandler } from '../utils/errorHandler'

const examContentService = new ExamContentService()

export const examContentController = {
  getPYQs: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await examContentService.getPYQs(req.query)
    sendSuccess(res, result.data, undefined, 200, result.meta)
  }),

  getPYQById: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    if (!id || typeof id !== 'string') {
      sendValidationError(res, 'Valid PYQ ID is required')
      return
    }
    const pyq = await examContentService.getPYQById(id)
    if (!pyq) {
      sendNotFound(res, 'PYQ not found')
      return
    }
    sendSuccess(res, pyq)
  }),

  createPYQ: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { year, exam, subject, questions } = req.body
    if (!year || !exam || !subject || !Array.isArray(questions) || questions.length === 0) {
      sendValidationError(res, 'year, exam, subject, and questions array are required')
      return
    }
    const pyq = await examContentService.createPYQ(req.body)
    sendCreated(res, pyq)
  }),

  getFormulas: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const formulas = await examContentService.getFormulas(req.query)
    sendSuccess(res, formulas)
  }),

  getRevisionNotes: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const notes = await examContentService.getRevisionNotes(req.query)
    sendSuccess(res, notes)
  }),

  getCountries: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const countries = await examContentService.getCountries()
    sendSuccess(res, countries)
  }),

  getExams: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const exams = await examContentService.getExams({
      countryId: req.query.countryId as string,
      search: req.query.search as string,
    })
    sendSuccess(res, exams)
  }),

  getSubjects: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const examId = Array.isArray(req.params.examId) ? req.params.examId[0] : req.params.examId
    if (!examId || typeof examId !== 'string') {
      sendValidationError(res, 'examId is required')
      return
    }
    const subjects = await examContentService.getSubjects(examId)
    sendSuccess(res, subjects)
  }),
}

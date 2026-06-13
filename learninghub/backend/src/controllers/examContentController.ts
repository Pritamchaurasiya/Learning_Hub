import { Request, Response } from 'express'
import { ExamContentService } from '../services/ExamContentService'
import logger from '../utils/logger'
import {
  sendSuccess,
  sendCreated,
  sendNotFound,
  sendValidationError,
  sendInternalError,
} from '../utils/responseHelper'

const examContentService = new ExamContentService()

export const examContentController = {
  getPYQs: async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await examContentService.getPYQs(req.query)
      sendSuccess(res, result.data, undefined, 200, result.meta)
    } catch (error) {
      logger.error(
        '[ExamContent] getPYQs failed',
        error instanceof Error ? error : new Error(String(error))
      )
      sendInternalError(res)
    }
  },

  getPYQById: async (req: Request, res: Response): Promise<void> => {
    try {
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
    } catch (error) {
      logger.error(
        '[ExamContent] getPYQById failed',
        error instanceof Error ? error : new Error(String(error)),
        { pyqId: req.params.id }
      )
      sendInternalError(res)
    }
  },

  createPYQ: async (req: Request, res: Response): Promise<void> => {
    try {
      const { year, exam, subject, questions } = req.body
      if (!year || !exam || !subject || !Array.isArray(questions) || questions.length === 0) {
        sendValidationError(res, 'year, exam, subject, and questions array are required')
        return
      }
      const pyq = await examContentService.createPYQ(req.body)
      sendCreated(res, pyq)
    } catch (error) {
      logger.error(
        '[ExamContent] createPYQ failed',
        error instanceof Error ? error : new Error(String(error))
      )
      sendInternalError(res)
    }
  },

  getFormulas: async (req: Request, res: Response): Promise<void> => {
    try {
      const formulas = await examContentService.getFormulas(req.query)
      sendSuccess(res, formulas)
    } catch (error) {
      logger.error(
        '[ExamContent] getFormulas failed',
        error instanceof Error ? error : new Error(String(error))
      )
      sendInternalError(res)
    }
  },

  getRevisionNotes: async (req: Request, res: Response): Promise<void> => {
    try {
      const notes = await examContentService.getRevisionNotes(req.query)
      sendSuccess(res, notes)
    } catch (error) {
      logger.error(
        '[ExamContent] getRevisionNotes failed',
        error instanceof Error ? error : new Error(String(error))
      )
      sendInternalError(res)
    }
  },
}

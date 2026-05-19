import { Request, Response } from 'express'
import { ExamContentService } from '../services/ExamContentService'
import logger from '../utils/logger'

const examContentService = new ExamContentService()

export const examContentController = {
  // PYQ Routes
  getPYQs: async (req: Request, res: Response) => {
    try {
      const result = await examContentService.getPYQs(req.query)
      res.json({ status: 'success', ...result })
    } catch (error) {
      logger.error(
        '[ExamContent] getPYQs failed',
        error instanceof Error ? error : new Error(String(error))
      )
      res.status(500).json({ status: 'error', message: 'Failed to fetch PYQs' })
    }
  },

  getPYQById: async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      const pyq = await examContentService.getPYQById(id)
      if (!pyq) {
        return res.status(404).json({ status: 'error', message: 'PYQ not found' })
      }
      res.json({ status: 'success', data: pyq })
    } catch (error) {
      logger.error(
        '[ExamContent] getPYQById failed',
        error instanceof Error ? error : new Error(String(error)),
        { pyqId: req.params.id }
      )
      res.status(500).json({ status: 'error', message: 'Failed to fetch PYQ' })
    }
  },

  createPYQ: async (req: Request, res: Response) => {
    try {
      const pyq = await examContentService.createPYQ(req.body)
      res.status(201).json({ status: 'success', data: pyq })
    } catch (error) {
      logger.error(
        '[ExamContent] createPYQ failed',
        error instanceof Error ? error : new Error(String(error))
      )
      res.status(500).json({ status: 'error', message: 'Failed to create PYQ' })
    }
  },

  // Formula Routes
  getFormulas: async (req: Request, res: Response) => {
    try {
      const formulas = await examContentService.getFormulas(req.query)
      res.json({ status: 'success', data: formulas })
    } catch (error) {
      logger.error(
        '[ExamContent] getFormulas failed',
        error instanceof Error ? error : new Error(String(error))
      )
      res.status(500).json({ status: 'error', message: 'Failed to fetch formulas' })
    }
  },

  // Revision Notes Routes
  getRevisionNotes: async (req: Request, res: Response) => {
    try {
      const notes = await examContentService.getRevisionNotes(req.query)
      res.json({ status: 'success', data: notes })
    } catch (error) {
      logger.error(
        '[ExamContent] getRevisionNotes failed',
        error instanceof Error ? error : new Error(String(error))
      )
      res.status(500).json({ status: 'error', message: 'Failed to fetch notes' })
    }
  },
}

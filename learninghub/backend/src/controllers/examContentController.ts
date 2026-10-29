import { Request, Response } from 'express'
import { ExamContentService } from '../services/ExamContentService'
import {
  sendSuccess,
  sendCreated,
  sendNotFound,
  sendValidationError,
} from '../utils/responseHelper'
import { asyncHandler } from '../utils/errorHandler'

import { cacheService } from '../services/CacheService'
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

  getCountries: asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const cacheKey = 'exam-content:countries'
    const cached = await cacheService.get(cacheKey)
    if (cached) {
      sendSuccess(res, cached)
      return
    }
    const countries = await examContentService.getCountries()
    await cacheService.set(cacheKey, countries, 3600)
    sendSuccess(res, countries)
  }),

  getExams: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const cfCountry = req.headers['cf-ipcountry'] as string | undefined
    const queryCountry = req.query.country as string | undefined
    const country = queryCountry || (cfCountry && cfCountry !== 'XX' ? cfCountry : undefined)
    const countryId = req.query.countryId as string | undefined
    const search = req.query.search as string | undefined

    const cacheKey = `exam-content:exams:${countryId || 'all'}:${country || 'all'}:${search || 'all'}`
    const cached = await cacheService.get(cacheKey)
    if (cached) {
      sendSuccess(res, cached)
      return
    }

    const exams = await examContentService.getExams({
      countryId,
      country,
      search,
    })
    await cacheService.set(cacheKey, exams, 3600)
    sendSuccess(res, exams)
  }),

  getGeoCountry: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const cfCountry = req.headers['cf-ipcountry'] as string | undefined
    const acceptLanguage = req.headers['accept-language'] as string | undefined

    const countries = await examContentService.getCountries()
    let detectedCountry = null
    let method = 'fallback'

    if (cfCountry && cfCountry !== 'XX' && cfCountry.length === 2) {
      detectedCountry = countries.find(c => c.code.toUpperCase() === cfCountry.toUpperCase())
      if (detectedCountry) method = 'cloudflare'
    }

    if (!detectedCountry && acceptLanguage) {
      for (const part of acceptLanguage.split(',')) {
        const locale = part.split(';')[0].trim()
        if (locale.includes('-')) {
          let code = locale.split('-')[1].toUpperCase()
          if (code === 'GB') code = 'UK'
          detectedCountry = countries.find(c => c.code.toUpperCase() === code)
          if (detectedCountry) {
            method = 'locale'
            break
          }
        }
      }
    }

    if (!detectedCountry) {
      detectedCountry = countries.find(c => c.code === 'IN') || countries.find(c => c.code === 'US') || countries[0] || null
      method = 'fallback'
    }

    sendSuccess(res, {
      countryCode: detectedCountry?.code ?? 'IN',
      countryName: detectedCountry?.name ?? 'India',
      countryId: detectedCountry?.id ?? null,
      method,
    })
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

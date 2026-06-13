import { Request, Response } from 'express'
import { fullTextSearchService } from '../services/FullTextSearchService'
import { sendSuccess, sendError } from '../utils/responseHelper'
import { cacheService } from '../services/CacheService'

export async function searchContent(req: Request, res: Response): Promise<void> {
  try {
    const { q, type, limit } = req.query

    if (!q || typeof q !== 'string') {
      sendError(res, 'Search query is required', 400)
      return
    }

    // Check cache first
    const cacheKey = `search:${q}:${type ?? 'all'}:${limit ?? 20}`
    const cached = await cacheService.get(cacheKey)
    if (cached) {
      sendSuccess(res, cached, 'Search results (cached)')
      return
    }

    const results = await fullTextSearchService.search(q, {
      type: type as 'course' | 'problem' | 'lesson' | undefined,
      limit: limit ? parseInt(limit as string) : 20,
    })

    // Cache for 5 minutes
    await cacheService.set(cacheKey, results, 300)

    sendSuccess(res, results, 'Search completed')
  } catch (error: any) {
    sendError(res, error.message, 500)
  }
}

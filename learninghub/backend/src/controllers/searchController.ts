import { Request, Response, NextFunction } from 'express'
import { SearchService } from '../services/SearchService'
import { sendSuccess, sendError, sendUnauthorized } from '../utils/responseHelper'

export class SearchController {
  /**
   * Semantic search across all content types
   * GET /api/v1/search
   */
  static async search(req: Request, res: Response, next?: NextFunction): Promise<void> {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''

      if (!q || q.length < 2) {
        sendError(res, 'Query must be at least 2 characters', 400, 'INVALID_QUERY')
        return
      }

      const typesParam = typeof req.query.types === 'string'
        ? (req.query.types.split(',') as ('question' | 'problem' | 'course' | 'canonical_question')[])
        : undefined
      const limit = Math.min(parseInt(String(req.query.limit || '20'), 10) || 20, 100)
      const offset = parseInt(String(req.query.offset || '0'), 10) || 0
      const mode = typeof req.query.mode === 'string' ? req.query.mode : 'hybrid'

      const filters: Record<string, any> = {}
      if (typeof req.query.category === 'string') filters.category = req.query.category
      if (typeof req.query.difficulty === 'string') filters.difficulty = req.query.difficulty
      if (typeof req.query.tags === 'string') filters.tags = req.query.tags.split(',')

      const userId = req.user?.userId || (req as any).user?.id

      const result = await SearchService.semanticSearch({
        query: q,
        types: typesParam,
        limit,
        offset,
        userId,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
      })

      sendSuccess(res, {
        results: result.results,
        total: result.total,
        query: q,
        mode,
        took: result.took,
      })
    } catch (error) {
      if (next) next(error)
      else sendError(res, 'Search execution error', 500)
    }
  }

  /**
   * Personalized search with user context
   * GET /api/v1/search/personalized
   */
  static async personalizedSearch(req: Request, res: Response, next?: NextFunction): Promise<void> {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''

      if (!q || q.length < 2) {
        sendError(res, 'Query must be at least 2 characters', 400, 'INVALID_QUERY')
        return
      }

      const userId = req.user?.userId || (req as any).user?.id
      if (!userId) {
        sendUnauthorized(res, 'Authentication required for personalized search')
        return
      }

      const typesParam = typeof req.query.types === 'string'
        ? (req.query.types.split(',') as ('question' | 'problem' | 'course' | 'canonical_question')[])
        : undefined
      const limit = Math.min(parseInt(String(req.query.limit || '20'), 10) || 20, 100)

      const result = await SearchService.personalizedSearch({
        query: q,
        userId,
        limit,
        types: typesParam,
      })

      sendSuccess(res, {
        results: result.results,
        total: result.total,
        suggestions: result.suggestions,
      })
    } catch (error) {
      if (next) next(error)
      else sendError(res, 'Personalized search failed', 500)
    }
  }

  /**
   * Get search suggestions
   * GET /api/v1/search/suggestions
   */
  static async getSuggestions(req: Request, res: Response, next?: NextFunction): Promise<void> {
    try {
      const prefix = typeof req.query.q === 'string' ? req.query.q.trim() : ''

      if (!prefix || prefix.length < 2) {
        sendSuccess(res, { suggestions: [] })
        return
      }

      const limitNum = Math.min(parseInt(String(req.query.limit || '10'), 10) || 10, 20)
      const suggestions = await SearchService.getSearchSuggestions(prefix, limitNum)

      sendSuccess(res, { suggestions })
    } catch (error) {
      if (next) next(error)
      else sendError(res, 'Failed to fetch suggestions', 500)
    }
  }

  /**
   * Get trending searches
   * GET /api/v1/search/trending
   */
  static async getTrending(req: Request, res: Response, next?: NextFunction): Promise<void> {
    try {
      const limitNum = Math.min(parseInt(String(req.query.limit || '10'), 10) || 10, 20)
      const trending = await SearchService.getTrendingSearches(limitNum)
      sendSuccess(res, { trending })
    } catch (error) {
      if (next) next(error)
      else sendError(res, 'Failed to fetch trending searches', 500)
    }
  }

  /**
   * Record search click event
   * POST /api/v1/search/click
   */
  static async recordClick(req: Request, res: Response, next?: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId || (req as any).user?.id
      if (!userId) {
        sendUnauthorized(res, 'Authentication required')
        return
      }

      const { query, resultsCount, clickedResultId, clickedResultType, timeToClick } = req.body

      if (!query || typeof query !== 'string') {
        sendError(res, 'Query is required', 400, 'MISSING_QUERY')
        return
      }

      await SearchService.recordSearchEvent({
        userId,
        query: query.trim(),
        resultsCount: parseInt(String(resultsCount || '0'), 10) || 0,
        clickedResultId,
        clickedResultType,
        timeToClick: timeToClick ? parseInt(String(timeToClick), 10) : undefined,
      })

      sendSuccess(res, { recorded: true })
    } catch (error) {
      if (next) next(error)
      else sendError(res, 'Failed to record click event', 500)
    }
  }

  /**
   * Get search suggestions for a user
   * GET /api/v1/search/suggestions/user
   */
  static async getUserSuggestions(req: Request, res: Response, next?: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId || (req as any).user?.id
      if (!userId) {
        sendUnauthorized(res, 'Authentication required')
        return
      }

      const suggestions = await SearchService.getSearchSuggestions('', 10)
      sendSuccess(res, { suggestions })
    } catch (error) {
      if (next) next(error)
      else sendError(res, 'Failed to fetch user suggestions', 500)
    }
  }
}
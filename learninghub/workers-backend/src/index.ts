// NOTE: This is an optional edge deployment. Primary backend is Express at learninghub/backend/.
import { handleAuth } from './routes/auth'
import { handleCourses } from './routes/courses'
import { handleTests } from './routes/tests'
import { handleAI } from './routes/ai'
import { handleAdmin } from './routes/admin'
import { handleBookmarks } from './routes/bookmarks'
import { handleGamification } from './routes/gamification'
import {
  handleSearch,
  handleNotifications,
  handleCertificates,
  handleDiscussions,
  handleLearningPaths,
  handleLeaderboard,
  handleMedia,
  getStubResponse,
} from './routes/stubs'
import { createDbClient } from './db/connection'
import { createJSONResponse, createErrorResponse } from './utils/helpers'
import { generateSecureToken } from './utils/security'
import { logger, createRequestContext, logRequestCompletion } from './utils/logger'
import { handleError } from './middleware/error'
import { applyRateLimit } from './middleware/ratelimit'
import { Env, ExecutionContext } from './types'

const ALLOWED_ORIGINS = [
  'https://learninghub.app',
  'https://www.learninghub.app',
  'http://localhost:3000',
  'http://localhost:5173',
]

function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const origin =
    requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0]

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Request-ID, X-CSRF-Token, X-Session-ID',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  }
}

export function normalizeApiPath(path: string): string {
  const prefix = '/api/v1'
  if (path === prefix) return '/'
  if (path.startsWith(`${prefix}/`)) return path.slice(prefix.length)
  return path
}

async function getHealthStatus(env: Env): Promise<Record<string, unknown>> {
  const checks: Record<string, boolean> = {}

  try {
    const pool = await createDbClient(env)
    await pool.query('SELECT 1')
    await pool.end()
    checks.database = true
  } catch {
    checks.database = false
  }

  const allHealthy = Object.values(checks).every(v => v)

  return {
    status: allHealthy ? 'ok' : 'degraded',
    service: 'learninghub-api',
    version: '1.0.0',
    environment: env.ENVIRONMENT || 'development',
    timestamp: new Date().toISOString(),
    checks,
  }
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname
    const requestOrigin = request.headers.get('Origin')
    const corsHeaders = getCorsHeaders(requestOrigin)

    const requestContext = createRequestContext(request)
    logger.setRequestContext(requestContext)

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...corsHeaders,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        },
      })
    }

    logger.info('Request started', { path, method: request.method })

    try {
      let rateLimitType: 'auth' | 'api' | 'read' | 'ai' = 'api'
      if (path.startsWith('/auth')) rateLimitType = 'auth'
      else if (path.startsWith('/ai')) rateLimitType = 'ai'
      else if (request.method === 'GET') rateLimitType = 'read'

      const rateLimitResponse = await applyRateLimit(request, env, rateLimitType)
      if (rateLimitResponse) {
        logRequestCompletion(requestContext, 429)
        return rateLimitResponse
      }

      // CSRF token endpoint (no auth required)
      if (path === '/csrf-token' && request.method === 'GET') {
        const csrfToken = generateSecureToken(32)
        const response = createJSONResponse({ csrfToken })
        // Set CSRF token as a cookie too
        const cookieSecure = env.ENVIRONMENT === 'production' ? '; Secure' : ''
        response.headers.set(
          'Set-Cookie',
          `csrf-token=${csrfToken}; path=/; SameSite=Lax${cookieSecure}`
        )
        return response
      }

      let response: Response

      if (path.startsWith('/auth')) {
        response = await handleAuth(request, env)
      } else if (path.startsWith('/courses')) {
        response = await handleCourses(request, env)
      } else if (path.startsWith('/tests')) {
        response = await handleTests(request, env)
      } else if (path.startsWith('/ai')) {
        response = await handleAI(request, env)
      } else if (path.startsWith('/bookmarks') || path.startsWith('/users/bookmarks')) {
        const newUrl = new URL(request.url)
        newUrl.pathname = path.startsWith('/users/bookmarks')
          ? `/bookmarks${path.substring(16)}`
          : path
        const newRequest = new Request(newUrl.toString(), request)
        response = await handleBookmarks(newRequest, env)
      } else if (path.startsWith('/gamification')) {
        response = await handleGamification(request, env)
      } else if (path.startsWith('/admin')) {
        response = await handleAdmin(request, env)
      } else if (path.startsWith('/notifications')) {
        response = await handleNotifications(request, env)
      } else if (path.startsWith('/certificates')) {
        response = await handleCertificates(request, env)
      } else if (path.startsWith('/discussions')) {
        response = await handleDiscussions(request, env)
      } else if (path.startsWith('/learning-paths')) {
        response = await handleLearningPaths(request, env)
      } else if (path.startsWith('/search')) {
        response = await handleSearch(request, env)
      } else if (path.startsWith('/leaderboard')) {
        response = await handleLeaderboard(request, env)
      } else if (path.startsWith('/media')) {
        response = await handleMedia(request, env)
      } else if (path === '/health' || path === '/') {
        const healthStatus = await getHealthStatus(env)
        response = createJSONResponse(healthStatus, healthStatus.status === 'ok' ? 200 : 503)
      } else if (path === '/seed-demo-data' && request.method === 'POST') {
        try {
          const { seedDemoData, demoCredentials } = await import('./utils/demoData')
          await seedDemoData(env)
          response = createJSONResponse({
            success: true,
            message: 'Demo data seeded successfully',
            credentials: demoCredentials,
          })
        } catch (error) {
          logger.error('Demo data seeding failed', error as Error)
          response = createErrorResponse('Failed to seed demo data', 500, 'SEED_ERROR', {
            details: (error as Error).message,
          })
        }
      } else {
        const stub = getStubResponse(path)
        if (stub) {
          response = createJSONResponse(stub.data)
        } else {
          response = createErrorResponse('Not found', 404, 'NOT_FOUND')
        }
      }

      // Add CORS headers to the response
      for (const [key, value] of Object.entries(corsHeaders)) {
        response.headers.set(key, value)
      }

      logRequestCompletion(requestContext, response.status)
      return response
    } catch (error) {
      logger.error('Unhandled worker error', error as Error)
      const errorResponse = handleError(error as Error)
      for (const [key, value] of Object.entries(corsHeaders)) {
        errorResponse.headers.set(key, value)
      }
      logRequestCompletion(requestContext, errorResponse.status, error as Error)
      return errorResponse
    }
  },
}

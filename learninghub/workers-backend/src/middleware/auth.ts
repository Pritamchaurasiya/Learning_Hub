import { jwtVerify } from 'jose'
import { Env, UserContext } from '../types'
import { logger } from '../utils/logger'
import { Errors } from './error'

export { UserContext as JWTPayload }

export async function verifyToken(token: string, secret: string): Promise<UserContext | null> {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))
    return payload as unknown as UserContext
  } catch (error) {
    logger.debug('Token verification failed', { error: (error as Error).message })
    return null
  }
}

export function createAuthMiddleware(env: Env) {
  return async (
    request: Request
  ): Promise<{ user: UserContext | null; error: Response | null }> => {
    const authHeader = request.headers.get('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.debug('Missing or invalid Authorization header')
      return {
        user: null,
        error: new Response(
          JSON.stringify({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authorization header required' },
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }
        ),
      }
    }

    const token = authHeader.substring(7)

    // Check for token expiration via basic decode (without verification)
    try {
      const payload = await verifyToken(token, env.JWT_SECRET)

      if (!payload) {
        logger.warn('Invalid or expired token')
        return {
          user: null,
          error: new Response(
            JSON.stringify({
              success: false,
              error: { code: 'TOKEN_INVALID', message: 'Token is invalid or expired' },
            }),
            {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            }
          ),
        }
      }

      // Log successful auth for audit
      logger.debug('Authentication successful', { userId: payload.userId, role: payload.role })

      return { user: payload, error: null }
    } catch (error) {
      logger.error('Auth middleware error', error as Error)
      return {
        user: null,
        error: new Response(
          JSON.stringify({
            success: false,
            error: { code: 'AUTH_ERROR', message: 'Authentication failed' },
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }
        ),
      }
    }
  }
}

export function requireAuth(authMiddleware: ReturnType<typeof createAuthMiddleware>) {
  return async (
    request: Request,
    handler: (user: UserContext) => Promise<Response>
  ): Promise<Response> => {
    const { user, error } = await authMiddleware(request)
    if (error) return error
    if (!user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
    return handler(user)
  }
}

/**
 * Check if user has required role
 */
export function requireRole(...allowedRoles: UserContext['role'][]) {
  return (user: UserContext): boolean => {
    const hasRole = allowedRoles.includes(user.role)
    if (!hasRole) {
      logger.warn('Role check failed', {
        userId: user.userId,
        role: user.role,
        required: allowedRoles,
      })
    }
    return hasRole
  }
}

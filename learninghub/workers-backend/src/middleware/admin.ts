import { verifyToken } from '../utils/jwt'
import { createErrorResponse } from '../utils/helpers'
import { Env } from '../types'

/**
 * Admin middleware - verifies the user has admin role
 * Must be used after auth middleware (which adds user to context)
 */
export async function requireAdmin(request: Request, env: Env): Promise<Response | null> {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return createErrorResponse('Unauthorized - Admin access required', 401)
  }

  const token = authHeader.split(' ')[1]
  const payload = await verifyToken(token, env.JWT_SECRET)

  if (!payload) {
    return createErrorResponse('Invalid token', 401)
  }

  // Check if user has admin role
  if (payload.role !== 'admin') {
    return createErrorResponse('Forbidden - Admin access required', 403)
  }

  // Add admin user info to request for downstream use
  ;(request as any).admin = payload

  return null // Continue to next handler
}

/**
 * Check if user is admin (for use in route handlers)
 */
export async function isAdmin(request: Request, env: Env): Promise<boolean> {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }

  const token = authHeader.split(' ')[1]
  const payload = await verifyToken(token, env.JWT_SECRET)

  if (!payload) {
    return false
  }

  return payload.role === 'admin'
}

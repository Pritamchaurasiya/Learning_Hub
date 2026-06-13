import { verifyToken, requireAuth } from '../middleware/auth'
import { createErrorResponse } from './helpers'
import { Env, UserContext } from '../types'

export async function getUserFromRequest(
  request: Request,
  env: Env
): Promise<UserContext | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null

  const token = authHeader.substring(7)
  return verifyToken(token, env.JWT_SECRET)
}

export async function requireUser(
  request: Request,
  env: Env
): Promise<{ user: UserContext; error: null } | { user: null; error: Response }> {
  const user = await getUserFromRequest(request, env)
  if (!user) {
    return { user: null, error: createErrorResponse('Unauthorized', 401) }
  }
  return { user, error: null }
}

export function requireRole(user: UserContext, ...roles: string[]): boolean {
  return roles.includes(user.role)
}

export function adminOnly(user: UserContext): boolean {
  return user.role === 'admin' || user.role === 'superadmin'
}

export { requireAuth }

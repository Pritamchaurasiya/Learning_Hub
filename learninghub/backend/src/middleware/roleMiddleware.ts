/**
 * roleMiddleware.ts — DEPRECATED: Auth functions have been consolidated into authMiddleware.ts.
 *
 * Previously duplicated authorization checks are now handled by:
 *   - authorize()         → authMiddleware.ts
 *   - authorizeAdmin()    → authMiddleware.ts
 *   - authorizeInstructor() → authMiddleware.ts
 *   - authorizeSuperAdmin() → authMiddleware.ts
 *
 * This module retains re-exports for backward compatibility only.
 * New code should import from authMiddleware.ts directly.
 */
import { Request, Response, NextFunction } from 'express'
import { sendError } from '../utils/responseHelper'

const normalizeRole = (role?: string): string => role?.toUpperCase() ?? ''

export const requireRole = (roles: string[]) => {
  const normalizedRoles = roles.map(role => role.toUpperCase())
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'NO_TOKEN')
      return
    }
    if (!normalizedRoles.includes(normalizeRole(req.user.role))) {
      sendError(res, 'Insufficient permissions', 403, 'FORBIDDEN')
      return
    }
    next()
  }
}

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    sendError(res, 'Authentication required', 401, 'NO_TOKEN')
    return
  }
  if (!['ADMIN', 'SUPERADMIN'].includes(normalizeRole(req.user.role))) {
    sendError(res, 'Admin access required', 403, 'FORBIDDEN')
    return
  }
  next()
}

export const requireAdminPermission = (_allowedPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'NO_TOKEN')
      return
    }
    if (!['ADMIN', 'SUPERADMIN'].includes(normalizeRole(req.user.role))) {
      sendError(res, 'Admin access required', 403, 'FORBIDDEN')
      return
    }
    next()
  }
}

export const requireInstructorOrAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    sendError(res, 'Authentication required', 401, 'NO_TOKEN')
    return
  }
  if (!['ADMIN', 'SUPERADMIN', 'INSTRUCTOR'].includes(normalizeRole(req.user.role))) {
    sendError(res, 'Instructor or Admin access required', 403, 'FORBIDDEN')
    return
  }
  next()
}

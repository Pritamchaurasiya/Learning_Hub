import { Request, Response, NextFunction } from 'express'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { AuthService } from '../services'

/**
 * Role-based access control middleware
 *
 * IMPORTANT: Prisma UserRole enum values are UPPERCASE: STUDENT, INSTRUCTOR, ADMIN, SUPERADMIN
 * All role checks MUST use uppercase comparison to match the database enum.
 *
 * @param roles - Array of allowed roles (case-insensitive for safety)
 */
export const requireRole = (roles: string[]) => {
  // Normalize to uppercase at middleware creation time for safe comparison
  const normalizedRoles = roles.map(r => r.toUpperCase())

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' })
    }

    const userRole = req.user.role?.toUpperCase()
    if (!userRole || !normalizedRoles.includes(userRole)) {
      return res
        .status(403)
        .json({ status: 'error', message: 'Forbidden: Insufficient permissions' })
    }

    next()
  }
}

/**
 * Admin-only middleware
 * Accepts both ADMIN and SUPERADMIN roles
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' })
  }

  const userRole = req.user.role?.toUpperCase()
  if (userRole !== 'ADMIN' && userRole !== 'SUPERADMIN') {
    return res.status(403).json({ status: 'error', message: 'Admin access required' })
  }

  next()
}

/**
 * Instructor or Admin middleware
 */
export const requireInstructorOrAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' })
  }

  const userRole = req.user.role?.toUpperCase()
  if (!userRole || !['ADMIN', 'SUPERADMIN', 'INSTRUCTOR'].includes(userRole)) {
    return res.status(403).json({ status: 'error', message: 'Instructor or Admin access required' })
  }

  next()
}

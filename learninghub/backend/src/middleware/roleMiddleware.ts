import { Request, Response, NextFunction } from 'express'
import { sendError } from '../utils/responseHelper'
import { prisma } from '../prismaClient'

export const requireRole = (roles: string[]) => {
  const normalizedRoles = roles.map(r => r.toUpperCase())

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'NO_TOKEN')
      return
    }

    const userRole = req.user.role?.toUpperCase()
    if (!userRole || !normalizedRoles.includes(userRole)) {
      sendError(res, 'Insufficient permissions', 403, 'FORBIDDEN')
      return
    }

    next()
  }
}

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    sendError(res, 'Authentication required', 401, 'NO_TOKEN')
    return
  }

  const userRole = req.user.role?.toUpperCase()
  if (userRole !== 'ADMIN' && userRole !== 'SUPERADMIN') {
    sendError(res, 'Admin access required', 403, 'FORBIDDEN')
    return
  }

  next()
}

export const requireAdminPermission = (allowedPermissions: string[]) => {
  const normalizedPermissions = allowedPermissions.map(p => p.toLowerCase())

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'NO_TOKEN')
      return
    }

    const userRole = req.user.role?.toUpperCase()

    if (userRole === 'SUPERADMIN') {
      next()
      return
    }

    if (userRole !== 'ADMIN') {
      sendError(res, 'Admin access required', 403, 'FORBIDDEN')
      return
    }

    const userId = req.user.userId as string | undefined
    if (!userId) {
      sendError(res, 'User not authenticated', 401, 'NO_TOKEN')
      return
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      })

      if (!user) {
        sendError(res, 'User not found', 401, 'USER_NOT_FOUND')
        return
      }

      // NOTE: User model has no 'permissions' field currently.
      // This is a stub for future fine-grained permissions.
      // For now, role check is sufficient.
      next()
    } catch {
      sendError(res, 'Permission verification error', 500, 'PERMISSION_ERROR')
    }
  }
}

export const requireInstructorOrAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    sendError(res, 'Authentication required', 401, 'NO_TOKEN')
    return
  }

  const userRole = req.user.role?.toUpperCase()
  if (!userRole || !['ADMIN', 'SUPERADMIN', 'INSTRUCTOR'].includes(userRole)) {
    sendError(res, 'Instructor or Admin access required', 403, 'FORBIDDEN')
    return
  }

  next()
}

import { Response, NextFunction } from 'express';

/**
 * Role-based access control middleware
 * @param roles - Array of allowed roles
 */
export const requireRole = (roles: string[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ status: 'error', message: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};

/**
 * Admin-only middleware
 */
export const requireAdmin = (req: any, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ status: 'error', message: 'Admin access required' });
  }

  next();
};

/**
 * Instructor or Admin middleware
 */
export const requireInstructorOrAdmin = (req: any, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }

  if (!['admin', 'instructor'].includes(req.user.role)) {
    return res.status(403).json({ status: 'error', message: 'Instructor or Admin access required' });
  }

  next();
};

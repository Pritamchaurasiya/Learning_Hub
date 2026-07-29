/**
 * sessionTimeoutMiddleware.ts — DEPRECATED
 *
 * Session timeout checks (idle + absolute) are now handled exclusively by
 * authMiddleware.ts's `authenticate` function. This module previously
 * duplicated that logic, causing redundant database lookups and potential
 * inconsistency if one copy was updated without the other.
 *
 * Kept for backward compatibility. New code should rely on `authenticate`
 * in authMiddleware.ts which already validates session existence, idle
 * timeout, absolute timeout, and lastUsedAt updates in a single pass.
 */
import { Request, Response, NextFunction } from 'express'
import { sendError } from '../utils/responseHelper'

export async function sessionTimeoutMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Session timeout validation is handled by the authenticate middleware.
  // If req.user is set, the session has already been validated.
  if (!req.user) {
    sendError(res, 'Session validation required', 401, 'SESSION_NOT_VALIDATED')
    return
  }
  next()
}

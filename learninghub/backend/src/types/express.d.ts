import { Server } from 'socket.io'

export interface UsageLimitInfo {
  allowed: boolean
  current: number
  limit: number
}

// Extend Express Request to include user info from JWT and socket.io
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string
        email: string
        role: string
      }
      requestId?: string
      io?: Server
      usageLimit?: UsageLimitInfo
    }
  }
}

export {}

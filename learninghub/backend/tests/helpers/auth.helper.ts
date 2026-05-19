import jwt from 'jsonwebtoken'
import { User } from '@prisma/client'

export const generateTestToken = (user: Partial<User>): string => {
  const payload = {
    userId: user.id || 'test-user-id',
    email: user.email || 'test@example.com',
    role: user.role || 'student',
  }
  return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', {
    expiresIn: '1h',
  })
}

export const generateTestRefreshToken = (user: Partial<User>): string => {
  const payload = {
    userId: user.id || 'test-user-id',
    email: user.email || 'test@example.com',
    role: user.role || 'student',
  }
  return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', {
    expiresIn: '7d',
  })
}

export const createAuthHeader = (token: string): { Authorization: string } => ({
  Authorization: `Bearer ${token}`,
})

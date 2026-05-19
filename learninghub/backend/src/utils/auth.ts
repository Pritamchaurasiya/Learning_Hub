import jwt from 'jsonwebtoken'
import logger from './logger'

const JWT_SECRET =
  process.env.NODE_ENV === 'test' ? 'supersecret_for_testing_1234567890' : process.env.JWT_SECRET
const JWT_REFRESH_SECRET =
  process.env.NODE_ENV === 'test'
    ? 'supersecret_for_testing_1234567890'
    : process.env.JWT_REFRESH_SECRET

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  logger.error(
    'CRITICAL: JWT secrets not configured. Set JWT_SECRET and JWT_REFRESH_SECRET environment variables.',
    new Error('JWT secrets missing'),
    {
      hasJwtSecret: !!JWT_SECRET,
      hasRefreshSecret: !!JWT_REFRESH_SECRET,
    }
  )
  process.exit(1)
}

if (JWT_SECRET.length < 32 || JWT_REFRESH_SECRET.length < 32) {
  logger.error(
    'CRITICAL: JWT secrets must be at least 32 characters long for security.',
    new Error('JWT secrets too short'),
    {
      jwtSecretLength: JWT_SECRET.length,
      refreshSecretLength: JWT_REFRESH_SECRET.length,
      minLength: 32,
    }
  )
  process.exit(1)
}

export interface DecodedToken {
  userId: string
  email: string
  role: string
}

export const generateToken = (userId: string, email: string, role: string): string => {
  return jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: '15m' })
}

export const generateRefreshToken = (userId: string, email: string, role: string): string => {
  return jwt.sign({ userId, email, role }, JWT_REFRESH_SECRET, { expiresIn: '7d' })
}

export const verifyRefreshToken = (token: string): DecodedToken => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as DecodedToken
}

export const verifyAccessToken = (token: string): DecodedToken => {
  return jwt.verify(token, JWT_SECRET) as DecodedToken
}

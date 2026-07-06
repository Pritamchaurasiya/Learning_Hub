import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { jwtConfig } from '../config'

export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex')

export const isAlreadyHashed = (token: string): boolean =>
  token.length === 64 && /^[0-9a-f]+$/i.test(token)

export interface DecodedToken {
  userId: string
  email: string
  role: string
}

const signToken = (payload: Record<string, unknown>, secret: string, expiresIn: string): string => {
  return jwt.sign(payload, secret, {
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
    algorithm: jwtConfig.algorithm as jwt.Algorithm,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
  })
}

export const generateToken = (userId: string, email: string, role: string): string => {
  return signToken({ userId, email, role }, jwtConfig.accessSecret, jwtConfig.accessExpiresIn)
}

export const generateRefreshToken = (userId: string, email: string, role: string): string => {
  return signToken(
    { userId, email, role, tokenId: crypto.randomUUID() },
    jwtConfig.refreshSecret,
    jwtConfig.refreshExpiresIn
  )
}

export const verifyRefreshToken = (token: string): DecodedToken => {
  return jwt.verify(token, jwtConfig.refreshSecret, {
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
  }) as DecodedToken
}

export const verifyAccessToken = (token: string): DecodedToken => {
  return jwt.verify(token, jwtConfig.accessSecret, {
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
  }) as DecodedToken
}

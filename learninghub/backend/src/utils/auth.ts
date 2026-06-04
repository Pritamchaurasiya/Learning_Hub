import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { jwtConfig } from '../config'

export const hashToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex')

export interface DecodedToken {
  userId: string
  email: string
  role: string
}

export const generateToken = (userId: string, email: string, role: string): string => {
  return jwt.sign({ userId, email, role }, jwtConfig.accessSecret, {
    expiresIn: jwtConfig.accessExpiresIn,
    algorithm: jwtConfig.algorithm as jwt.Algorithm,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
  } as jwt.SignOptions)
}

export const generateRefreshToken = (userId: string, email: string, role: string): string => {
  return jwt.sign({ userId, email, role, tokenId: crypto.randomUUID() }, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn,
    algorithm: jwtConfig.algorithm as jwt.Algorithm,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
  } as jwt.SignOptions)
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

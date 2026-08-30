import crypto from 'crypto'
import { Request, Response, NextFunction } from 'express'

declare global {
  namespace Express {
    interface Request {
      nonce?: string
    }
  }
}

export const cspNonce = (_req: Request, res: Response, next: NextFunction): void => {
  const nonce = crypto.randomBytes(16).toString('base64')
  res.locals.cspNonce = nonce
  _req.nonce = nonce

  const scriptSrc = `'self' 'nonce-${nonce}'`
  const isDev = process.env.NODE_ENV === 'development'
  const styleSrc = `'self' ${isDev ? "'unsafe-inline' " : ""}https://fonts.googleapis.com`

  res.setHeader(
    'Content-Security-Policy',
    [
      `default-src 'self'`,
      `script-src ${scriptSrc}`,
      `style-src ${styleSrc}`,
      `img-src 'self' data: https: blob:`,
      `font-src 'self' https://fonts.gstatic.com data:`,
      `connect-src 'self' https: ws: wss:`,
      `frame-ancestors 'none'`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
    ].join('; ')
  )

  next()
}

export const getNonce = (res: Response): string => res.locals.cspNonce as string

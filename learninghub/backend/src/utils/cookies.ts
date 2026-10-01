import { Response, Request } from 'express'

export const parseCookies = (cookieHeader: string | undefined): Record<string, string> => {
  if (!cookieHeader) return {}
  const result: Record<string, string> = {}
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=')
    if (idx !== -1) {
      const name = part.substring(0, idx).trim()
      const value = part.substring(idx + 1).trim()
      if (name) result[name] = value
    }
  }
  return result
}

export const cookieMiddleware = (req: Request, _res: Response, next: () => void): void => {
  req.cookies = parseCookies(req.headers.cookie)
  next()
}

// Cookie paths should be configurable via environment
const COOKIE_PATH = process.env.COOKIE_PATH || '/'
const COOKIE_AUTH_PATH = process.env.COOKIE_AUTH_PATH || '/api/v1/auth'

const COOKIE_ACCESS = {
  name: 'access_token',
  maxAge: 15 * 60 * 1000,
  path: COOKIE_PATH,
  sameSite: 'strict' as const,
}

const COOKIE_REFRESH = {
  name: 'refresh_token',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: COOKIE_AUTH_PATH,
  sameSite: 'strict' as const,
}

/**
 * Determine if we should use secure cookies.
 * In production: always secure.
 * In development: secure only behind HTTPS (X-Forwarded-Proto / req.secure).
 * NOTE: `Secure=false` on plain-http dev is intentional — otherwise browsers
 * silently drop the cookie and local auth breaks. Production must terminate
 * TLS at the proxy with `trust proxy` restricted to known proxy IPs (see server.ts).
 */
const getSecureFlag = (req: Request): boolean => {
  if (process.env.NODE_ENV === 'production') return true
  // Check X-Forwarded-Proto header (set by reverse proxy)
  const forwardedProto = req.headers['x-forwarded-proto']
  if (forwardedProto === 'https') return true
  // Check Express's req.secure (works when trust proxy is enabled)
  return req.secure === true
}

export const setAuthCookies = (
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
  req?: Request
): void => {
  const isSecure = req ? getSecureFlag(req) : process.env.NODE_ENV === 'production'

  res.cookie(COOKIE_ACCESS.name, tokens.accessToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: COOKIE_ACCESS.sameSite,
    path: COOKIE_ACCESS.path,
    maxAge: COOKIE_ACCESS.maxAge,
  })

  res.cookie(COOKIE_REFRESH.name, tokens.refreshToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: COOKIE_REFRESH.sameSite,
    path: COOKIE_REFRESH.path,
    maxAge: COOKIE_REFRESH.maxAge,
  })
}

export const clearAuthCookies = (res: Response, req?: Request): void => {
  const isSecure = req ? getSecureFlag(req) : process.env.NODE_ENV === 'production'
  // NOTE: clearCookie attributes must match the attributes used in setAuthCookies
  // (path + sameSite + secure + httpOnly), otherwise browsers keep the original
  // httpOnly cookie and logout appears to succeed while the session cookie survives.
  res.clearCookie(COOKIE_ACCESS.name, {
    httpOnly: true,
    path: COOKIE_ACCESS.path,
    secure: isSecure,
    sameSite: COOKIE_ACCESS.sameSite,
  })
  res.clearCookie(COOKIE_REFRESH.name, {
    httpOnly: true,
    path: COOKIE_REFRESH.path,
    secure: isSecure,
    sameSite: COOKIE_REFRESH.sameSite,
  })
}

export const getRefreshTokenFromCookie = (req: Request): string | undefined => {
  return req.cookies?.[COOKIE_REFRESH.name]
}

export const getAccessTokenFromCookie = (req: Request): string | undefined => {
  return req.cookies?.[COOKIE_ACCESS.name]
}

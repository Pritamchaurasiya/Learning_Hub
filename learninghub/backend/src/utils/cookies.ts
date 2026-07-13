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

const COOKIE_ACCESS = {
  name: 'access_token',
  maxAge: 15 * 60 * 1000,
  path: '/api/v1',
  sameSite: 'strict' as const,
}

const COOKIE_REFRESH = {
  name: 'refresh_token',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/v1/auth',
  sameSite: 'strict' as const,
}

export const setAuthCookies = (
  res: Response,
  tokens: { accessToken: string; refreshToken: string }
): void => {
  const isSecure = process.env.NODE_ENV === 'production' || res.req?.secure === true

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

export const clearAuthCookies = (res: Response): void => {
  const isSecure = process.env.NODE_ENV === 'production' || res.req?.secure
  res.clearCookie(COOKIE_ACCESS.name, {
    path: COOKIE_ACCESS.path,
    secure: isSecure,
    sameSite: COOKIE_ACCESS.sameSite,
  })
  res.clearCookie(COOKIE_REFRESH.name, {
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

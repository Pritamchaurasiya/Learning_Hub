import { SignJWT } from 'jose'
import { Env } from '../types'
import { getSecurityHeaders, getCORSHeaders, hashPassword, verifyPassword } from './security'

export async function generateJWT(payload: object, env: Env): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET)
  const expiresIn = env.JWT_EXPIRES_IN || '7d'

  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret)

  return token
}

export function createJSONResponse(
  data: unknown,
  status: number = 200,
  allowedOrigins: string[] = ['https://learninghub.app'],
  requestOrigin: string | null = null
): Response {
  const securityHeaders = getSecurityHeaders()
  const corsHeaders = getCORSHeaders(allowedOrigins, requestOrigin)

  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...securityHeaders,
      ...corsHeaders,
    },
  })
}

export function createErrorResponse(
  message: string,
  status: number = 400,
  code?: string,
  details?: Record<string, unknown>
): Response {
  return createJSONResponse(
    {
      success: false,
      error: {
        code: code || 'ERROR',
        message,
        ...(details && { details }),
      },
    },
    status
  )
}

export function generateUUID(): string {
  return crypto.randomUUID()
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  meta?: { page?: number; limit?: number; total?: number }
): Record<string, unknown> {
  const response: Record<string, unknown> = {
    success: true,
    data,
  }

  if (meta && meta.total !== undefined) {
    const { page = 1, limit = 10, total } = meta
    response.meta = {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  return response
}

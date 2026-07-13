import { z } from 'zod'
import { logger } from '../utils/logger'
import {
  hashPassword,
  verifyPassword,
  generateJWT,
  createJSONResponse,
  createErrorResponse,
} from '../utils/helpers'
import { verifyToken } from '../middleware/auth'
import { withDb, queryOne } from '../db/connection'
import { requireUser } from '../utils/authHelper'
import { generateSecureToken } from '../utils/security'
import { Env } from '../types'

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  username: z.string().min(3).max(100),
})

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1),
})

export async function handleAuth(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }

  if (path === '/auth/register' && method === 'POST') return handleRegister(request, env)
  if (path === '/auth/login' && method === 'POST') return handleLogin(request, env)
  if (path === '/auth/me' && method === 'GET') return handleGetMe(request, env)
  if (path === '/auth/refresh' && method === 'POST') return handleRefresh(request, env)
  if (path === '/auth/logout' && method === 'POST') return handleLogout(request, env)
  if (path === '/auth/profile' && method === 'GET') return handleGetProfile(request, env)
  if (path === '/auth/profile' && method === 'PUT') return handleUpdateProfile(request, env)
  if (path === '/auth/change-password' && method === 'POST')
    return handleChangePassword(request, env)
  if (path === '/auth/avatar' && method === 'POST') return handleUploadAvatar(request, env)
  if (path === '/auth/delete-account' && method === 'DELETE')
    return handleDeleteAccount(request, env)
  if (path === '/auth/forgot-password' && method === 'POST')
    return handleForgotPassword(request, env)
  if (path === '/auth/reset-password' && method === 'POST') return handleResetPassword(request, env)
  if (path === '/auth/resend-verification' && method === 'POST')
    return handleResendVerification(request, env)
  if (path === '/auth/verify-email' && method === 'POST') return handleVerifyEmail(request, env)

  return createErrorResponse('Not found', 404)
}

interface UserRow {
  id: string
  email: string
  username: string
  password_hash: string
  role: string
  xp: number
  level: number
  streak: number
  created_at: string
  bio?: string
  location?: string
  website?: string
  avatar_url?: string
  last_active?: string
}

async function handleRegister(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return createErrorResponse(`Invalid input: ${parsed.error.message}`)
    }

    const { email, password, username } = parsed.data

    return await withDb(env, async client => {
      const existing = await queryOne<{ id: string }>(
        client,
        'SELECT id FROM users WHERE email = $1',
        [email]
      )
      if (existing) {
        return createErrorResponse('User already exists', 409)
      }

      const passwordHash = await hashPassword(password)
      const user = await queryOne<UserRow>(
        client,
        `INSERT INTO users (email, password_hash, username, role) VALUES ($1, $2, $3, 'student') RETURNING id, email, username, role, xp, level`,
        [email, passwordHash, username]
      )

      if (!user) return createErrorResponse('Failed to create user', 500)

      const token = await generateJWT({ userId: user.id, email: user.email, role: user.role }, env)

      return createJSONResponse(
        {
          token,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            xp: user.xp,
            level: user.level,
          },
          message: 'User registered successfully',
        },
        201
      )
    })
  } catch (error) {
    logger.error('Register error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return createErrorResponse(`Invalid input: ${parsed.error.message}`)
    }

    const { email, password } = parsed.data

    return await withDb(env, async client => {
      const user = await queryOne<UserRow>(
        client,
        `SELECT id, email, username, password_hash, role, xp, level, streak FROM users WHERE email = $1`,
        [email]
      )

      if (!user) return createErrorResponse('Invalid credentials', 401)

      const passwordValid = await verifyPassword(password, user.password_hash)
      if (!passwordValid) return createErrorResponse('Invalid credentials', 401)

      await client.query('UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = $1', [
        user.id,
      ])

      const token = await generateJWT({ userId: user.id, email: user.email, role: user.role }, env)

      return createJSONResponse({
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          xp: user.xp,
          level: user.level,
          streak: user.streak,
        },
        message: 'Login successful',
      })
    })
  } catch (error) {
    logger.error('Login error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleGetMe(request: Request, env: Env): Promise<Response> {
  try {
    const { user, error } = await requireUser(request, env)
    if (error) return error

    return await withDb(env, async client => {
      const userData = await queryOne<UserRow>(
        client,
        `SELECT id, email, username, role, xp, level, streak, created_at FROM users WHERE id = $1`,
        [user.userId]
      )
      if (!userData) return createErrorResponse('User not found', 404)

      return createJSONResponse({ user: userData })
    })
  } catch (error) {
    logger.error('GetMe error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleRefresh(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json()
    const token = body.token ?? body.refresh_token
    if (!token) return createErrorResponse('Token required', 400)

    const payload = await verifyToken(token, env.JWT_SECRET)
    if (!payload) return createErrorResponse('Invalid token', 401)

    return await withDb(env, async client => {
      const user = await queryOne<{ id: string; email: string; role: string }>(
        client,
        'SELECT id, email, role FROM users WHERE id = $1',
        [payload.userId]
      )
      if (!user) return createErrorResponse('User no longer exists', 401)

      const newToken = await generateJWT(
        { userId: user.id, email: user.email, role: user.role },
        env
      )
      return createJSONResponse({ token: newToken })
    })
  } catch (error) {
    logger.error('Refresh error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleLogout(request: Request, env: Env): Promise<Response> {
  try {
    const { user, error } = await requireUser(request, env)
    if (error) return error

    await withDb(env, async client => {
      await client.query('UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = $1', [
        user.userId,
      ])
    })

    return createJSONResponse({ message: 'Logged out successfully' })
  } catch (er) {
    logger.error('Logout error:', er)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleGetProfile(request: Request, env: Env): Promise<Response> {
  try {
    const { user, error } = await requireUser(request, env)
    if (error) return error

    return await withDb(env, async client => {
      const profile = await queryOne<UserRow>(
        client,
        `SELECT id, email, username, role, xp, level, streak, bio, location, website, avatar_url, created_at, last_active FROM users WHERE id = $1`,
        [user.userId]
      )
      if (!profile) return createErrorResponse('User not found', 404)
      return createJSONResponse({ data: profile })
    })
  } catch (er) {
    logger.error('Get profile error:', er)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleUpdateProfile(request: Request, env: Env): Promise<Response> {
  try {
    const { user, error } = await requireUser(request, env)
    if (error) return error

    const body = await request.json()
    const { username, bio, location, website } = body

    return await withDb(env, async client => {
      const updates: Record<string, unknown> = {}
      if (username) updates.username = username
      if (bio !== undefined) updates.bio = bio
      if (location !== undefined) updates.location = location
      if (website !== undefined) updates.website = website

      if (Object.keys(updates).length === 0) {
        return createErrorResponse('No fields to update', 400)
      }

      const result = await queryOne<UserRow>(
        client,
        `UPDATE users SET ${Object.keys(updates)
          .map((k, i) => `${k} = $${i + 1}`)
          .join(
            ', '
          )} WHERE id = $${Object.keys(updates).length + 1} RETURNING id, email, username, role, xp, level, streak, bio, location, website, avatar_url`,
        [...Object.values(updates), user.userId]
      )

      return createJSONResponse({ data: result, message: 'Profile updated' })
    })
  } catch (er) {
    logger.error('Update profile error:', er)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleChangePassword(request: Request, env: Env): Promise<Response> {
  try {
    const { user, error } = await requireUser(request, env)
    if (error) return error

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return createErrorResponse('Current and new password required', 400)
    }
    if (newPassword.length < 8) {
      return createErrorResponse('New password must be at least 8 characters', 400)
    }

    return await withDb(env, async client => {
      const userRow = await queryOne<{ password_hash: string }>(
        client,
        'SELECT password_hash FROM users WHERE id = $1',
        [user.userId]
      )
      if (!userRow) return createErrorResponse('User not found', 404)

      const valid = await verifyPassword(currentPassword, userRow.password_hash)
      if (!valid) return createErrorResponse('Current password is incorrect', 400)

      const newHash = await hashPassword(newPassword)
      await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
        newHash,
        user.userId,
      ])

      return createJSONResponse({ message: 'Password changed successfully' })
    })
  } catch (er) {
    logger.error('Change password error:', er)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleUploadAvatar(request: Request, env: Env): Promise<Response> {
  try {
    const { user, error } = await requireUser(request, env)
    if (error) return error

    const body = await request.json()
    const { avatar_url } = body
    if (!avatar_url) return createErrorResponse('avatar_url required', 400)

    await withDb(env, async client => {
      await client.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [
        avatar_url,
        user.userId,
      ])
    })

    return createJSONResponse({ data: { avatar_url }, message: 'Avatar updated' })
  } catch (er) {
    logger.error('Upload avatar error:', er)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleDeleteAccount(request: Request, env: Env): Promise<Response> {
  try {
    const { user, error } = await requireUser(request, env)
    if (error) return error

    const body = await request.json()
    const { password } = body
    if (!password) return createErrorResponse('Password required to delete account', 400)

    return await withDb(env, async client => {
      const userRow = await queryOne<{ password_hash: string }>(
        client,
        'SELECT password_hash FROM users WHERE id = $1',
        [user.userId]
      )
      if (!userRow) return createErrorResponse('User not found', 404)

      const valid = await verifyPassword(password, userRow.password_hash)
      if (!valid) return createErrorResponse('Invalid password', 400)

      const tables = [
        'enrollments',
        'user_progress',
        'test_attempts',
        'test_results',
        'bookmarks',
        'user_achievements',
        'notifications',
        'certificates',
        'discussions',
        'discussion_replies',
        'discussion_votes',
        'learning_path_enrollments',
        'password_reset_tokens',
        'email_verification_tokens',
        'activity_log',
        'achievements',
        'user_gamification',
      ]
      for (const table of tables) {
        await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [user.userId])
      }
      await client.query('DELETE FROM users WHERE id = $1', [user.userId])

      return createJSONResponse({ message: 'Account deleted successfully' })
    })
  } catch (er) {
    logger.error('Delete account error:', er)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleForgotPassword(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as { email?: string }
    const { email } = body
    if (!email) return createErrorResponse('Email required', 400)

    return await withDb(env, async client => {
      const user = await queryOne<{ id: string; email: string; username: string }>(
        client,
        'SELECT id, email, username FROM users WHERE email = $1',
        [email]
      )

      if (!user) {
        return createJSONResponse({ message: 'If the email exists, a reset link has been sent.' })
      }

      const token = generateSecureToken(32)
      const expiresAt = new Date(Date.now() + 3600000) // 1 hour

      await client.query('UPDATE password_reset_tokens SET used = true WHERE user_id = $1', [
        user.id,
      ])

      await client.query(
        `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
        [user.id, token, expiresAt.toISOString()]
      )

      const resetUrl = `${env.ENVIRONMENT === 'production' ? 'https://learninghub.app' : 'http://localhost:5173'}/reset-password?token=${token}`

      console.log(`[ForgotPassword] Reset URL for ${email}: ${resetUrl}`)

      return createJSONResponse({ message: 'If the email exists, a reset link has been sent.' })
    })
  } catch (error) {
    logger.error('Forgot password error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleResetPassword(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as { token?: string; password?: string }
    const { token, password } = body

    if (!token || !password) return createErrorResponse('Token and password required', 400)
    if (password.length < 8)
      return createErrorResponse('Password must be at least 8 characters', 400)

    return await withDb(env, async client => {
      const row = await queryOne<{ id: string; user_id: string; expires_at: string }>(
        client,
        'SELECT id, user_id, expires_at FROM password_reset_tokens WHERE token = $1 AND used = false',
        [token]
      )

      if (!row) return createErrorResponse('Invalid or expired token', 400)

      const expiresAt = new Date(row.expires_at)
      if (expiresAt < new Date()) return createErrorResponse('Token has expired', 400)

      const passwordHash = await hashPassword(password)
      await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
        passwordHash,
        row.user_id,
      ])
      await client.query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [row.id])

      return createJSONResponse({ message: 'Password reset successfully' })
    })
  } catch (error) {
    logger.error('Reset password error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleResendVerification(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as { email?: string }
    const { email } = body
    if (!email) return createErrorResponse('Email required', 400)

    return await withDb(env, async client => {
      const user = await queryOne<{ id: string; email: string }>(
        client,
        'SELECT id, email FROM users WHERE email = $1',
        [email]
      )
      if (!user)
        return createJSONResponse({
          message: 'If the email exists, a verification link has been sent.',
        })

      const token = generateSecureToken(32)
      const expiresAt = new Date(Date.now() + 86400000) // 24 hours

      await client.query('UPDATE email_verification_tokens SET used = true WHERE user_id = $1', [
        user.id,
      ])

      await client.query(
        `INSERT INTO email_verification_tokens (user_id, email, token, expires_at) VALUES ($1, $2, $3, $4)`,
        [user.id, user.email, token, expiresAt.toISOString()]
      )

      const verifyUrl = `${env.ENVIRONMENT === 'production' ? 'https://learninghub.app' : 'http://localhost:5173'}/verify-email?token=${token}`
      console.log(`[VerifyEmail] Verification URL for ${email}: ${verifyUrl}`)

      return createJSONResponse({
        message: 'If the email exists, a verification link has been sent.',
      })
    })
  } catch (error) {
    logger.error('Resend verification error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleVerifyEmail(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as { token?: string }
    const { token } = body
    if (!token) return createErrorResponse('Token required', 400)

    return await withDb(env, async client => {
      const row = await queryOne<{
        id: string
        user_id: string
        email: string
        expires_at: string
      }>(
        client,
        'SELECT id, user_id, email, expires_at FROM email_verification_tokens WHERE token = $1 AND used = false',
        [token]
      )

      if (!row) return createErrorResponse('Invalid or expired token', 400)

      const expiresAt = new Date(row.expires_at)
      if (expiresAt < new Date()) return createErrorResponse('Token has expired', 400)

      await client.query('UPDATE users SET is_active = true WHERE id = $1', [row.user_id])
      await client.query('UPDATE email_verification_tokens SET used = true WHERE id = $1', [row.id])

      return createJSONResponse({ message: 'Email verified successfully' })
    })
  } catch (error) {
    logger.error('Verify email error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

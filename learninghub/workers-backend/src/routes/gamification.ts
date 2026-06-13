import { withDb } from '../db/connection'
import { createJSONResponse, createErrorResponse } from '../utils/helpers'
import { requireUser } from '../utils/authHelper'
import { Env } from '../types'

export async function handleGamification(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method

  if (method === 'OPTIONS') return new Response(null, { status: 204 })

  if (path === '/gamification/achievements' && method === 'GET') return handleGetAchievements(request, env)
  if (path === '/gamification/my-achievements' && method === 'GET') return handleGetMyAchievements(request, env)
  if (path === '/gamification/leaderboard' && method === 'GET') return handleGetLeaderboard(request, env)
  if (path === '/gamification/streak' && method === 'GET') return handleGetStreak(request, env)
  if (path === '/gamification/xp-history' && method === 'GET') return handleGetXpHistory(request, env)

  return createErrorResponse('Not found', 404)
}

async function handleGetAchievements(request: Request, env: Env): Promise<Response> {
  try {
    return await withDb(env, async (client) => {
      const result = await client.query(
        `SELECT id, name, description, icon, xp_reward, category, criteria
         FROM achievements ORDER BY xp_reward ASC`
      )
      return createJSONResponse({ status: 'success', data: result.rows })
    })
  } catch {
    return createErrorResponse('Failed to load achievements', 500)
  }
}

async function handleGetMyAchievements(request: Request, env: Env): Promise<Response> {
  try {
    const { user, error } = await requireUser(request, env)
    if (error) return error

    return await withDb(env, async (client) => {
      const result = await client.query(
        `SELECT ua.id, ua.achievement_id, ua.earned_at, a.name, a.description, a.icon, a.xp_reward, a.category
         FROM user_achievements ua JOIN achievements a ON ua.achievement_id = a.id
         WHERE ua.user_id = $1 ORDER BY ua.earned_at DESC`,
        [user.userId]
      )
      return createJSONResponse({ status: 'success', data: result.rows })
    })
  } catch (error) {
    console.error('Get my achievements error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleGetLeaderboard(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url)
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')))
    const timeframe = url.searchParams.get('timeframe') || 'all'

    return await withDb(env, async (client) => {
      let query: string
      if (timeframe === 'weekly') {
        query = `SELECT u.id, u.username, u.xp, u.level, u.streak, u.avatar_url,
                        COALESCE(SUM(ta.xp_earned), 0) as period_xp
                 FROM users u
                 LEFT JOIN test_attempts ta ON ta.user_id = u.id AND ta.submitted_at > NOW() - INTERVAL '7 days'
                 GROUP BY u.id ORDER BY period_xp DESC, u.xp DESC LIMIT $1`
      } else if (timeframe === 'monthly') {
        query = `SELECT u.id, u.username, u.xp, u.level, u.streak, u.avatar_url,
                        COALESCE(SUM(ta.xp_earned), 0) as period_xp
                 FROM users u
                 LEFT JOIN test_attempts ta ON ta.user_id = u.id AND ta.submitted_at > NOW() - INTERVAL '30 days'
                 GROUP BY u.id ORDER BY period_xp DESC, u.xp DESC LIMIT $1`
      } else {
        query = `SELECT id, username, xp, level, streak, avatar_url FROM users ORDER BY xp DESC LIMIT $1`
      }

      const result = await client.query(query, [limit])
      return createJSONResponse({ status: 'success', data: result.rows })
    })
  } catch (error) {
    console.error('Get leaderboard error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleGetStreak(request: Request, env: Env): Promise<Response> {
  try {
    const { user, error } = await requireUser(request, env)
    if (error) return error

    return await withDb(env, async (client) => {
      const result = await client.query(
        `SELECT streak, last_active,
                CASE WHEN last_active = CURRENT_DATE THEN true ELSE false END as active_today
         FROM users WHERE id = $1`,
        [user.userId]
      )

      if (result.rows.length === 0) return createErrorResponse('User not found', 404)

      const activityResult = await client.query(
        `SELECT DATE(created_at) as date
         FROM test_results WHERE user_id = $1 AND completed_at > NOW() - INTERVAL '30 days'
         GROUP BY DATE(created_at) ORDER BY DATE(created_at) DESC`,
        [user.userId]
      )

      return createJSONResponse({
        status: 'success',
        data: {
          streak: result.rows[0].streak,
          lastActive: result.rows[0].last_active,
          activeToday: result.rows[0].active_today,
          activity: activityResult.rows.map(r => r.date),
        },
      })
    })
  } catch (error) {
    console.error('Get streak error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleGetXpHistory(request: Request, env: Env): Promise<Response> {
  try {
    const { user, error } = await requireUser(request, env)
    if (error) return error

    return await withDb(env, async (client) => {
      const result = await client.query(
        `SELECT ta.submitted_at as date, ta.xp_earned, t.title as source, 'test_completion' as type
         FROM test_attempts ta JOIN tests t ON ta.test_id = t.id
         WHERE ta.user_id = $1 AND ta.xp_earned > 0
         ORDER BY ta.submitted_at DESC LIMIT 50`,
        [user.userId]
      )
      return createJSONResponse({ status: 'success', data: result.rows })
    })
  } catch (error) {
    console.error('Get XP history error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

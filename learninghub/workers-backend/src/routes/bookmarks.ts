import { Entity } from '@neondatabase/serverless'
import { createJSONResponse, createErrorResponse } from '../utils/helpers'
import { withDb, queryOne } from '../db/connection'
import { requireUser } from '../utils/authHelper'
import { Env } from '../types'

export async function handleBookmarks(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method

  if (method === 'OPTIONS') return new Response(null, { status: 204 })

  if (path === '/bookmarks' && method === 'GET') return handleListBookmarks(request, env)
  if (path === '/bookmarks' && method === 'POST') return handleAddBookmark(request, env)

  const removeMatch = path.match(/^\/bookmarks\/([^/]+)$/)
  if (removeMatch && method === 'DELETE') return handleRemoveBookmark(request, env, removeMatch[1])

  const checkMatch = path.match(/^\/bookmarks\/check\/([^/]+)$/)
  if (checkMatch && method === 'GET') return handleCheckBookmark(request, env, checkMatch[1])

  return createErrorResponse('Not found', 404)
}

async function handleListBookmarks(request: Request, env: Env): Promise<Response> {
  try {
    const { user, error } = await requireUser(request, env)
    if (error) return error

    const url = new URL(request.url)
    const type = url.searchParams.get('type')

    return await withDb(env, async (client) => {
      const query = type
        ? `SELECT b.id, b.item_id, b.item_type, b.created_at,
                  CASE WHEN b.item_type = 'course' THEN (SELECT title FROM courses WHERE id = b.item_id)
                       WHEN b.item_type = 'test' THEN (SELECT title FROM tests WHERE id = b.item_id)
                  END as title
           FROM bookmarks b WHERE b.user_id = $1 AND b.item_type = $2 ORDER BY b.created_at DESC`
        : `SELECT b.id, b.item_id, b.item_type, b.created_at,
                  CASE WHEN b.item_type = 'course' THEN (SELECT title FROM courses WHERE id = b.item_id)
                       WHEN b.item_type = 'test' THEN (SELECT title FROM tests WHERE id = b.item_id)
                  END as title
           FROM bookmarks b WHERE b.user_id = $1 ORDER BY b.created_at DESC`

      const params = type ? [user.userId, type] : [user.userId]
      const result = await client.query(query, params)

      return createJSONResponse({ status: 'success', data: result.rows })
    })
  } catch (error) {
    console.error('List bookmarks error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleAddBookmark(request: Request, env: Env): Promise<Response> {
  try {
    const { user, error } = await requireUser(request, env)
    if (error) return error

    const body = await request.json()
    const { item_id, item_type } = body

    if (!item_id || !item_type) return createErrorResponse('item_id and item_type required', 400)
    if (!['course', 'test'].includes(item_type)) return createErrorResponse('item_type must be course or test', 400)

    return await withDb(env, async (client) => {
      const existing = await queryOne<{ id: string }>(client, 'SELECT id FROM bookmarks WHERE user_id = $1 AND item_id = $2', [user.userId, item_id])
      if (existing) return createJSONResponse({ status: 'success', data: existing, message: 'Already bookmarked' })

      const result = await queryOne(
        client,
        `INSERT INTO bookmarks (id, user_id, item_id, item_type) VALUES (gen_random_uuid(), $1, $2, $3) RETURNING id, item_id, item_type, created_at`,
        [user.userId, item_id, item_type]
      )

      return createJSONResponse({ status: 'success', data: result }, 201)
    })
  } catch (error) {
    console.error('Add bookmark error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleRemoveBookmark(request: Request, env: Env, bookmarkId: string): Promise<Response> {
  try {
    const { user, error } = await requireUser(request, env)
    if (error) return error

    return await withDb(env, async (client) => {
      await client.query('DELETE FROM bookmarks WHERE id = $1 AND user_id = $2', [bookmarkId, user.userId])
      return createJSONResponse({ status: 'success', message: 'Bookmark removed' })
    })
  } catch (error) {
    console.error('Remove bookmark error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function handleCheckBookmark(request: Request, env: Env, itemId: string): Promise<Response> {
  try {
    const { user, error } = await requireUser(request, env)
    if (error) return error

    return await withDb(env, async (client) => {
      const result = await queryOne<{ id: string; item_type: string }>(client, 'SELECT id, item_type FROM bookmarks WHERE user_id = $1 AND item_id = $2', [user.userId, itemId])
      return createJSONResponse({ status: 'success', data: { bookmarked: !!result, bookmark: result } })
    })
  } catch (error) {
    console.error('Check bookmark error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

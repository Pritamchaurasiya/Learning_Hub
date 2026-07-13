import { createJSONResponse, createSuccessResponse } from '../utils/helpers'
import { requireUser } from '../utils/authHelper'
import { withDb } from '../db/connection'
import { Env } from '../types'

export async function handleNotifications(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env)
  if (user instanceof Response) return user

  const url = new URL(request.url)
  const method = request.method

  if (method === 'GET') {
    const unreadOnly = url.searchParams.get('unread') === 'true'

    const rows = await withDb(env, async client => {
      const query = unreadOnly
        ? `SELECT * FROM notifications WHERE user_id = $1 AND read = false ORDER BY created_at DESC LIMIT 50`
        : `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`
      const r = await client.query(query, [user.userId])
      return r.rows
    })

    const notifications = rows.map((n: any) => ({
      id: n.id,
      userId: n.user_id,
      title: n.title,
      message: n.message,
      type: n.type || 'info',
      read: n.read || false,
      createdAt: n.created_at,
      metadata: n.metadata ? JSON.parse(n.metadata) : undefined,
    }))

    const _unreadCount = await withDb(env, async client => {
      const r = await client.query(
        'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = false',
        [user.userId]
      )
      return parseInt(r.rows[0].count, 10)
    })

    return createJSONResponse(createSuccessResponse(notifications))
  }

  if (method === 'POST' && url.pathname.endsWith('/mark-all-read')) {
    await withDb(env, async client => {
      await client.query('UPDATE notifications SET read = true WHERE user_id = $1', [user.userId])
    })
    return createJSONResponse(createSuccessResponse({ success: true }))
  }

  const pathParts = url.pathname.split('/').filter(Boolean)

  if (pathParts[0] === 'notifications' && pathParts.length >= 2) {
    const id = pathParts[1]

    if (method === 'POST' && pathParts[2] === 'read') {
      await withDb(env, async client => {
        await client.query('UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2', [
          id,
          user.userId,
        ])
      })
      return createJSONResponse(createSuccessResponse({ success: true }))
    }

    if (method === 'DELETE') {
      await withDb(env, async client => {
        await client.query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [
          id,
          user.userId,
        ])
      })
      return createJSONResponse(createSuccessResponse({ success: true }))
    }
  }

  return createJSONResponse(createSuccessResponse([]))
}

export async function handleCertificates(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env)
  if (user instanceof Response) return user

  const url = new URL(request.url)
  const method = request.method

  if (method === 'GET' && url.pathname === '/certificates/my-certificates') {
    const rows = await withDb(env, async client => {
      const r = await client.query(
        'SELECT * FROM certificates WHERE user_id = $1 ORDER BY issued_at DESC',
        [user.userId]
      )
      return r.rows
    })

    const certificates = rows.map((c: any) => ({
      id: c.id,
      userId: c.user_id,
      courseId: c.course_id,
      courseName: c.course_name,
      code: c.code,
      issuedAt: c.issued_at,
      downloadUrl: c.download_url,
    }))

    return createJSONResponse(createSuccessResponse(certificates))
  }

  if (method === 'GET' && url.pathname.match(/^\/certificates\/([^/]+)$/)) {
    const code = url.pathname.split('/')[2]
    const rows = await withDb(env, async client => {
      const r = await client.query('SELECT * FROM certificates WHERE code = $1', [code])
      return r.rows
    })

    if (rows.length === 0) {
      return createJSONResponse(createSuccessResponse(null))
    }

    const c = rows[0]
    return createJSONResponse(
      createSuccessResponse({
        id: c.id,
        courseName: c.course_name,
        userName: c.user_name,
        issuedAt: c.issued_at,
        code: c.code,
      })
    )
  }

  if (method === 'POST' && url.pathname === '/certificates/generate') {
    const body = (await request.json()) as any
    const { courseId, courseName } = body

    if (!courseId || !courseName) {
      return createJSONResponse({ success: false, error: 'courseId and courseName required' }, 400)
    }

    const code = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    await withDb(env, async client => {
      await client.query(
        `INSERT INTO certificates (user_id, course_id, course_name, code, issued_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (user_id, course_id) DO NOTHING`,
        [user.userId, courseId, courseName, code]
      )
    })

    return createJSONResponse(createSuccessResponse({ code, downloadUrl: `/certificates/${code}` }))
  }

  return createJSONResponse(createSuccessResponse([]))
}

export async function handleDiscussions(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env)
  if (user instanceof Response) return user

  const url = new URL(request.url)
  const method = request.method
  const path = url.pathname

  if (method === 'GET' && (path === '/discussions/threads' || path === '/discussions/threads/')) {
    const search = url.searchParams.get('q') || ''
    const courseId = url.searchParams.get('courseId')

    let query = `
      SELECT d.*, u.name as author_name, u.avatar_url as author_avatar,
        (SELECT COUNT(*) FROM discussion_replies r WHERE r.thread_id = d.id) as reply_count
      FROM discussions d
      JOIN users u ON u.id = d.user_id
    `
    const params: string[] = []
    const conditions: string[] = []

    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(d.title ILIKE $${params.length} OR d.content ILIKE $${params.length})`)
    }
    if (courseId) {
      params.push(courseId)
      conditions.push(`d.course_id = $${params.length}`)
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`
    }

    query += ' ORDER BY d.pinned DESC, d.created_at DESC LIMIT 50'

    const rows = await withDb(env, async client => {
      const r = await client.query(query, params)
      return r.rows
    })

    const discussions = rows.map((d: any) => ({
      id: d.id,
      title: d.title,
      content: d.content,
      courseId: d.course_id,
      author: { id: d.user_id, name: d.author_name, avatar: d.author_avatar },
      replyCount: parseInt(d.reply_count, 10),
      pinned: d.pinned || false,
      resolved: d.resolved || false,
      createdAt: d.created_at,
      tags: d.tags || [],
    }))

    return createJSONResponse(createSuccessResponse(discussions))
  }

  if (method === 'GET' && path.match(/^\/discussions\/threads\/([^/]+)$/)) {
    const id = path.split('/')[3]
    const rows = await withDb(env, async client => {
      const r = await client.query(
        `SELECT d.*, u.name as author_name, u.avatar_url as author_avatar
         FROM discussions d JOIN users u ON u.id = d.user_id WHERE d.id = $1`,
        [id]
      )
      return r.rows
    })
    if (rows.length === 0) return createJSONResponse(createSuccessResponse(null))
    const d = rows[0]
    return createJSONResponse(
      createSuccessResponse({
        id: d.id,
        title: d.title,
        content: d.content,
        courseId: d.course_id,
        author: { id: d.user_id, name: d.author_name, avatar: d.author_avatar },
        pinned: d.pinned || false,
        resolved: d.resolved || false,
        createdAt: d.created_at,
        tags: d.tags || [],
      })
    )
  }

  if (method === 'POST' && path === '/discussions/threads') {
    const body = (await request.json()) as any
    const { title, content, courseId, tags } = body
    if (!title || !content) {
      return createJSONResponse({ success: false, error: 'title and content required' }, 400)
    }

    await withDb(env, async client => {
      await client.query(
        `INSERT INTO discussions (user_id, title, content, course_id, tags, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [user.userId, title, content, courseId || null, tags ? JSON.stringify(tags) : '[]']
      )
    })

    return createJSONResponse(createSuccessResponse({ success: true }))
  }

  if (method === 'POST' && path.match(/^\/discussions\/threads\/([^/]+)\/vote$/)) {
    const id = path.split('/')[3]
    await withDb(env, async client => {
      await client.query(
        `INSERT INTO discussion_votes (thread_id, user_id, created_at) VALUES ($1, $2, NOW())
         ON CONFLICT DO NOTHING`,
        [id, user.userId]
      )
      await client.query('UPDATE discussions SET votes = votes + 1 WHERE id = $1', [id])
    })
    return createJSONResponse(createSuccessResponse({ success: true }))
  }

  if (method === 'POST' && path.match(/^\/discussions\/threads\/([^/]+)\/pin$/)) {
    await withDb(env, async client => {
      const id = path.split('/')[3]
      await client.query('UPDATE discussions SET pinned = NOT pinned WHERE id = $1', [id])
    })
    return createJSONResponse(createSuccessResponse({ success: true }))
  }

  if (method === 'POST' && path.match(/^\/discussions\/threads\/([^/]+)\/resolve$/)) {
    await withDb(env, async client => {
      const id = path.split('/')[3]
      await client.query('UPDATE discussions SET resolved = true WHERE id = $1', [id])
    })
    return createJSONResponse(createSuccessResponse({ success: true }))
  }

  if (method === 'GET' && path.match(/^\/discussions\/threads\/([^/]+)\/replies$/)) {
    const threadId = path.split('/')[3]
    const rows = await withDb(env, async client => {
      const r = await client.query(
        `SELECT r.*, u.name as author_name, u.avatar_url as author_avatar
         FROM discussion_replies r JOIN users u ON u.id = r.user_id
         WHERE r.thread_id = $1 ORDER BY r.created_at ASC`,
        [threadId]
      )
      return r.rows
    })
    const replies = rows.map((r: any) => ({
      id: r.id,
      content: r.content,
      author: { id: r.user_id, name: r.author_name, avatar: r.author_avatar },
      accepted: r.accepted || false,
      createdAt: r.created_at,
    }))
    return createJSONResponse(createSuccessResponse(replies))
  }

  if (method === 'POST' && path.match(/^\/discussions\/threads\/([^/]+)\/replies$/)) {
    const threadId = path.split('/')[3]
    const body = (await request.json()) as any
    const { content } = body
    if (!content) return createJSONResponse({ success: false, error: 'content required' }, 400)

    await withDb(env, async client => {
      await client.query(
        `INSERT INTO discussion_replies (thread_id, user_id, content, created_at) VALUES ($1, $2, $3, NOW())`,
        [threadId, user.userId, content]
      )
    })
    return createJSONResponse(createSuccessResponse({ success: true }))
  }

  if (method === 'GET' && path === '/discussions/trending') {
    const limit = parseInt(url.searchParams.get('limit') || '10', 10)
    const rows = await withDb(env, async client => {
      const r = await client.query(
        `SELECT d.*, u.name as author_name,
          (SELECT COUNT(*) FROM discussion_replies r WHERE r.thread_id = d.id) as reply_count
         FROM discussions d JOIN users u ON u.id = d.user_id
         ORDER BY (d.votes + (SELECT COUNT(*) FROM discussion_replies r WHERE r.thread_id = d.id) * 2) DESC
         LIMIT $1`,
        [limit]
      )
      return r.rows
    })
    return createJSONResponse(
      createSuccessResponse(
        rows.map((d: any) => ({
          id: d.id,
          title: d.title,
          content: d.content,
          author: { id: d.user_id, name: d.author_name },
          replyCount: parseInt(d.reply_count, 10),
          createdAt: d.created_at,
        }))
      )
    )
  }

  if (method === 'GET' && path === '/discussions/threads/search') {
    const q = url.searchParams.get('q') || ''
    const rows = await withDb(env, async client => {
      const r = await client.query(
        `SELECT d.*, u.name as author_name FROM discussions d JOIN users u ON u.id = d.user_id
         WHERE d.title ILIKE $1 OR d.content ILIKE $1 ORDER BY d.created_at DESC LIMIT 20`,
        [`%${q}%`]
      )
      return r.rows
    })
    return createJSONResponse(createSuccessResponse(rows))
  }

  return createJSONResponse(createSuccessResponse([]))
}

export async function handleLearningPaths(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env)
  if (user instanceof Response) return user

  const url = new URL(request.url)
  const method = request.method
  const path = url.pathname

  if (method === 'GET' && (path === '/learning-paths' || path === '/learning-paths/')) {
    const rows = await withDb(env, async client => {
      const r = await client.query('SELECT * FROM learning_paths ORDER BY title ASC')
      return r.rows
    })
    return createJSONResponse(
      createSuccessResponse(
        rows.map((lp: any) => ({
          id: lp.id,
          title: lp.title,
          description: lp.description,
          courseCount: lp.course_count,
          estimatedHours: lp.estimated_hours,
          level: lp.level,
          thumbnail: lp.thumbnail,
        }))
      )
    )
  }

  if (method === 'GET' && path.match(/^\/learning-paths\/([^/]+)\/?$/)) {
    const id = path.split('/')[2]
    const rows = await withDb(env, async client => {
      const r = await client.query('SELECT * FROM learning_paths WHERE id = $1', [id])
      return r.rows
    })
    if (rows.length === 0) return createJSONResponse(createSuccessResponse(null))
    const lp = rows[0]
    return createJSONResponse(
      createSuccessResponse({
        id: lp.id,
        title: lp.title,
        description: lp.description,
        courseCount: lp.course_count,
        estimatedHours: lp.estimated_hours,
        level: lp.level,
        thumbnail: lp.thumbnail,
        courses: lp.courses || [],
      })
    )
  }

  if (method === 'POST' && path.match(/^\/learning-paths\/([^/]+)\/enroll\/?$/)) {
    const id = path.split('/')[2]
    await withDb(env, async client => {
      await client.query(
        `INSERT INTO learning_path_enrollments (user_id, path_id, enrolled_at)
         VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING`,
        [user.userId, id]
      )
    })
    return createJSONResponse(createSuccessResponse({ success: true }))
  }

  if (method === 'GET' && path === '/learning-paths/my-progress') {
    const rows = await withDb(env, async client => {
      const r = await client.query(
        `SELECT lpe.*, lp.title, lp.description, lp.course_count
         FROM learning_path_enrollments lpe
         JOIN learning_paths lp ON lp.id = lpe.path_id
         WHERE lpe.user_id = $1 ORDER BY lpe.enrolled_at DESC`,
        [user.userId]
      )
      return r.rows
    })
    return createJSONResponse(createSuccessResponse(rows))
  }

  return createJSONResponse(createSuccessResponse([]))
}

export async function handleSearch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const method = request.method

  if (method === 'GET') {
    const q = url.searchParams.get('q') || ''
    const type = url.searchParams.get('type') || 'all'
    const limit = parseInt(url.searchParams.get('limit') || '20', 10)

    const results: any[] = []

    if (type === 'all' || type === 'courses') {
      const rows = await withDb(env, async client => {
        const r = await client.query(
          `SELECT id, title, description, level, thumbnail, 'course' as type FROM courses
           WHERE title ILIKE $1 OR description ILIKE $1
           ORDER BY enrolled_count DESC LIMIT $2`,
          [`%${q}%`, limit]
        )
        return r.rows
      })
      results.push(...rows)
    }

    return createJSONResponse(createSuccessResponse(results))
  }

  if (method === 'GET' && url.pathname === '/search/suggestions') {
    const q = url.searchParams.get('q') || ''
    const rows = await withDb(env, async client => {
      const r = await client.query(`SELECT title FROM courses WHERE title ILIKE $1 LIMIT 5`, [
        `%${q}%`,
      ])
      return r.rows
    })
    return createJSONResponse(createSuccessResponse(rows.map((r: any) => r.title)))
  }

  if (method === 'GET' && url.pathname === '/search/trending') {
    const rows = await withDb(env, async client => {
      const r = await client.query(
        `SELECT id, title, enrolled_count FROM courses ORDER BY enrolled_count DESC LIMIT 10`
      )
      return r.rows
    })
    return createJSONResponse(createSuccessResponse(rows))
  }

  return createJSONResponse(createSuccessResponse([]))
}

export async function handleLeaderboard(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const method = request.method

  if (method === 'GET' && url.pathname === '/leaderboard/me') {
    const user = await requireUser(request, env)
    if (user instanceof Response) return user

    const rows = await withDb(env, async client => {
      const r = await client.query(
        `SELECT u.id, u.name, u.avatar_url, COALESCE(ug.xp, 0) as xp,
          RANK() OVER (ORDER BY COALESCE(ug.xp, 0) DESC) as rank
         FROM users u
         LEFT JOIN user_gamification ug ON ug.user_id = u.id
         WHERE u.id = $1`,
        [user.userId]
      )
      return r.rows
    })

    if (rows.length === 0) {
      return createJSONResponse(createSuccessResponse(null))
    }
    const row = rows[0]
    return createJSONResponse(
      createSuccessResponse({
        userId: row.id,
        name: row.name,
        avatar: row.avatar_url,
        xp: parseInt(row.xp, 10),
        rank: parseInt(row.rank, 10),
      })
    )
  }

  return createJSONResponse(createSuccessResponse([]))
}

export async function handleMedia(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env)
  if (user instanceof Response) return user

  const url = new URL(request.url)
  if (url.pathname === '/media/avatar' && request.method === 'POST') {
    const formData = await request.formData()
    const file = formData.get('avatar') as File | null
    if (!file) {
      return createJSONResponse({ success: false, error: 'No avatar file provided' }, 400)
    }

    const buffer = await file.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))

    await withDb(env, async client => {
      await client.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [
        `data:${file.type};base64,${base64}`,
        user.userId,
      ])
    })

    return createJSONResponse(
      createSuccessResponse({ url: `data:${file.type};base64,${base64.substring(0, 50)}...` })
    )
  }

  return createJSONResponse({ success: false, error: 'Not found' }, 404)
}

const STUB_PATHS: Record<string, () => Record<string, unknown>> = {
  problems: () => ({
    data: { results: [], total: 0, page: 1, pages: 0 },
    status: 'success',
  }),
  contests: () => ({
    data: [],
    status: 'success',
  }),
  'live-sessions': () => ({
    data: [],
    status: 'success',
  }),
  monitoring: () => ({
    metrics: {},
    status: 'healthy',
    database: 'connected',
    cache: 'ok',
  }),
  web3: () => ({
    data: null,
    status: 'success',
  }),
  commerce: () => ({
    data: { items: [], total: 0 },
    status: 'success',
  }),
  payments: () => ({
    data: null,
    status: 'success',
  }),
  badges: () => ({
    data: [],
    status: 'success',
  }),
  'study-groups': () => ({
    data: [],
    status: 'success',
  }),
  'study-goals': () => ({
    data: [],
    status: 'success',
  }),
  tutors: () => ({
    data: [],
    status: 'success',
  }),
  'exam-content': () => ({
    data: [],
    status: 'success',
  }),
  downloads: () => ({
    data: [],
    status: 'success',
  }),
}

export function getStubResponse(path: string): { data: Record<string, unknown> } | null {
  const prefix = path.split('/').filter(Boolean)[0]
  const handler = STUB_PATHS[prefix]
  if (handler) {
    return { data: handler() }
  }
  return null
}

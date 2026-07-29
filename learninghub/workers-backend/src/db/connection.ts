import { Client } from '@neondatabase/serverless'
import { Env } from '../types'

export type DbRow<T> = T
export type DbRows<T> = T[]

export interface DbResult<T> {
  rows: T[]
  rowCount: number | null
}

export async function createDbClient(env: Env): Promise<Client> {
  const client = new Client(env.DATABASE_URL)
  await client.connect()
  return client
}

export async function query<T = unknown>(
  client: Client,
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await client.query(sql, params)
  return result.rows as T[]
}

export async function queryOne<T = unknown>(
  client: Client,
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const result = await client.query(sql, params)
  return (result.rows[0] as T) || null
}

/**
 * Build a parameterized UPDATE query to prevent SQL injection.
 * Uses positional parameters ($1, $2, ...) for all values.
 */


/**
 * Build a parameterized SELECT query with WHERE conditions.
 */
export function buildSelectQuery(
  table: string,
  columns: string[],
  where?: Record<string, unknown>
): { text: string; values: unknown[] } {
  const columnList = columns.map(c => `"${c}"`).join(', ')
  let text = `SELECT ${columnList} FROM "${table}"`
  const values: unknown[] = []
  if (where) {
    const whereClause = Object.keys(where).map((k, i) => `"${k}" = $${i + 1}`).join(' AND ')
    text += ` WHERE ${whereClause}`
    values.push(...Object.values(where))
  }
  return { text, values }
}

export function withClient<T>(env: Env, fn: (client: Client) => Promise<T>): Promise<T> {
  return withDb(env, fn)
}

export async function withDb<T>(env: Env, fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client(env.DATABASE_URL)
  try {
    await client.connect()
    return await fn(client)
  } finally {
    try {
      await client.end()
    } catch {
      // ignore cleanup errors
    }
  }
}

// Allowed identifiers for SQL injection prevention
const ALLOWED_TABLES = new Set([
  'users', 'courses', 'lessons', 'tests', 'questions', 'test_attempts', 'test_results',
  'user_progress', 'enrollments', 'bookmarks', 'achievements', 'user_achievements',
  'activity_log', 'notifications', 'certificates', 'discussions', 'discussion_replies',
  'discussion_votes', 'learning_paths', 'learning_path_enrollments',
  'password_reset_tokens', 'email_verification_tokens'
])

const ALLOWED_COLUMNS = new Set([
  'id', 'email', 'username', 'password', 'role', 'xp', 'level', 'streak', 'longest_streak',
  'last_active', 'last_login_at', 'login_count', 'failed_logins', 'locked_until',
  'email_verified', 'email_verified_at', 'mfa_enabled', 'mfa_secret', 'created_at', 'updated_at',
  'deleted_at', 'avatar', 'bio', 'location', 'website', 'date_of_birth', 'timezone',
  'preferred_language', 'country_id', 'title', 'description', 'time_limit', 'passing_score',
  'max_attempts', 'mode', 'difficulty', 'total_marks', 'negative_marks', 'is_published',
  'is_ai_generated', 'template_id', 'exam_id', 'search_vector', 'text', 'type', 'bloom_level',
  'explanation', 'solution_steps', 'tags', 'points', 'order', 'is_correct', 'image_url',
  'slug', 'category', 'starter_code', 'test_cases', 'user_id', 'course_id', 'lesson_id',
  'test_id', 'question_id', 'status', 'score', 'total_points', 'percentage', 'passed',
  'time_taken', 'started_at', 'completed_at', 'attempt_number', 'selected_options',
  'text_answer', 'confidence', 'marks_obtained', 'ai_feedback', 'progress', 'notes',
  'achievement_id', 'name', 'icon', 'unlocked_at', 'activity_type', 'entity_type', 'entity_id',
  'metadata', 'ip_address', 'user_agent', 'session_id', 'token', 'expires_at', 'used_at',
  'revoked_at', 'revoked_by', 'device_id', 'device_name', 'device_type', 'ip_address',
  'user_agent', 'location', 'is_revoked', 'last_used_at', 'action', 'entity_type', 'entity_id',
  'old_values', 'new_values', 'severity', 'description', 'request_id', 'exam_type', 'year',
  'paper', 'answer', 'difficulty', 'marks', 'negative_marks', 'formula', 'variables', 'examples',
  'content', 'key_points', 'code', 'flag_emoji', 'is_active', 'pattern', 'slug', 'icon',
  'daily_goal', 'subject_ids', 'country_id', 'exam_id', 'topic', 'title', 'content'
])

function sanitizeIdentifier(identifier: string, allowed: Set<string>): string {
  const clean = identifier.replace(/[^a-zA-Z0-9_]/g, '')
  if (!allowed.has(clean)) {
    throw new Error(`Invalid identifier: ${identifier}`)
  }
  return clean
}

export function buildUpdateQuery(
  table: string,
  fields: Record<string, unknown>,
  whereColumn: string,
  whereValue: unknown,
  returning = '*'
): { text: string; values: unknown[] } {
  const safeTable = sanitizeIdentifier(table, ALLOWED_TABLES)
  const safeWhereColumn = sanitizeIdentifier(whereColumn, ALLOWED_COLUMNS)
  const safeReturning = returning === '*' ? '*' : sanitizeIdentifier(returning, ALLOWED_COLUMNS)

  const entries = Object.entries(fields).filter(([, v]) => v !== undefined)
  if (entries.length === 0) {
    return { text: '', values: [] }
  }

  const setClauses: string[] = []
  const values: unknown[] = []
  let idx = 1

  for (const [col, val] of entries) {
    const safeCol = sanitizeIdentifier(col, ALLOWED_COLUMNS)
    setClauses.push(`${safeCol} = $${idx++}`)
    values.push(val)
  }

  values.push(whereValue)
  const text = `UPDATE "${safeTable}" SET ${setClauses.join(', ')} WHERE "${safeWhereColumn}" = $${idx}${returning ? ` RETURNING ${safeReturning}` : ''}`

  return { text, values }
}

export function buildInsertQuery(
  table: string,
  data: Record<string, unknown>,
  returning = '*'
): { text: string; values: unknown[] } {
  const safeTable = sanitizeIdentifier(table, ALLOWED_TABLES)
  const safeReturning = returning === '*' ? '*' : sanitizeIdentifier(returning, ALLOWED_COLUMNS)

  const cols: string[] = []
  const placeholders: string[] = []
  const values: unknown[] = []
  let idx = 1

  for (const [col, val] of Object.entries(data)) {
    if (val === undefined) continue
    const safeCol = sanitizeIdentifier(col, ALLOWED_COLUMNS)
    cols.push(safeCol)
    placeholders.push(`$${idx++}`)
    values.push(val)
  }

  const text = `INSERT INTO "${safeTable}" (${cols.join(', ')}) VALUES (${placeholders.join(', ')})${returning ? ` RETURNING ${safeReturning}` : ''}`

  return { text, values }
}

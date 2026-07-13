import { Client } from '@neondatabase/serverless'

export interface Env {
  DATABASE_URL: string
}

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

export function buildUpdateQuery(
  table: string,
  fields: Record<string, unknown>,
  whereColumn: string,
  whereValue: unknown,
  returning = '*'
): { text: string; values: unknown[] } {
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined)
  if (entries.length === 0) {
    return { text: '', values: [] }
  }

  const setClauses: string[] = []
  const values: unknown[] = []
  let idx = 1

  for (const [col, val] of entries) {
    setClauses.push(`${col} = $${idx++}`)
    values.push(val)
  }

  values.push(whereValue)
  const text = `UPDATE ${table} SET ${setClauses.join(', ')} WHERE ${whereColumn} = $${idx}${returning ? ` RETURNING ${returning}` : ''}`

  return { text, values }
}

export function buildInsertQuery(
  table: string,
  data: Record<string, unknown>,
  returning = '*'
): { text: string; values: unknown[] } {
  const cols: string[] = []
  const placeholders: string[] = []
  const values: unknown[] = []
  let idx = 1

  for (const [col, val] of Object.entries(data)) {
    if (val === undefined) continue
    cols.push(col)
    placeholders.push(`$${idx++}`)
    values.push(val)
  }

  const text = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')})${returning ? ` RETURNING ${returning}` : ''}`

  return { text, values }
}

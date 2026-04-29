import { Client } from '@neondatabase/serverless';

export interface Env {
  DATABASE_URL: string;
}

export async function createDBClient(env: Env): Promise<Client> {
  const client = new Client(env.DATABASE_URL);
  await client.connect();
  return client;
}

export async function query<T = any>(client: Client, sql: string, params?: any[]): Promise<T[]> {
  const result = await client.query(sql, params);
  return result.rows as T[];
}

export async function queryOne<T = any>(client: Client, sql: string, params?: any[]): Promise<T | null> {
  const result = await client.query(sql, params);
  return result.rows[0] as T || null;
}

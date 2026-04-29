/// <reference types="@cloudflare/workers-types" />

/**
 * Execution context for Cloudflare Workers fetch handler
 */
export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

/**
 * Environment bindings for Cloudflare Workers
 */
export interface Env {
  // KV Namespaces
  LEARNINGHUB_KV: KVNamespace;
  
  // D1 Database
  DB: D1Database;
  
  // Environment secrets
  JWT_SECRET: string;
  JWT_EXPIRES_IN?: string;
  DATABASE_URL?: string;
  HUGGINGFACE_API_KEY?: string;
  ENVIRONMENT?: string;
  
  // Optional: R2 bucket if used
  LEARNINGHUB_BUCKET?: R2Bucket;
  
  // Optional: Queue if used
  LEARNINGHUB_QUEUE?: Queue;
}

/**
 * Standard API response structure
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    requestId: string;
    timestamp: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

/**
 * User context from JWT
 */
export interface UserContext {
  userId: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  iat: number;
  exp: number;
}

/**
 * Request context with logging
 */
export interface RequestContext {
  requestId: string;
  userId?: string;
  path: string;
  method: string;
  startTime: number;
}

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  requestId: string;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

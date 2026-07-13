/**
 * Environment Variable Validation
 *
 * Validates all required environment variables on startup.
 * Prevents application from starting with missing or invalid configuration.
 */

import { z } from 'zod'

// Environment variable schema
const envSchema = z.object({
  // Server Configuration
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database Configuration
  DB_PROVIDER: z.enum(['sqlite', 'postgresql']).default('postgresql'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL is required'),

  // JWT Configuration
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),

  // CORS Configuration
  CORS_ORIGIN: z.string().min(1, 'CORS_ORIGIN is required in production'),
  FRONTEND_URL: z.string().min(1, 'FRONTEND_URL is required'),

  // Logging Configuration
  LOG_LEVEL: z.string().default('2'),

  // Rate Limiting Configuration
  RATE_LIMIT_GENERAL_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_GENERAL_MAX: z.string().default('100'),
  RATE_LIMIT_AUTH_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_AUTH_MAX: z.string().default('5'),
  RATE_LIMIT_ADMIN_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_ADMIN_MAX: z.string().default('30'),

  // File Upload Configuration
  MAX_FILE_SIZE: z.string().default('10485760'),
  UPLOAD_DIR: z.string().default('uploads/'),

  // Email Configuration (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  FROM_EMAIL: z.string().optional(),

  // Redis Configuration (optional)
  REDIS_URL: z.string().optional(),
  REDIS_ENABLED: z.string().default('false'),

  // CSRF Configuration
  CSRF_SECRET: z
    .string()
    .min(32, 'CSRF_SECRET must be at least 32 characters')
    .default(() => {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          "CSRF_SECRET is required in production. Generate with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
        )
      }
      const crypto = require('crypto')
      console.warn(
        '[env] WARNING: CSRF_SECRET not set. Auto-generated for development. Set CSRF_SECRET in .env for consistency across restarts.'
      )
      return crypto.randomBytes(48).toString('hex')
    }),

  // Admin Configuration
  ADMIN_SECRET: z.string().min(16, 'ADMIN_SECRET must be at least 16 characters'),
  ADMIN_EMAIL: z.string().email('ADMIN_EMAIL must be a valid email'),
  ADMIN_DEFAULT_PASSWORD: z
    .string()
    .min(12, 'ADMIN_DEFAULT_PASSWORD must be at least 12 characters'),

  // Audit Logging Configuration
  AUDIT_LOG_TO_CONSOLE: z.string().default('true'),
  AUDIT_LOG_TO_DATABASE: z.string().default('false'),
  AUDIT_LOG_RETENTION_DAYS: z.string().default('90'),
})

// Type for validated environment variables
export type Env = z.infer<typeof envSchema>

// Validate and export environment variables
let validatedEnv: Env

try {
  validatedEnv = envSchema.parse(process.env)
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment Variable Validation Failed:')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error.issues.forEach((err: any) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`)
    })
    if (process.env.NODE_ENV === 'test') {
      // In test mode, provide minimal defaults needed for module loading
      validatedEnv = {
        PORT: process.env.PORT ?? '5000',
        NODE_ENV: process.env.NODE_ENV ?? 'test',
        DB_PROVIDER: process.env.DB_PROVIDER ?? 'sqlite',
        DATABASE_URL: process.env.DATABASE_URL ?? 'file:./test.db',
        DIRECT_URL: process.env.DIRECT_URL ?? 'file:./test.db',
        JWT_SECRET: process.env.JWT_SECRET ?? 'test-secret-thirty-two-characters-min!!',
        JWT_REFRESH_SECRET:
          process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-thirty-two-chars!!',
        JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '1h',
        REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7d',
        CORS_ORIGIN: process.env.CORS_ORIGIN ?? '*',
        FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:5173',
        LOG_LEVEL: process.env.LOG_LEVEL ?? '3',
        RATE_LIMIT_GENERAL_WINDOW_MS: process.env.RATE_LIMIT_GENERAL_WINDOW_MS ?? '900000',
        RATE_LIMIT_GENERAL_MAX: process.env.RATE_LIMIT_GENERAL_MAX ?? '100',
        RATE_LIMIT_AUTH_WINDOW_MS: process.env.RATE_LIMIT_AUTH_WINDOW_MS ?? '900000',
        RATE_LIMIT_AUTH_MAX: process.env.RATE_LIMIT_AUTH_MAX ?? '5',
        RATE_LIMIT_ADMIN_WINDOW_MS: process.env.RATE_LIMIT_ADMIN_WINDOW_MS ?? '900000',
        RATE_LIMIT_ADMIN_MAX: process.env.RATE_LIMIT_ADMIN_MAX ?? '30',
        MAX_FILE_SIZE: process.env.MAX_FILE_SIZE ?? '10485760',
        UPLOAD_DIR: process.env.UPLOAD_DIR ?? 'uploads/',
        REDIS_URL: process.env.REDIS_URL ?? '',
        REDIS_ENABLED: process.env.REDIS_ENABLED ?? 'false',
        CSRF_SECRET: process.env.CSRF_SECRET ?? 'test-csrf-secret-thirty-two-characters-min!!',
        ADMIN_SECRET: process.env.ADMIN_SECRET ?? 'test-admin-secret-32-chars-long!!!!!',
        ADMIN_EMAIL: process.env.ADMIN_EMAIL ?? 'admin@test.com',
        ADMIN_DEFAULT_PASSWORD: process.env.ADMIN_DEFAULT_PASSWORD ?? 'test-admin-pwd-12chars',
        AUDIT_LOG_TO_CONSOLE: process.env.AUDIT_LOG_TO_CONSOLE ?? 'true',
        AUDIT_LOG_TO_DATABASE: process.env.AUDIT_LOG_TO_DATABASE ?? 'false',
        AUDIT_LOG_RETENTION_DAYS: process.env.AUDIT_LOG_RETENTION_DAYS ?? '90',
      } as Env
    } else {
      console.error('\nPlease check your .env file and ensure all required variables are set.')
      process.exit(1)
    }
  } else {
    throw error
  }
}

export const env = validatedEnv

// Helper function to get boolean from string
export const getEnvBoolean = (value: string): boolean => {
  return value.toLowerCase() === 'true'
}

// Helper function to get number from string
export const getEnvNumber = (value: string): number => {
  return parseInt(value, 10)
}

// Export commonly used values with proper types
export const config = {
  port: getEnvNumber(env.PORT),
  nodeEnv: env.NODE_ENV,
  dbProvider: env.DB_PROVIDER,
  databaseUrl: env.DATABASE_URL,
  directUrl: env.DIRECT_URL,
  jwtSecret: env.JWT_SECRET,
  jwtRefreshSecret: env.JWT_REFRESH_SECRET,
  jwtExpiresIn: env.JWT_EXPIRES_IN,
  refreshTokenExpiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
  corsOrigin: env.CORS_ORIGIN,
  frontendUrl: env.FRONTEND_URL,
  logLevel: getEnvNumber(env.LOG_LEVEL),
  rateLimit: {
    general: {
      windowMs: getEnvNumber(env.RATE_LIMIT_GENERAL_WINDOW_MS),
      max: getEnvNumber(env.RATE_LIMIT_GENERAL_MAX),
    },
    auth: {
      windowMs: getEnvNumber(env.RATE_LIMIT_AUTH_WINDOW_MS),
      max: getEnvNumber(env.RATE_LIMIT_AUTH_MAX),
    },
    admin: {
      windowMs: getEnvNumber(env.RATE_LIMIT_ADMIN_WINDOW_MS),
      max: getEnvNumber(env.RATE_LIMIT_ADMIN_MAX),
    },
  },
  fileUpload: {
    maxSize: getEnvNumber(env.MAX_FILE_SIZE),
    uploadDir: env.UPLOAD_DIR,
  },
  email: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ? getEnvNumber(env.SMTP_PORT) : undefined,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.FROM_EMAIL,
  },
  redis: {
    url: env.REDIS_URL,
    enabled: getEnvBoolean(env.REDIS_ENABLED),
  },
  csrfSecret: env.CSRF_SECRET,
  admin: {
    secret: env.ADMIN_SECRET,
    email: env.ADMIN_EMAIL,
    defaultPassword: env.ADMIN_DEFAULT_PASSWORD,
  },
  auditLog: {
    toConsole: getEnvBoolean(env.AUDIT_LOG_TO_CONSOLE),
    toDatabase: getEnvBoolean(env.AUDIT_LOG_TO_DATABASE),
    retentionDays: getEnvNumber(env.AUDIT_LOG_RETENTION_DAYS),
  },
} as const

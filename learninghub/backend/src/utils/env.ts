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
  DB_PROVIDER: z.enum(['sqlite', 'postgresql']).default('sqlite'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL is required'),

  // JWT Configuration
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),

  // CORS Configuration
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

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
    error.issues.forEach((err: any) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`)
    })
    console.error('\nPlease check your .env file and ensure all required variables are set.')
    process.exit(1)
  }
  throw error
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
  jwtExpiresIn: env.JWT_EXPIRES_IN,
  refreshTokenExpiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
  corsOrigin: env.CORS_ORIGIN,
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

"use strict";
/**
 * Environment Variable Validation
 *
 * Validates all required environment variables on startup.
 * Prevents application from starting with missing or invalid configuration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.getEnvNumber = exports.getEnvBoolean = exports.env = void 0;
const zod_1 = require("zod");
// Environment variable schema
const envSchema = zod_1.z.object({
    // Server Configuration
    PORT: zod_1.z.string().default('5000'),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    // Database Configuration
    DB_PROVIDER: zod_1.z.enum(['sqlite', 'postgresql']).default('sqlite'),
    DATABASE_URL: zod_1.z.string().min(1, 'DATABASE_URL is required'),
    DIRECT_URL: zod_1.z.string().min(1, 'DIRECT_URL is required'),
    // JWT Configuration
    JWT_SECRET: zod_1.z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_EXPIRES_IN: zod_1.z.string().default('24h'),
    REFRESH_TOKEN_EXPIRES_IN: zod_1.z.string().default('7d'),
    // CORS Configuration
    CORS_ORIGIN: zod_1.z.string().default('http://localhost:5173'),
    // Logging Configuration
    LOG_LEVEL: zod_1.z.string().default('2'),
    // Rate Limiting Configuration
    RATE_LIMIT_GENERAL_WINDOW_MS: zod_1.z.string().default('900000'),
    RATE_LIMIT_GENERAL_MAX: zod_1.z.string().default('100'),
    RATE_LIMIT_AUTH_WINDOW_MS: zod_1.z.string().default('900000'),
    RATE_LIMIT_AUTH_MAX: zod_1.z.string().default('5'),
    RATE_LIMIT_ADMIN_WINDOW_MS: zod_1.z.string().default('900000'),
    RATE_LIMIT_ADMIN_MAX: zod_1.z.string().default('30'),
    // File Upload Configuration
    MAX_FILE_SIZE: zod_1.z.string().default('10485760'),
    UPLOAD_DIR: zod_1.z.string().default('uploads/'),
    // Email Configuration (optional)
    SMTP_HOST: zod_1.z.string().optional(),
    SMTP_PORT: zod_1.z.string().optional(),
    SMTP_USER: zod_1.z.string().optional(),
    SMTP_PASS: zod_1.z.string().optional(),
    FROM_EMAIL: zod_1.z.string().optional(),
    // Redis Configuration (optional)
    REDIS_URL: zod_1.z.string().optional(),
    REDIS_ENABLED: zod_1.z.string().default('false'),
    // Admin Configuration
    ADMIN_SECRET: zod_1.z.string().min(16, 'ADMIN_SECRET must be at least 16 characters'),
    ADMIN_EMAIL: zod_1.z.string().email('ADMIN_EMAIL must be a valid email'),
    ADMIN_DEFAULT_PASSWORD: zod_1.z
        .string()
        .min(12, 'ADMIN_DEFAULT_PASSWORD must be at least 12 characters'),
    // Audit Logging Configuration
    AUDIT_LOG_TO_CONSOLE: zod_1.z.string().default('true'),
    AUDIT_LOG_TO_DATABASE: zod_1.z.string().default('false'),
    AUDIT_LOG_RETENTION_DAYS: zod_1.z.string().default('90'),
});
// Validate and export environment variables
let validatedEnv;
try {
    validatedEnv = envSchema.parse(process.env);
}
catch (error) {
    if (error instanceof zod_1.z.ZodError) {
        console.error('❌ Environment Variable Validation Failed:');
        error.issues.forEach((err) => {
            console.error(`  - ${err.path.join('.')}: ${err.message}`);
        });
        console.error('\nPlease check your .env file and ensure all required variables are set.');
        process.exit(1);
    }
    throw error;
}
exports.env = validatedEnv;
// Helper function to get boolean from string
const getEnvBoolean = (value) => {
    return value.toLowerCase() === 'true';
};
exports.getEnvBoolean = getEnvBoolean;
// Helper function to get number from string
const getEnvNumber = (value) => {
    return parseInt(value, 10);
};
exports.getEnvNumber = getEnvNumber;
// Export commonly used values with proper types
exports.config = {
    port: (0, exports.getEnvNumber)(exports.env.PORT),
    nodeEnv: exports.env.NODE_ENV,
    dbProvider: exports.env.DB_PROVIDER,
    databaseUrl: exports.env.DATABASE_URL,
    directUrl: exports.env.DIRECT_URL,
    jwtSecret: exports.env.JWT_SECRET,
    jwtExpiresIn: exports.env.JWT_EXPIRES_IN,
    refreshTokenExpiresIn: exports.env.REFRESH_TOKEN_EXPIRES_IN,
    corsOrigin: exports.env.CORS_ORIGIN,
    logLevel: (0, exports.getEnvNumber)(exports.env.LOG_LEVEL),
    rateLimit: {
        general: {
            windowMs: (0, exports.getEnvNumber)(exports.env.RATE_LIMIT_GENERAL_WINDOW_MS),
            max: (0, exports.getEnvNumber)(exports.env.RATE_LIMIT_GENERAL_MAX),
        },
        auth: {
            windowMs: (0, exports.getEnvNumber)(exports.env.RATE_LIMIT_AUTH_WINDOW_MS),
            max: (0, exports.getEnvNumber)(exports.env.RATE_LIMIT_AUTH_MAX),
        },
        admin: {
            windowMs: (0, exports.getEnvNumber)(exports.env.RATE_LIMIT_ADMIN_WINDOW_MS),
            max: (0, exports.getEnvNumber)(exports.env.RATE_LIMIT_ADMIN_MAX),
        },
    },
    fileUpload: {
        maxSize: (0, exports.getEnvNumber)(exports.env.MAX_FILE_SIZE),
        uploadDir: exports.env.UPLOAD_DIR,
    },
    email: {
        host: exports.env.SMTP_HOST,
        port: exports.env.SMTP_PORT ? (0, exports.getEnvNumber)(exports.env.SMTP_PORT) : undefined,
        user: exports.env.SMTP_USER,
        pass: exports.env.SMTP_PASS,
        from: exports.env.FROM_EMAIL,
    },
    redis: {
        url: exports.env.REDIS_URL,
        enabled: (0, exports.getEnvBoolean)(exports.env.REDIS_ENABLED),
    },
    admin: {
        secret: exports.env.ADMIN_SECRET,
        email: exports.env.ADMIN_EMAIL,
        defaultPassword: exports.env.ADMIN_DEFAULT_PASSWORD,
    },
    auditLog: {
        toConsole: (0, exports.getEnvBoolean)(exports.env.AUDIT_LOG_TO_CONSOLE),
        toDatabase: (0, exports.getEnvBoolean)(exports.env.AUDIT_LOG_TO_DATABASE),
        retentionDays: (0, exports.getEnvNumber)(exports.env.AUDIT_LOG_RETENTION_DAYS),
    },
};

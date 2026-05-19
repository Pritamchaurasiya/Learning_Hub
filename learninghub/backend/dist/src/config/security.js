"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSecureToken = exports.sanitizeInput = exports.validatePasswordStrength = exports.sessionConfig = exports.passwordPolicy = exports.bcryptConfig = exports.jwtConfig = exports.helmetConfig = exports.corsOptions = exports.adminRateLimit = exports.authRateLimit = exports.generalRateLimit = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Rate limiting configurations
exports.generalRateLimit = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_GENERAL_WINDOW_MS ?? '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_GENERAL_MAX ?? '100', 10),
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many requests from this IP, please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil((req.rateLimit?.resetTime?.getTime() ?? Date.now()) / 1000),
        });
    },
});
exports.authRateLimit = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS ?? '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_AUTH_MAX ?? '5', 10),
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
    },
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Use ipKeyGenerator helper for IPv6 compatibility
        const ip = req.ip ?? 'unknown';
        // For simplicity in this context, we'll use the standard approach
        // In a production environment with express-rate-limit, you'd use their built-in helpers
        return ip;
    },
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many authentication attempts, please try again later.',
            code: 'AUTH_RATE_LIMIT_EXCEEDED',
            retryAfter: 15 * 60, // 15 minutes in seconds
        });
    },
});
exports.adminRateLimit = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_ADMIN_WINDOW_MS ?? '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_ADMIN_MAX ?? '30', 10),
    message: {
        success: false,
        message: 'Too many admin requests, please try again later.',
        code: 'ADMIN_RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Use ipKeyGenerator helper for IPv6 compatibility
        const ip = req.ip ?? 'unknown';
        // For simplicity in this context, we'll use the standard approach
        // In a production environment with express-rate-limit, you'd use their built-in helpers
        return ip;
    },
});
// CORS configuration — supports comma-separated origins for multi-domain production
const parseOrigins = (envValue) => {
    const raw = envValue ?? 'http://localhost:5173';
    const origins = raw
        .split(',')
        .map(o => o.trim())
        .filter(Boolean);
    return origins.length === 1 ? origins[0] : origins;
};
exports.corsOptions = {
    origin: parseOrigins(process.env.CORS_ORIGIN),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'X-Request-ID',
        'X-Session-ID',
        'X-CSRF-Token',
    ],
    credentials: true,
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204,
};
// Helmet configuration — production-grade CSP
exports.helmetConfig = {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            // Use nonce-based inline scripts in production; unsafe-inline removed for security
            scriptSrc: ["'self'", ...(process.env.NODE_ENV === 'development' ? ["'unsafe-inline'"] : [])],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
            connectSrc: ["'self'", 'https:', 'wss:'],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
};
// JWT configuration — FAILS if secrets are not set (no insecure defaults)
const getEnvOrThrow = (envVar, hint) => {
    const value = process.env[envVar];
    if (!value || value.length < 32) {
        throw new Error(`${envVar} must be set and at least 32 characters long. ${hint}`);
    }
    return value;
};
exports.jwtConfig = {
    accessSecret: getEnvOrThrow('JWT_SECRET', "Generate with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""),
    refreshSecret: getEnvOrThrow('JWT_REFRESH_SECRET', "Generate with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRATION ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION ?? '7d',
    algorithm: 'HS256',
    issuer: 'learninghub',
    audience: 'learninghub-users',
};
// Bcrypt configuration
exports.bcryptConfig = {
    rounds: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),
    minPasswordLength: 8,
    maxPasswordLength: 128,
};
// Password policy
exports.passwordPolicy = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};
// Session configuration
exports.sessionConfig = {
    maxSessionsPerUser: parseInt(process.env.MAX_SESSIONS_PER_USER ?? '5', 10),
    sessionTimeoutMinutes: 30,
    idleTimeoutMinutes: 15,
    absoluteTimeoutMinutes: 480, // 8 hours
};
// Validation for password strength
const validatePasswordStrength = (password) => {
    const errors = [];
    if (password.length < exports.passwordPolicy.minLength) {
        errors.push(`Password must be at least ${exports.passwordPolicy.minLength} characters long`);
    }
    if (password.length > exports.passwordPolicy.maxLength) {
        errors.push(`Password must not exceed ${exports.passwordPolicy.maxLength} characters`);
    }
    if (exports.passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (exports.passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (exports.passwordPolicy.requireNumbers && !/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    if (exports.passwordPolicy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }
    // Check for common password patterns
    const commonPatterns = [
        'password',
        '123456',
        'qwerty',
        'abc123',
        'letmein',
        'welcome',
        'admin',
        'login',
        'master',
        'root',
    ];
    if (commonPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
        errors.push('Password contains common patterns that are easily guessed');
    }
    return {
        valid: errors.length === 0,
        errors,
    };
};
exports.validatePasswordStrength = validatePasswordStrength;
// Sanitize input to prevent injection attacks
const sanitizeInput = (input) => {
    return input
        .replace(/[<>]/g, '') // Remove angle brackets
        .replace(/javascript\s*:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
        .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, '') // Remove HTML entities
        .trim()
        .slice(0, 1000); // Limit input length
};
exports.sanitizeInput = sanitizeInput;
// Generate secure random token
const generateSecureToken = (length = 32) => {
    const crypto = require('crypto');
    return crypto.randomBytes(length).toString('hex');
};
exports.generateSecureToken = generateSecureToken;

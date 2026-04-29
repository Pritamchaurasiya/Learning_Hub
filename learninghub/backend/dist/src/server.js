"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
require("dotenv/config"); // Load environment variables from .env
const routes_1 = __importDefault(require("./routes"));
const errorHandler_1 = require("./middleware/errorHandler");
const logger_1 = __importDefault(require("./utils/logger"));
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*", // Adjust for production
        methods: ["GET", "POST"]
    }
});
exports.io = io;
// Attach io to request for use in controllers
app.use((req, res, next) => {
    req.io = io;
    next();
});
// Security and Performance Middlewares
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));
app.use((0, compression_1.default)());
// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use((0, cors_1.default)({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json({ limit: '10mb' }));
// Rate Limiting Configuration from Environment
const RATE_LIMIT_GENERAL_WINDOW_MS = parseInt(process.env.RATE_LIMIT_GENERAL_WINDOW_MS || '900000');
const RATE_LIMIT_GENERAL_MAX = parseInt(process.env.RATE_LIMIT_GENERAL_MAX || '100');
const RATE_LIMIT_AUTH_WINDOW_MS = parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '900000');
const RATE_LIMIT_AUTH_MAX = parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5');
const RATE_LIMIT_ADMIN_WINDOW_MS = parseInt(process.env.RATE_LIMIT_ADMIN_WINDOW_MS || '900000');
const RATE_LIMIT_ADMIN_MAX = parseInt(process.env.RATE_LIMIT_ADMIN_MAX || '30');
// Rate Limiting - General API
const generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: RATE_LIMIT_GENERAL_WINDOW_MS,
    max: RATE_LIMIT_GENERAL_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'error', message: 'Too many requests, please try again later.' },
    keyGenerator: (req) => req.ip || 'unknown'
});
app.use(generalLimiter);
// Stricter rate limiting for auth endpoints
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: RATE_LIMIT_AUTH_WINDOW_MS,
    max: RATE_LIMIT_AUTH_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'error', message: 'Too many authentication attempts. Please try again after 15 minutes.' },
    skipSuccessfulRequests: true // Don't count successful logins
});
// Ultra-strict rate limiting for admin endpoints
const adminLimiter = (0, express_rate_limit_1.default)({
    windowMs: RATE_LIMIT_ADMIN_WINDOW_MS,
    max: RATE_LIMIT_ADMIN_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'error', message: 'Too many admin requests. Please try again later.' },
    keyGenerator: (req) => req.ip || 'unknown', // Track by IP
    handler: (req, res) => {
        logger_1.default.warn('Admin rate limit exceeded', {
            ip: req.ip,
            path: req.path,
            userId: req.user?.userId
        });
        res.status(429).json({
            status: 'error',
            message: 'Too many admin requests. Please try again later.'
        });
    }
});
// API Routes - Versioned
// Apply admin rate limiting to admin routes
app.use('/api/v1/admin', adminLimiter);
app.use('/api/v1', routes_1.default);
// Also mount at root for backward compatibility (deprecated, will be removed)
app.use('/', routes_1.default);
// API Health Check at versioned endpoint
app.get('/api/v1/health', (req, res) => {
    res.json({ status: 'ok', version: 'v1', timestamp: new Date().toISOString() });
});
// WebSocket logic
io.on('connection', (socket) => {
    logger_1.default.info('User connected', { socketId: socket.id });
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        logger_1.default.info('User joined room', { socketId: socket.id, roomId });
    });
    socket.on('disconnect', () => {
        logger_1.default.info('User disconnected', { socketId: socket.id });
    });
});
// Global Error Handlers
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    logger_1.default.info(`Server running on http://localhost:${PORT}`);
});

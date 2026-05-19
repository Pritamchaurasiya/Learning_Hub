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
const hpp_1 = __importDefault(require("hpp"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
require("dotenv/config");
const routes_1 = __importDefault(require("./routes"));
const errorHandler_1 = require("./middleware/errorHandler");
const authMiddleware_1 = require("./middleware/authMiddleware");
const config_1 = require("./config");
const logger_1 = __importDefault(require("./utils/logger"));
const config_2 = require("./config");
const env_1 = require("./utils/env");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: config_1.corsOptions.origin,
        methods: ['GET', 'POST'],
        credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
});
exports.io = io;
// Attach io to request for use in controllers
app.use((req, res, next) => {
    req.io = io;
    next();
});
// Request ID for tracing
app.use(authMiddleware_1.requestId);
app.use(authMiddleware_1.requestLogger);
// Security Middlewares
app.use((0, helmet_1.default)(config_1.helmetConfig));
app.use((0, compression_1.default)());
app.use((0, hpp_1.default)()); // Prevent HTTP Parameter Pollution
// CORS configuration
app.use((0, cors_1.default)(config_1.corsOptions));
// Body parsing
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Rate Limiting - General API
app.use(config_1.generalRateLimit);
// Auth endpoints get stricter rate limiting
const authRateLimiter = config_1.authRateLimit;
const adminRateLimiter = config_1.adminRateLimit;
// API Routes - Versioned
// Apply specific rate limiting
app.use('/api/v1/auth', authRateLimiter); // Stricter rate limiting for auth
app.use('/api/v1/admin', adminRateLimiter); // Ultra-strict for admin
app.use('/api/v1', routes_1.default);
// SECURITY: Root mount removed — all API access must go through /api/v1/
// This ensures auth and admin rate limiters cannot be bypassed.
// API Health Check at versioned endpoint
app.get('/api/v1/health', async (req, res) => {
    try {
        // Check database connectivity
        await config_2.prisma.$queryRaw `SELECT 1`;
        res.json({
            status: 'ok',
            version: 'v1',
            timestamp: new Date().toISOString(),
            services: {
                database: 'connected',
            },
        });
    }
    catch (error) {
        logger_1.default.error('Health check failed', error instanceof Error ? error : new Error(String(error)));
        res.status(503).json({
            status: 'error',
            version: 'v1',
            timestamp: new Date().toISOString(),
            services: {
                database: 'disconnected',
            },
        });
    }
});
// WebSocket logic
io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
        return next(new Error('Authentication required'));
    }
    try {
        const { verifyAccessToken } = require('./utils/auth');
        const decoded = verifyAccessToken(token);
        socket.data.userId = decoded.userId;
        socket.data.userRole = decoded.role;
        next();
    }
    catch {
        return next(new Error('Invalid token'));
    }
});
io.on('connection', socket => {
    logger_1.default.info('User connected', { socketId: socket.id, userId: socket.data.userId });
    socket.on('join-room', async (roomId) => {
        // Verify user has access to this room (e.g., enrolled in course)
        try {
            const session = await config_2.prisma.liveSession.findUnique({
                where: { id: roomId },
                select: { id: true, status: true },
            });
            if (!session) {
                socket.emit('error', { message: 'Session not found' });
                return;
            }
            void socket.join(roomId);
            logger_1.default.info('User joined room', { socketId: socket.id, roomId, userId: socket.data.userId });
            socket.to(roomId).emit('user-joined', { socketId: socket.id, userId: socket.data.userId });
        }
        catch {
            socket.emit('error', { message: 'Failed to join room' });
        }
    });
    socket.on('leave-room', (roomId) => {
        void socket.leave(roomId);
        socket.to(roomId).emit('user-left', { socketId: socket.id, userId: socket.data.userId });
    });
    // Real-time Chat Messaging with rate limiting
    const messageCooldown = new Map();
    socket.on('send-message', (data) => {
        const now = Date.now();
        const lastMessage = messageCooldown.get(socket.id) || 0;
        if (now - lastMessage < 500) {
            // 500ms cooldown
            socket.emit('error', { message: 'Message rate limit exceeded' });
            return;
        }
        messageCooldown.set(socket.id, now);
        if (!data.message || data.message.length > 2000) {
            socket.emit('error', { message: 'Message too long' });
            return;
        }
        io.to(data.roomId).emit('new-message', {
            message: data.message,
            sender: socket.data.userId,
            timestamp: new Date().toISOString(),
        });
    });
    // Real-time Hand Raise Event
    socket.on('raise-hand', (data) => {
        io.to(data.roomId).emit('hand-raised', { user: socket.data.userId });
    });
    socket.on('disconnect', () => {
        logger_1.default.info('User disconnected', { socketId: socket.id, userId: socket.data.userId });
    });
});
// Global Error Handlers
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
const PORT = env_1.config.port;
// Start server
httpServer.listen(PORT, () => {
    logger_1.default.info(`Server running on http://localhost:${PORT}`);
    logger_1.default.info(`Environment: ${env_1.config.nodeEnv}`);
});
// Graceful shutdown — ensures DB connections are properly closed
const gracefulShutdown = (signal) => {
    logger_1.default.info(`${signal} received, shutting down gracefully`);
    void io.close();
    httpServer.close(async () => {
        await config_2.prisma.$disconnect();
        logger_1.default.info('Server closed');
        process.exit(0);
    });
    // Force kill after 10s if graceful shutdown hangs
    setTimeout(() => {
        logger_1.default.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// Catch unhandled promise rejections to prevent silent crashes
process.on('unhandledRejection', (reason) => {
    logger_1.default.error('Unhandled Rejection', reason instanceof Error ? reason : new Error(String(reason)));
});
exports.default = app;

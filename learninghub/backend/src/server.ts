import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import 'dotenv/config';  // Load environment variables from .env
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import logger from './utils/logger';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Adjust for production
    methods: ["GET", "POST"]
  }
});

// Attach io to request for use in controllers
app.use((req: any, res, next) => {
  req.io = io;
  next();
});

// Security and Performance Middlewares
app.use(helmet({
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
app.use(compression());

// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// Rate Limiting Configuration from Environment
const RATE_LIMIT_GENERAL_WINDOW_MS = parseInt(process.env.RATE_LIMIT_GENERAL_WINDOW_MS || '900000');
const RATE_LIMIT_GENERAL_MAX = parseInt(process.env.RATE_LIMIT_GENERAL_MAX || '100');
const RATE_LIMIT_AUTH_WINDOW_MS = parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '900000');
const RATE_LIMIT_AUTH_MAX = parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5');
const RATE_LIMIT_ADMIN_WINDOW_MS = parseInt(process.env.RATE_LIMIT_ADMIN_WINDOW_MS || '900000');
const RATE_LIMIT_ADMIN_MAX = parseInt(process.env.RATE_LIMIT_ADMIN_MAX || '30');

// Rate Limiting - General API
const generalLimiter = rateLimit({
  windowMs: RATE_LIMIT_GENERAL_WINDOW_MS,
  max: RATE_LIMIT_GENERAL_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many requests, please try again later.' },
  keyGenerator: (req) => req.ip || 'unknown'
});
app.use(generalLimiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: RATE_LIMIT_AUTH_WINDOW_MS,
  max: RATE_LIMIT_AUTH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many authentication attempts. Please try again after 15 minutes.' },
  skipSuccessfulRequests: true // Don't count successful logins
});

// Ultra-strict rate limiting for admin endpoints
const adminLimiter = rateLimit({
  windowMs: RATE_LIMIT_ADMIN_WINDOW_MS,
  max: RATE_LIMIT_ADMIN_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many admin requests. Please try again later.' },
  keyGenerator: (req) => req.ip || 'unknown', // Track by IP
  handler: (req, res) => {
    logger.warn('Admin rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userId: (req as any).user?.userId
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
app.use('/api/v1', routes);

// Also mount at root for backward compatibility (deprecated, will be removed)
app.use('/', routes);

// API Health Check at versioned endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', version: 'v1', timestamp: new Date().toISOString() });
});

// WebSocket logic
io.on('connection', (socket) => {
  logger.info('User connected', { socketId: socket.id });

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    logger.info('User joined room', { socketId: socket.id, roomId });
  });

  socket.on('disconnect', () => {
    logger.info('User disconnected', { socketId: socket.id });
  });
});

// Global Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});

export { io };

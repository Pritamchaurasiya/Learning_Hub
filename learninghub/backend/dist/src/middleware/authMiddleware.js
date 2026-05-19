"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = exports.requestId = exports.authorizeSuperAdmin = exports.authorizeInstructor = exports.authorizeAdmin = exports.authorize = exports.optionalAuth = exports.authenticate = void 0;
const services_1 = require("../services");
const config_1 = require("../config");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * JWT Authentication Middleware
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
                code: 'NO_TOKEN',
            });
            return;
        }
        const token = authHeader.substring(7);
        const authService = new services_1.AuthService(config_1.prisma);
        try {
            const decoded = authService.verifyAccessToken(token);
            // Check if user still exists and is active
            const user = await authService.getUserById(decoded.userId);
            if (!user) {
                res.status(401).json({
                    success: false,
                    message: 'User not found',
                    code: 'USER_NOT_FOUND',
                });
                return;
            }
            if (user.deletedAt) {
                res.status(401).json({
                    success: false,
                    message: 'Account has been deactivated',
                    code: 'ACCOUNT_DEACTIVATED',
                });
                return;
            }
            if (user.lockedUntil && user.lockedUntil > new Date()) {
                res.status(401).json({
                    success: false,
                    message: 'Account is temporarily locked',
                    code: 'ACCOUNT_LOCKED',
                });
                return;
            }
            // Attach user to request
            req.user = {
                userId: decoded.userId,
                email: decoded.email,
                role: decoded.role,
            };
            next();
        }
        catch (error) {
            if (error instanceof Error && error.message === 'Token expired') {
                res.status(401).json({
                    success: false,
                    message: 'Token expired',
                    code: 'TOKEN_EXPIRED',
                });
                return;
            }
            res.status(401).json({
                success: false,
                message: 'Invalid token',
                code: 'INVALID_TOKEN',
            });
        }
    }
    catch (error) {
        logger_1.default.error('Authentication middleware error', error instanceof Error ? error : new Error(String(error)));
        res.status(500).json({
            success: false,
            message: 'Authentication error',
            code: 'AUTH_ERROR',
        });
    }
};
exports.authenticate = authenticate;
/**
 * Optional Authentication Middleware
 * Doesn't fail if no token provided, but attaches user if valid token exists
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            next();
            return;
        }
        const token = authHeader.substring(7);
        const authService = new services_1.AuthService(config_1.prisma);
        try {
            const decoded = authService.verifyAccessToken(token);
            req.user = {
                userId: decoded.userId,
                email: decoded.email,
                role: decoded.role,
            };
        }
        catch {
            // Invalid token is OK for optional auth
        }
        next();
    }
    catch (error) {
        logger_1.default.error('Optional auth middleware error', error instanceof Error ? error : new Error(String(error)));
        next();
    }
};
exports.optionalAuth = optionalAuth;
/**
 * Role-based Authorization Middleware
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
                code: 'NO_TOKEN',
            });
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                message: 'Insufficient permissions',
                code: 'FORBIDDEN',
                requiredRoles: allowedRoles,
            });
            return;
        }
        next();
    };
};
exports.authorize = authorize;
/**
 * Admin Authorization Middleware
 */
exports.authorizeAdmin = (0, exports.authorize)('ADMIN', 'SUPERADMIN');
/**
 * Instructor or Admin Authorization Middleware
 */
exports.authorizeInstructor = (0, exports.authorize)('INSTRUCTOR', 'ADMIN', 'SUPERADMIN');
/**
 * Super Admin Authorization Middleware
 */
exports.authorizeSuperAdmin = (0, exports.authorize)('SUPERADMIN');
/**
 * Request ID Middleware
 * Generates unique request ID for tracing
 */
const requestId = (req, res, next) => {
    const requestId = req.headers['x-request-id'] ||
        `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
};
exports.requestId = requestId;
/**
 * Request Logging Middleware
 */
const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            userId: req.user?.userId,
            requestId: req.requestId,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        };
        if (res.statusCode >= 500) {
            logger_1.default.error('Request completed with error', undefined, logData);
        }
        else if (res.statusCode >= 400) {
            logger_1.default.warn('Request completed with client error', logData);
        }
        else {
            logger_1.default.info('Request completed', logData);
        }
    });
    next();
};
exports.requestLogger = requestLogger;

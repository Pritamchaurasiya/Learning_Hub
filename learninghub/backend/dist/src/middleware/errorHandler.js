"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.errorHandler = exports.AppError = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const logger_1 = __importDefault(require("../utils/logger"));
class AppError extends Error {
    statusCode;
    isOperational;
    constructor(message, statusCode, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const errorHandler = (err, req, res, _next) => {
    let statusCode = 500;
    let message = 'Internal server error';
    let errors = undefined;
    if (err instanceof AppError) {
        statusCode = err.statusCode;
        // For non-operational errors (programming bugs), hide internal details in production
        message = err.isOperational ? err.message : 'Internal Server Error';
    }
    else if (err instanceof zod_1.ZodError) {
        statusCode = 400;
        message = 'Validation failed';
        errors = err.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
        }));
    }
    else if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        const prismaError = handlePrismaError(err);
        statusCode = prismaError.statusCode;
        message = prismaError.message;
    }
    else if (err instanceof client_1.Prisma.PrismaClientValidationError) {
        statusCode = 400;
        message = 'Invalid request data';
    }
    else if (err instanceof client_1.Prisma.PrismaClientUnknownRequestError) {
        statusCode = 500;
        message = 'Internal Server Error';
    }
    else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }
    else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }
    else if (err instanceof SyntaxError && 'body' in err) {
        statusCode = 400;
        message = 'Invalid JSON in request body';
    }
    else {
        // Generic non-operational error — hide internals in production
        message = 'Internal Server Error';
    }
    if (process.env.NODE_ENV === 'development') {
        logger_1.default.error(`[ErrorHandler] ${statusCode} - ${message}`, err);
    }
    else {
        logger_1.default.error(`[ErrorHandler] ${statusCode} - ${message}`, new Error(message));
    }
    res.status(statusCode).json({
        status: 'error',
        message,
        ...(errors && { errors }),
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
exports.errorHandler = errorHandler;
function handlePrismaError(err) {
    switch (err.code) {
        case 'P2002':
            const target = err.meta?.target;
            const field = target ? target.join(', ') : 'field';
            return {
                statusCode: 409,
                message: `A record with this ${field} already exists`,
            };
        case 'P2025':
            return {
                statusCode: 404,
                message: 'Record not found',
            };
        case 'P2003':
            return {
                statusCode: 400,
                message: 'Invalid reference to related record',
            };
        case 'P2014':
            return {
                statusCode: 400,
                message: 'Invalid relation data',
            };
        case 'P2001':
            return {
                statusCode: 404,
                message: 'Record not found',
            };
        case 'P2018':
            return {
                statusCode: 404,
                message: 'Record not found',
            };
        case 'P2021':
            return {
                statusCode: 500,
                message: 'Database table not found',
            };
        case 'P2022':
            return {
                statusCode: 500,
                message: 'Database column not found',
            };
        default:
            return {
                statusCode: 500,
                message: 'Database error',
            };
    }
}
const notFoundHandler = (req, res) => {
    res.status(404).json({
        status: 'error',
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
};
exports.notFoundHandler = notFoundHandler;
exports.default = exports.errorHandler;

"use strict";
/**
 * Standardized Error Handling for Backend
 *
 * Provides consistent error handling across all controllers and services.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleValidationError = exports.handlePrismaError = exports.asyncHandler = exports.errorHandler = exports.formatErrorResponse = exports.errorFactory = exports.AppError = exports.ErrorCode = void 0;
const logger_1 = __importDefault(require("./logger"));
// ============================================================================
// Error Types
// ============================================================================
var ErrorCode;
(function (ErrorCode) {
    // Authentication & Authorization
    ErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    ErrorCode["FORBIDDEN"] = "FORBIDDEN";
    ErrorCode["INVALID_TOKEN"] = "INVALID_TOKEN";
    ErrorCode["TOKEN_EXPIRED"] = "TOKEN_EXPIRED";
    // Validation
    ErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorCode["INVALID_INPUT"] = "INVALID_INPUT";
    ErrorCode["MISSING_REQUIRED_FIELD"] = "MISSING_REQUIRED_FIELD";
    // Resource Not Found
    ErrorCode["NOT_FOUND"] = "NOT_FOUND";
    ErrorCode["RESOURCE_NOT_FOUND"] = "RESOURCE_NOT_FOUND";
    // Conflict
    ErrorCode["CONFLICT"] = "CONFLICT";
    ErrorCode["DUPLICATE_ENTRY"] = "DUPLICATE_ENTRY";
    ErrorCode["ALREADY_EXISTS"] = "ALREADY_EXISTS";
    // Rate Limiting
    ErrorCode["RATE_LIMITED"] = "RATE_LIMITED";
    ErrorCode["TOO_MANY_REQUESTS"] = "TOO_MANY_REQUESTS";
    // Server Errors
    ErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
    ErrorCode["SERVICE_UNAVAILABLE"] = "SERVICE_UNAVAILABLE";
    ErrorCode["DATABASE_ERROR"] = "DATABASE_ERROR";
    ErrorCode["EXTERNAL_SERVICE_ERROR"] = "EXTERNAL_SERVICE_ERROR";
    // Business Logic
    ErrorCode["BUSINESS_ERROR"] = "BUSINESS_ERROR";
    ErrorCode["OPERATION_NOT_ALLOWED"] = "OPERATION_NOT_ALLOWED";
    ErrorCode["INVALID_STATE"] = "INVALID_STATE";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
// ============================================================================
// Custom Error Class
// ============================================================================
class AppError extends Error {
    statusCode;
    code;
    isOperational;
    details;
    constructor(message, statusCode, code, isOperational = true, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;
        this.details = details;
        // Maintains proper stack trace for where our error was thrown
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
// ============================================================================
// Error Factory Functions
// ============================================================================
exports.errorFactory = {
    // Authentication & Authorization
    unauthorized: (message = 'Unauthorized access') => new AppError(message, 401, ErrorCode.UNAUTHORIZED),
    forbidden: (message = 'Access denied') => new AppError(message, 403, ErrorCode.FORBIDDEN),
    invalidToken: (message = 'Invalid token') => new AppError(message, 401, ErrorCode.INVALID_TOKEN),
    tokenExpired: (message = 'Token expired') => new AppError(message, 401, ErrorCode.TOKEN_EXPIRED),
    // Validation
    validationError: (message = 'Validation failed', details) => new AppError(message, 400, ErrorCode.VALIDATION_ERROR, true, details),
    invalidInput: (message = 'Invalid input', details) => new AppError(message, 400, ErrorCode.INVALID_INPUT, true, details),
    missingRequiredField: (field) => new AppError(`Missing required field: ${field}`, 400, ErrorCode.MISSING_REQUIRED_FIELD),
    // Resource Not Found
    notFound: (resource = 'Resource') => new AppError(`${resource} not found`, 404, ErrorCode.NOT_FOUND),
    resourceNotFound: (resource, id) => new AppError(`${resource}${id ? ` with id ${id}` : ''} not found`, 404, ErrorCode.RESOURCE_NOT_FOUND),
    // Conflict
    conflict: (message = 'Conflict') => new AppError(message, 409, ErrorCode.CONFLICT),
    duplicateEntry: (resource, field) => new AppError(`${resource} with this ${field} already exists`, 409, ErrorCode.DUPLICATE_ENTRY),
    alreadyExists: (resource) => new AppError(`${resource} already exists`, 409, ErrorCode.ALREADY_EXISTS),
    // Rate Limiting
    rateLimited: (message = 'Too many requests') => new AppError(message, 429, ErrorCode.RATE_LIMITED),
    tooManyRequests: (message = 'Too many requests') => new AppError(message, 429, ErrorCode.TOO_MANY_REQUESTS),
    // Server Errors
    internalError: (message = 'Internal server error') => new AppError(message, 500, ErrorCode.INTERNAL_ERROR, false),
    serviceUnavailable: (message = 'Service unavailable') => new AppError(message, 503, ErrorCode.SERVICE_UNAVAILABLE, false),
    databaseError: (message = 'Database error') => new AppError(message, 500, ErrorCode.DATABASE_ERROR, false),
    externalServiceError: (service) => new AppError(`${service} error`, 502, ErrorCode.EXTERNAL_SERVICE_ERROR, false),
    // Business Logic
    businessError: (message, details) => new AppError(message, 400, ErrorCode.BUSINESS_ERROR, true, details),
    operationNotAllowed: (operation) => new AppError(`Operation not allowed: ${operation}`, 403, ErrorCode.OPERATION_NOT_ALLOWED),
    invalidState: (message = 'Invalid state') => new AppError(message, 400, ErrorCode.INVALID_STATE),
};
const formatErrorResponse = (error, requestId) => {
    if (error instanceof AppError) {
        return {
            status: 'error',
            code: error.code,
            message: error.message,
            details: error.details,
            timestamp: new Date().toISOString(),
            requestId,
        };
    }
    // For generic errors
    return {
        status: 'error',
        code: ErrorCode.INTERNAL_ERROR,
        message: error.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
        requestId,
    };
};
exports.formatErrorResponse = formatErrorResponse;
// ============================================================================
// Error Handler Middleware
// ============================================================================
const errorHandler = (error, req, res, _next) => {
    // Log error
    if (error instanceof AppError) {
        if (error.statusCode >= 500) {
            logger_1.default.error('AppError', error, {
                code: error.code,
                requestId: req.requestId,
                details: error.details,
            });
        }
        else {
            logger_1.default.warn(`AppError: ${error.message} [${error.code}] requestId=${req.requestId ?? 'unknown'}`);
        }
    }
    else {
        logger_1.default.error('Unhandled Error', error, {
            requestId: req.requestId,
        });
    }
    // Determine status code
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    // Format response
    const response = (0, exports.formatErrorResponse)(error, req.requestId);
    // Send response
    res.status(statusCode).json(response);
};
exports.errorHandler = errorHandler;
// ============================================================================
// Async Handler Wrapper
// ============================================================================
/**
 * Wraps async route handlers to catch errors and pass to error handler
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((err) => {
            if (typeof next === 'function')
                next(err);
        });
    };
};
exports.asyncHandler = asyncHandler;
const handlePrismaError = (error) => {
    switch (error.code) {
        case 'P2002':
            // Unique constraint violation
            const fields = error.meta?.target;
            const field = fields?.join(', ') || 'field';
            return exports.errorFactory.duplicateEntry('Record', field);
        case 'P2025':
            // Record not found
            return exports.errorFactory.notFound('Record');
        case 'P2003':
            // Foreign key constraint violation
            return exports.errorFactory.validationError('Foreign key constraint violation', error.meta);
        case 'P2014':
            // Required relation violation
            return exports.errorFactory.validationError('Required relation violation', error.meta);
        case 'P2011':
            // Null constraint violation
            return exports.errorFactory.missingRequiredField('Required field');
        default:
            return exports.errorFactory.databaseError('Database operation failed');
    }
};
exports.handlePrismaError = handlePrismaError;
// ============================================================================
// Validation Error Handler
// ============================================================================
const handleValidationError = (errors) => {
    return exports.errorFactory.validationError('Validation failed', errors);
};
exports.handleValidationError = handleValidationError;

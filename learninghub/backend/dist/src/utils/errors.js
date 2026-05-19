"use strict";
/**
 * Custom error classes for consistent error handling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitError = exports.ConflictError = exports.NotFoundError = exports.ValidationError = exports.AuthorizationError = exports.AuthenticationError = void 0;
class AuthenticationError extends Error {
    constructor(message = 'Authentication failed') {
        super(message);
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends Error {
    constructor(message = 'Authorization failed') {
        super(message);
        this.name = 'AuthorizationError';
    }
}
exports.AuthorizationError = AuthorizationError;
class ValidationError extends Error {
    details;
    constructor(message = 'Validation failed', details) {
        super(message);
        this.name = 'ValidationError';
        this.details = details;
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends Error {
    constructor(message = 'Resource not found') {
        super(message);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends Error {
    constructor(message = 'Resource already exists') {
        super(message);
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
class RateLimitError extends Error {
    constructor(message = 'Too many requests') {
        super(message);
        this.name = 'RateLimitError';
    }
}
exports.RateLimitError = RateLimitError;

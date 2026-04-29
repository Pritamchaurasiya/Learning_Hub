"use strict";
/**
 * Structured Logger Utility
 * Provides consistent logging across the application with different log levels
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["ERROR"] = 0] = "ERROR";
    LogLevel[LogLevel["WARN"] = 1] = "WARN";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 3] = "DEBUG";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
const currentLogLevel = process.env.LOG_LEVEL
    ? parseInt(process.env.LOG_LEVEL)
    : (process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG);
function createLogEntry(level, message, context, error) {
    return {
        timestamp: new Date().toISOString(),
        level: LogLevel[level],
        message,
        context,
        error: error ? { name: error.name, message: error.message, stack: error.stack } : undefined
    };
}
function shouldLog(level) {
    return level <= currentLogLevel;
}
exports.logger = {
    error: (message, error, context) => {
        if (shouldLog(LogLevel.ERROR)) {
            const entry = createLogEntry(LogLevel.ERROR, message, context, error);
            console.error(JSON.stringify(entry));
        }
    },
    warn: (message, context) => {
        if (shouldLog(LogLevel.WARN)) {
            const entry = createLogEntry(LogLevel.WARN, message, context);
            console.warn(JSON.stringify(entry));
        }
    },
    info: (message, context) => {
        if (shouldLog(LogLevel.INFO)) {
            const entry = createLogEntry(LogLevel.INFO, message, context);
            console.log(JSON.stringify(entry));
        }
    },
    debug: (message, context) => {
        if (shouldLog(LogLevel.DEBUG)) {
            const entry = createLogEntry(LogLevel.DEBUG, message, context);
            console.log(JSON.stringify(entry));
        }
    },
    // Audit logging for sensitive operations
    audit: (action, userId, details) => {
        const entry = {
            timestamp: new Date().toISOString(),
            type: 'AUDIT',
            action,
            userId,
            details
        };
        console.log(JSON.stringify(entry));
    }
};
exports.default = exports.logger;

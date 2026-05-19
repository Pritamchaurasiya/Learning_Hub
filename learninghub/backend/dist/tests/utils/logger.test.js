"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../../src/utils/logger");
describe('Logger Utils', () => {
    let consoleErrorSpy;
    let consoleWarnSpy;
    let consoleLogSpy;
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
        // Spy on console methods to verify they are called correctly
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
    });
    afterEach(() => {
        consoleErrorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
        consoleLogSpy.mockRestore();
        delete process.env.LOG_LEVEL;
        delete process.env.NODE_ENV;
    });
    describe('LogLevel Enum', () => {
        it('should have correct log level values', () => {
            expect(logger_1.LogLevel.ERROR).toBe(0);
            expect(logger_1.LogLevel.WARN).toBe(1);
            expect(logger_1.LogLevel.INFO).toBe(2);
            expect(logger_1.LogLevel.DEBUG).toBe(3);
        });
    });
    describe('error', () => {
        it('should log error messages', () => {
            process.env.LOG_LEVEL = '3'; // DEBUG level
            const error = new Error('Test error');
            logger_1.logger.error('Error occurred', error, { userId: '123' });
            expect(consoleErrorSpy).toHaveBeenCalled();
            const logEntry = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
            expect(logEntry.level).toBe('ERROR');
            expect(logEntry.message).toBe('Error occurred');
            expect(logEntry.context).toEqual({ userId: '123' });
            expect(logEntry.error).toBeDefined();
            expect(logEntry.error.message).toBe('Test error');
        });
        it('should log error without context', () => {
            process.env.LOG_LEVEL = '3';
            logger_1.logger.error('Simple error');
            expect(consoleErrorSpy).toHaveBeenCalled();
            const logEntry = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
            expect(logEntry.message).toBe('Simple error');
            expect(logEntry.context).toBeUndefined();
        });
    });
    describe('warn', () => {
        it('should log warning messages', () => {
            process.env.LOG_LEVEL = '3';
            logger_1.logger.warn('Warning message', { feature: 'auth' });
            expect(consoleWarnSpy).toHaveBeenCalled();
            const logEntry = JSON.parse(consoleWarnSpy.mock.calls[0][0]);
            expect(logEntry.level).toBe('WARN');
            expect(logEntry.message).toBe('Warning message');
            expect(logEntry.context).toEqual({ feature: 'auth' });
        });
        it('should not log warnings when log level is ERROR only', () => {
            process.env.LOG_LEVEL = '0'; // ERROR only
            logger_1.logger.warn('This should not appear');
            expect(consoleWarnSpy).not.toHaveBeenCalled();
        });
    });
    describe('info', () => {
        it('should log info messages', () => {
            process.env.LOG_LEVEL = '3';
            logger_1.logger.info('User logged in', { userId: '456' });
            expect(consoleLogSpy).toHaveBeenCalled();
            const logEntry = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(logEntry.level).toBe('INFO');
            expect(logEntry.message).toBe('User logged in');
        });
        it('should not log info when log level is WARN', () => {
            process.env.LOG_LEVEL = '1'; // WARN level
            logger_1.logger.info('This should not appear');
            expect(consoleLogSpy).not.toHaveBeenCalled();
        });
    });
    describe('debug', () => {
        it('should log debug messages', () => {
            process.env.LOG_LEVEL = '3';
            logger_1.logger.debug('Debug details', { data: 'test' });
            expect(consoleLogSpy).toHaveBeenCalled();
            const logEntry = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(logEntry.level).toBe('DEBUG');
        });
        it('should not log debug when log level is INFO', () => {
            process.env.LOG_LEVEL = '2'; // INFO level
            logger_1.logger.debug('This should not appear');
            expect(consoleLogSpy).not.toHaveBeenCalled();
        });
    });
    describe('audit', () => {
        it('should always log audit messages regardless of log level', () => {
            process.env.LOG_LEVEL = '0'; // ERROR only
            logger_1.logger.audit('user.delete', 'admin-123', { targetUser: 'user-456' });
            expect(consoleLogSpy).toHaveBeenCalled();
            const logEntry = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(logEntry.type).toBe('AUDIT');
            expect(logEntry.action).toBe('user.delete');
            expect(logEntry.userId).toBe('admin-123');
            expect(logEntry.details).toEqual({ targetUser: 'user-456' });
        });
        it('should include timestamp in audit log', () => {
            const before = new Date().toISOString();
            logger_1.logger.audit('role.update', 'admin-456', { role: 'instructor' });
            const after = new Date().toISOString();
            const logEntry = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(logEntry.timestamp).toBeDefined();
            expect(logEntry.timestamp >= before && logEntry.timestamp <= after).toBe(true);
        });
    });
    describe('log entry format', () => {
        it('should include timestamp in all log entries', () => {
            process.env.LOG_LEVEL = '3';
            logger_1.logger.info('Test message');
            const logEntry = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(logEntry.timestamp).toBeDefined();
            expect(new Date(logEntry.timestamp).toISOString()).toBe(logEntry.timestamp);
        });
    });
});

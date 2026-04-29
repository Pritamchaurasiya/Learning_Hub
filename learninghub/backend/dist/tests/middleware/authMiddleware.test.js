"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jest_mock_extended_1 = require("jest-mock-extended");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_1 = require("../../src/utils/auth");
jest.mock('jsonwebtoken');
describe('AuthMiddleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    let jsonMock;
    let statusMock;
    beforeEach(() => {
        jsonMock = jest.fn().mockReturnThis();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockReq = (0, jest_mock_extended_1.mockDeep)();
        mockRes = (0, jest_mock_extended_1.mockDeep)();
        mockRes.status = statusMock;
        mockRes.json = jsonMock;
        mockNext = jest.fn();
        jest.clearAllMocks();
    });
    describe('authenticate', () => {
        it('should call next() with valid token', () => {
            const token = 'valid-token';
            const decoded = { userId: 'user-123', role: 'student' };
            mockReq.header = jest.fn().mockReturnValue(`Bearer ${token}`);
            jsonwebtoken_1.default.verify.mockReturnValue(decoded);
            (0, auth_1.authenticate)(mockReq, mockRes, mockNext);
            expect(jsonwebtoken_1.default.verify).toHaveBeenCalledWith(token, expect.any(String));
            expect(mockReq.user).toEqual(decoded);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should return 401 when Authorization header is missing', () => {
            mockReq.header = jest.fn().mockReturnValue(undefined);
            (0, auth_1.authenticate)(mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Access denied. No token provided.',
            });
            expect(mockNext).not.toHaveBeenCalled();
        });
        it('should return 401 when token is invalid', () => {
            const token = 'invalid-token';
            mockReq.header = jest.fn().mockReturnValue(`Bearer ${token}`);
            jsonwebtoken_1.default.verify.mockImplementation(() => {
                throw new Error('Invalid token');
            });
            (0, auth_1.authenticate)(mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Invalid token.',
            });
            expect(mockNext).not.toHaveBeenCalled();
        });
        it('should return 401 when token is expired', () => {
            const token = 'expired-token';
            mockReq.header = jest.fn().mockReturnValue(`Bearer ${token}`);
            jsonwebtoken_1.default.verify.mockImplementation(() => {
                throw new Error('Token expired');
            });
            (0, auth_1.authenticate)(mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Invalid token.',
            });
        });
    });
    describe('generateToken', () => {
        it('should generate access token with correct payload', () => {
            const userId = 'user-123';
            const role = 'student';
            const expectedToken = 'generated-access-token';
            jsonwebtoken_1.default.sign.mockReturnValue(expectedToken);
            const token = (0, auth_1.generateToken)(userId, role);
            expect(jsonwebtoken_1.default.sign).toHaveBeenCalledWith({ userId, role }, expect.any(String), { expiresIn: '15m' });
            expect(token).toBe(expectedToken);
        });
    });
    describe('generateRefreshToken', () => {
        it('should generate refresh token with correct payload', () => {
            const userId = 'user-123';
            const role = 'student';
            const expectedToken = 'generated-refresh-token';
            jsonwebtoken_1.default.sign.mockReturnValue(expectedToken);
            const token = (0, auth_1.generateRefreshToken)(userId, role);
            expect(jsonwebtoken_1.default.sign).toHaveBeenCalledWith({ userId, role }, expect.any(String), { expiresIn: '7d' });
            expect(token).toBe(expectedToken);
        });
    });
    describe('verifyRefreshToken', () => {
        it('should verify and return decoded token payload', () => {
            const token = 'refresh-token';
            const decoded = { userId: 'user-123', role: 'student' };
            jsonwebtoken_1.default.verify.mockReturnValue(decoded);
            const result = (0, auth_1.verifyRefreshToken)(token);
            expect(jsonwebtoken_1.default.verify).toHaveBeenCalledWith(token, expect.any(String));
            expect(result).toEqual(decoded);
        });
        it('should throw error for invalid refresh token', () => {
            const token = 'invalid-refresh-token';
            jsonwebtoken_1.default.verify.mockImplementation(() => {
                throw new Error('Invalid refresh token');
            });
            expect(() => (0, auth_1.verifyRefreshToken)(token)).toThrow('Invalid refresh token');
        });
    });
});

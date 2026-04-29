"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthHeader = exports.generateTestRefreshToken = exports.generateTestToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const generateTestToken = (user) => {
    const payload = {
        userId: user.id || 'test-user-id',
        email: user.email || 'test@example.com',
        role: user.role || 'student',
    };
    return jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET || 'test-secret', {
        expiresIn: '1h',
    });
};
exports.generateTestToken = generateTestToken;
const generateTestRefreshToken = (user) => {
    const payload = {
        userId: user.id || 'test-user-id',
        email: user.email || 'test@example.com',
        role: user.role || 'student',
    };
    return jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET || 'test-secret', {
        expiresIn: '7d',
    });
};
exports.generateTestRefreshToken = generateTestRefreshToken;
const createAuthHeader = (token) => ({
    Authorization: `Bearer ${token}`,
});
exports.createAuthHeader = createAuthHeader;

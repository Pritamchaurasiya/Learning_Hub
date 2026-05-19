"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAccessToken = exports.verifyRefreshToken = exports.generateRefreshToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = __importDefault(require("./logger"));
const JWT_SECRET = process.env.NODE_ENV === 'test' ? 'supersecret_for_testing_1234567890' : process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.NODE_ENV === 'test'
    ? 'supersecret_for_testing_1234567890'
    : process.env.JWT_REFRESH_SECRET;
if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
    logger_1.default.error('CRITICAL: JWT secrets not configured. Set JWT_SECRET and JWT_REFRESH_SECRET environment variables.', new Error('JWT secrets missing'), {
        hasJwtSecret: !!JWT_SECRET,
        hasRefreshSecret: !!JWT_REFRESH_SECRET,
    });
    process.exit(1);
}
if (JWT_SECRET.length < 32 || JWT_REFRESH_SECRET.length < 32) {
    logger_1.default.error('CRITICAL: JWT secrets must be at least 32 characters long for security.', new Error('JWT secrets too short'), {
        jwtSecretLength: JWT_SECRET.length,
        refreshSecretLength: JWT_REFRESH_SECRET.length,
        minLength: 32,
    });
    process.exit(1);
}
const generateToken = (userId, email, role) => {
    return jsonwebtoken_1.default.sign({ userId, email, role }, JWT_SECRET, { expiresIn: '15m' });
};
exports.generateToken = generateToken;
const generateRefreshToken = (userId, email, role) => {
    return jsonwebtoken_1.default.sign({ userId, email, role }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
};
exports.generateRefreshToken = generateRefreshToken;
const verifyRefreshToken = (token) => {
    return jsonwebtoken_1.default.verify(token, JWT_REFRESH_SECRET);
};
exports.verifyRefreshToken = verifyRefreshToken;
const verifyAccessToken = (token) => {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
};
exports.verifyAccessToken = verifyAccessToken;

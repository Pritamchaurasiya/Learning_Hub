"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRefreshToken = exports.generateRefreshToken = exports.generateToken = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
    console.error('CRITICAL: JWT secrets not configured. Set JWT_SECRET and JWT_REFRESH_SECRET environment variables.');
    process.exit(1);
}
if (JWT_SECRET.length < 32 || JWT_REFRESH_SECRET.length < 32) {
    console.error('CRITICAL: JWT secrets must be at least 32 characters long for security.');
    process.exit(1);
}
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader) {
            res.status(401).json({ error: 'Access denied. No token provided.' });
            return;
        }
        const token = authHeader.replace('Bearer ', '');
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid token.' });
    }
};
exports.authenticate = authenticate;
const generateToken = (userId, role) => {
    return jsonwebtoken_1.default.sign({ userId, role }, JWT_SECRET, { expiresIn: '15m' });
};
exports.generateToken = generateToken;
const generateRefreshToken = (userId, role) => {
    return jsonwebtoken_1.default.sign({ userId, role }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
};
exports.generateRefreshToken = generateRefreshToken;
const verifyRefreshToken = (token) => {
    return jsonwebtoken_1.default.verify(token, JWT_REFRESH_SECRET);
};
exports.verifyRefreshToken = verifyRefreshToken;

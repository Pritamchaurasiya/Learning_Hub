"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserRateLimit = createUserRateLimit;
exports.getUserRateLimitStatus = getUserRateLimitStatus;
exports.cleanupExpiredRateLimits = cleanupExpiredRateLimits;
const userRateLimitStore = new Map();
function createUserRateLimit(config) {
    const { windowMs, maxRequests, message } = config;
    return async (req, res, next) => {
        const userId = req.user?.userId;
        if (!userId) {
            next();
            return;
        }
        const endpoint = req.originalUrl || req.path;
        const key = `${userId}:${endpoint}`;
        const now = new Date();
        const record = userRateLimitStore.get(key);
        if (!record || now > record.windowEnd) {
            userRateLimitStore.set(key, {
                userId,
                endpoint,
                requestCount: 1,
                windowStart: now,
                windowEnd: new Date(now.getTime() + windowMs),
            });
            next();
            return;
        }
        record.requestCount++;
        if (record.requestCount > maxRequests) {
            res.status(429).json({
                status: 'error',
                message: message ||
                    `Too many requests. Try again in ${Math.ceil((record.windowEnd.getTime() - now.getTime()) / 1000)} seconds`,
                retryAfter: Math.ceil((record.windowEnd.getTime() - now.getTime()) / 1000),
            });
            return;
        }
        res.set('X-RateLimit-Limit', maxRequests.toString());
        res.set('X-RateLimit-Remaining', Math.max(0, maxRequests - record.requestCount).toString());
        res.set('X-RateLimit-Reset', record.windowEnd.getTime().toString());
        next();
    };
}
async function getUserRateLimitStatus(userId) {
    const now = new Date();
    const endpoints = [];
    for (const [key, record] of userRateLimitStore.entries()) {
        if (record.userId === userId && now <= record.windowEnd) {
            endpoints.push({
                endpoint: record.endpoint,
                remaining: Math.max(0, 100 - record.requestCount),
                limit: 100,
                resetAt: record.windowEnd,
            });
        }
    }
    return { endpoints };
}
function cleanupExpiredRateLimits() {
    const now = new Date();
    for (const [key, record] of userRateLimitStore.entries()) {
        if (now > record.windowEnd) {
            userRateLimitStore.delete(key);
        }
    }
}
setInterval(cleanupExpiredRateLimits, 5 * 60 * 1000);
exports.default = createUserRateLimit;

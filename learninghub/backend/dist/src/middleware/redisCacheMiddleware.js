"use strict";
/**
 * Redis Cache Middleware
 *
 * Uses Redis for distributed caching across multiple backend instances.
 * Falls back to in-memory NodeCache when Redis is unavailable.
 *
 * Features:
 *  - User-scoped cache keys for authenticated endpoints
 *  - Configurable TTL per endpoint
 *  - Cache invalidation by pattern
 *  - Graceful degradation to NodeCache
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisCacheMiddleware = void 0;
exports.invalidateCache = invalidateCache;
exports.cacheInvalidation = cacheInvalidation;
const node_cache_1 = __importDefault(require("node-cache"));
const CacheService_1 = require("../services/CacheService");
const logger_1 = __importDefault(require("../utils/logger"));
// Fallback in-memory cache
const fallbackCache = new node_cache_1.default({ stdTTL: 300, checkperiod: 120 });
const redisCacheMiddleware = (durationInSeconds) => {
    return async (req, res, next) => {
        if (req.method !== 'GET') {
            next();
            return;
        }
        const key = `cache:${req.originalUrl || req.url}_${req.user?.userId ?? 'anonymous'}`;
        try {
            // Try Redis first
            const cached = await CacheService_1.cacheService.get(key);
            if (cached) {
                if (process.env.NODE_ENV !== 'test') {
                    logger_1.default.info(`[RedisCache] HIT for ${key}`);
                }
                res.json(JSON.parse(cached));
                return;
            }
            if (process.env.NODE_ENV !== 'test') {
                logger_1.default.info(`[RedisCache] MISS for ${key}`);
            }
            // Override res.json to capture and cache
            const originalJson = res.json.bind(res);
            res.json = (body) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        CacheService_1.cacheService.set(key, JSON.stringify(body), durationInSeconds).catch(() => {
                            // Fallback to NodeCache if Redis fails
                            fallbackCache.set(key, body, durationInSeconds);
                        });
                    }
                    catch {
                        fallbackCache.set(key, body, durationInSeconds);
                    }
                }
                return originalJson(body);
            };
            next();
        }
        catch {
            // Redis unavailable — use fallback cache
            const fallbackKey = `fallback:${key}`;
            const fallbackCached = fallbackCache.get(fallbackKey);
            if (fallbackCached) {
                res.json(fallbackCached);
                return;
            }
            const originalJson = res.json.bind(res);
            res.json = (body) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    fallbackCache.set(fallbackKey, body, durationInSeconds);
                }
                return originalJson(body);
            };
            next();
        }
    };
};
exports.redisCacheMiddleware = redisCacheMiddleware;
/**
 * Invalidate cache by pattern.
 */
async function invalidateCache(pattern) {
    try {
        await CacheService_1.cacheService.deletePattern(pattern);
    }
    catch {
        // Fallback: clear NodeCache
        fallbackCache.flushAll();
    }
}
/**
 * Cache invalidation middleware for write operations.
 */
function cacheInvalidation(pattern) {
    return async (_req, _res, next) => {
        const originalJson = _res.json.bind(_res);
        _res.json = (body) => {
            if (_res.statusCode >= 200 && _res.statusCode < 300) {
                invalidateCache(pattern).catch(() => { });
            }
            return originalJson(body);
        };
        next();
    };
}

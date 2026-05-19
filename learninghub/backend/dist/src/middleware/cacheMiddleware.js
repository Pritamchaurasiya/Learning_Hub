"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCache = exports.cacheMiddleware = exports.apiCache = void 0;
const node_cache_1 = __importDefault(require("node-cache"));
const logger_1 = __importDefault(require("../utils/logger"));
// Default TTL: 5 minutes (300 seconds)
exports.apiCache = new node_cache_1.default({ stdTTL: 300, checkperiod: 120 });
const cacheMiddleware = (durationInSeconds) => {
    return (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            next();
            return;
        }
        // Use full URL as the cache key.
        // If the endpoint is specific to a user, this might leak data.
        // So we append the userId if present to ensure user-scoped caching where needed.
        const key = `__express__${req.originalUrl || req.url}_${req.user?.userId ?? 'anonymous'}`;
        const cachedResponse = exports.apiCache.get(key);
        if (cachedResponse) {
            if (process.env.NODE_ENV !== 'test') {
                logger_1.default.info(`[Cache] HIT for ${key}`);
            }
            res.json(cachedResponse);
            return;
        }
        if (process.env.NODE_ENV !== 'test') {
            logger_1.default.info(`[Cache] MISS for ${key}`);
        }
        // Override res.json to capture and cache the payload before sending
        const originalJson = res.json.bind(res);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        res.json = (body) => {
            // Only cache success responses (assuming status 200)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                exports.apiCache.set(key, body, durationInSeconds);
            }
            return originalJson(body);
        };
        next();
    };
};
exports.cacheMiddleware = cacheMiddleware;
const clearCache = (req, res, next) => {
    exports.apiCache.flushAll();
    if (process.env.NODE_ENV !== 'test') {
        logger_1.default.info('[Cache] Cleared all cache entries');
    }
    next();
};
exports.clearCache = clearCache;

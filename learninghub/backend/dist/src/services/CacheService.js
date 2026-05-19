"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = exports.CacheService = void 0;
const redis_1 = require("redis");
class CacheService {
    client = null;
    DEFAULT_TTL = 300; // 5 minutes
    EXTENDED_TTL = 3600; // 1 hour
    SHORT_TTL = 60; // 1 minute
    constructor() {
        void this.initializeClient();
    }
    async initializeClient() {
        if (this.client)
            return;
        try {
            const redisUrl = process.env.REDIS_URL;
            if (!redisUrl) {
                console.warn('REDIS_URL not set, caching disabled');
                return;
            }
            this.client = (0, redis_1.createClient)({
                url: redisUrl,
                socket: {
                    reconnectStrategy: retries => Math.min(retries * 100, 5000),
                },
            });
            this.client.on('error', err => {
                console.error('Redis Client Error:', err);
            });
            await this.client.connect();
            // eslint-disable-next-line no-console
            console.log('Redis connected successfully');
        }
        catch (error) {
            console.error('Failed to connect to Redis:', error);
            this.client = null;
        }
    }
    async get(key) {
        if (!this.client)
            return null;
        try {
            const value = await this.client.get(key);
            if (!value)
                return null;
            return JSON.parse(value);
        }
        catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }
    async set(key, value, ttl = this.DEFAULT_TTL) {
        if (!this.client)
            return;
        try {
            const serialized = JSON.stringify(value);
            await this.client.setEx(key, ttl, serialized);
        }
        catch (error) {
            console.error('Cache set error:', error);
        }
    }
    async delete(key) {
        if (!this.client)
            return;
        try {
            await this.client.del(key);
        }
        catch (error) {
            console.error('Cache delete error:', error);
        }
    }
    async deletePattern(pattern) {
        if (!this.client)
            return;
        try {
            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(keys);
            }
        }
        catch (error) {
            console.error('Cache delete pattern error:', error);
        }
    }
    async getOrSet(key, factory, ttl = this.DEFAULT_TTL) {
        const cached = await this.get(key);
        if (cached !== null)
            return cached;
        const value = await factory();
        await this.set(key, value, ttl);
        return value;
    }
    async increment(key, amount = 1) {
        if (!this.client)
            return 0;
        try {
            return await this.client.incrBy(key, amount);
        }
        catch (error) {
            console.error('Cache increment error:', error);
            return 0;
        }
    }
    async expire(key, seconds) {
        if (!this.client)
            return;
        try {
            await this.client.expire(key, seconds);
        }
        catch (error) {
            console.error('Cache expire error:', error);
        }
    }
    async exists(key) {
        if (!this.client)
            return false;
        try {
            const result = await this.client.exists(key);
            return result === 1;
        }
        catch (error) {
            console.error('Cache exists error:', error);
            return false;
        }
    }
    generateKey(...parts) {
        return parts.filter(Boolean).join(':');
    }
    // Cache key generators for common entities
    userKey(userId) {
        return this.generateKey('user', userId);
    }
    userByEmailKey(email) {
        return this.generateKey('user', 'email', email.toLowerCase().trim());
    }
    courseKey(courseId) {
        return this.generateKey('course', courseId);
    }
    coursesListKey(filters) {
        const filterHash = Object.entries(filters)
            .sort()
            .map(([k, v]) => `${k}=${v}`)
            .join(',');
        return this.generateKey('courses', 'list', filterHash || 'all');
    }
    userProgressKey(userId, courseId) {
        return this.generateKey('progress', userId, courseId);
    }
    quizKey(quizId) {
        return this.generateKey('quiz', quizId);
    }
    leaderboardKey(timeframe) {
        return this.generateKey('leaderboard', timeframe);
    }
    searchKey(query, filters) {
        const filterHash = Object.entries(filters)
            .sort()
            .map(([k, v]) => `${k}=${v}`)
            .join(',');
        return this.generateKey('search', query.toLowerCase().trim(), filterHash);
    }
    async disconnect() {
        if (this.client) {
            await this.client.quit();
            this.client = null;
        }
    }
}
exports.CacheService = CacheService;
// Singleton instance
exports.cacheService = new CacheService();

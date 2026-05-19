"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trending = exports.suggestions = exports.globalSearch = void 0;
const prismaClient_1 = require("../prismaClient");
const logger_1 = __importDefault(require("../utils/logger"));
const QueryOptimizationService_1 = require("../services/QueryOptimizationService");
/**
 * Search courses, tests, and content
 * Supports filtering by type, category, difficulty, rating, price
 */
const globalSearch = async (req, res) => {
    try {
        const q = typeof req.query.q === 'string' ? req.query.q : undefined;
        const type = typeof req.query.type === 'string' ? req.query.type : undefined;
        const category = typeof req.query.category === 'string' ? req.query.category : undefined;
        const difficulty = typeof req.query.difficulty === 'string' ? req.query.difficulty : undefined;
        const page = typeof req.query.page === 'string' ? parseInt(req.query.page) : 1;
        const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit) : 20;
        if (type && type === 'tests') {
            res.status(400).json({ status: 'error', message: 'Search type "tests" is not supported yet' });
            return;
        }
        const result = await QueryOptimizationService_1.queryOptimizationService.getDiscoverCourses({
            page,
            limit,
            category,
            difficulty,
            search: q,
        });
        res.json({
            status: 'success',
            data: result.courses,
            meta: {
                total: result.pagination.total,
                page: result.pagination.page,
                pages: result.pagination.pages,
                hasNext: result.pagination.page < result.pagination.pages,
                hasPrev: result.pagination.page > 1,
                query: q,
            },
        });
    }
    catch (error) {
        logger_1.default.error('[SearchController] search error', error instanceof Error ? error : new Error(String(error)));
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.globalSearch = globalSearch;
/**
 * Get search suggestions based on partial query
 */
const suggestions = async (req, res) => {
    try {
        const { q, limit = '10' } = req.query;
        if (!q || typeof q !== 'string' || q.length < 2) {
            res.json({ status: 'success', data: [] });
            return;
        }
        const parsedLimit = parseInt(limit);
        // Get matching course titles and categories
        const [titles, categories] = await Promise.all([
            prismaClient_1.prisma.course.findMany({
                where: {
                    title: { contains: q, mode: 'insensitive' },
                },
                take: parsedLimit,
                select: { title: true },
            }),
            prismaClient_1.prisma.course.findMany({
                where: {
                    category: { contains: q, mode: 'insensitive' },
                },
                take: parsedLimit,
                select: { category: true },
            }),
        ]);
        const suggestionSet = new Set();
        titles.forEach(t => t.title && suggestionSet.add(t.title));
        categories.forEach(c => c.category && suggestionSet.add(c.category));
        res.json({
            status: 'success',
            data: Array.from(suggestionSet).slice(0, parsedLimit),
        });
    }
    catch (error) {
        logger_1.default.error('[SearchController] suggestions error', error instanceof Error ? error : new Error(String(error)));
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.suggestions = suggestions;
/**
 * Get trending searches/courses
 */
const trending = async (req, res) => {
    try {
        const { limit = '10' } = req.query;
        const parsedLimit = Math.min(25, Math.max(1, Number.parseInt(limit, 10) || 10));
        // Get most enrolled courses in last 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const trendingCourses = await prismaClient_1.prisma.userProgress.groupBy({
            by: ['courseId'],
            where: {
                createdAt: { gte: sevenDaysAgo },
            },
            _count: { courseId: true },
            orderBy: { _count: { courseId: 'desc' } },
            take: parsedLimit,
        });
        // Fetch course details
        const courseIds = trendingCourses.map(tc => tc.courseId);
        const courses = await prismaClient_1.prisma.course.findMany({
            where: { id: { in: courseIds } },
            select: {
                id: true,
                title: true,
                thumbnail: true,
                studentCount: true,
                rating: true,
            },
        });
        const byId = new Map(courses.map(course => [course.id, course]));
        const orderedCourses = trendingCourses
            .map(item => byId.get(item.courseId))
            .filter((course) => Boolean(course));
        res.json({
            status: 'success',
            data: orderedCourses,
        });
    }
    catch (error) {
        logger_1.default.error('[SearchController] trending error', error instanceof Error ? error : new Error(String(error)));
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.trending = trending;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBookmark = exports.createBookmark = exports.getBookmarks = void 0;
const prismaClient_1 = require("../prismaClient");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Bookmark Controller - RESTful endpoints for bookmark management
 * Base route: /users/bookmarks
 */
const getBookmarks = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const bookmarks = await prismaClient_1.prisma.bookmark.findMany({
            where: { userId },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        thumbnail: true,
                        difficulty: true,
                        duration: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json({
            status: 'success',
            count: bookmarks.length,
            data: bookmarks.map(b => ({
                id: b.course.id,
                title: b.course.title,
                description: b.course.description,
                thumbnail: b.course.thumbnail,
                level: b.course.difficulty,
                duration: b.course.duration,
                bookmarked_at: b.createdAt,
            })),
        });
    }
    catch (error) {
        logger_1.default.error('[BookmarksController] getBookmarks error', error instanceof Error ? error : new Error(String(error)), {
            userId: req.user?.userId,
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getBookmarks = getBookmarks;
const createBookmark = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const { course_id, notes } = req.body;
        if (!course_id) {
            res.status(400).json({ status: 'error', message: 'Course ID is required' });
            return;
        }
        // Check if course exists
        const course = await prismaClient_1.prisma.course.findUnique({
            where: { id: course_id },
        });
        if (!course) {
            res.status(404).json({ status: 'error', message: 'Course not found' });
            return;
        }
        // Check if bookmark already exists
        const existing = await prismaClient_1.prisma.bookmark.findUnique({
            where: {
                idx_unique_user_course_bookmark: {
                    userId,
                    courseId: course_id,
                },
            },
        });
        if (existing) {
            res.status(409).json({ status: 'error', message: 'Course is already bookmarked' });
            return;
        }
        // Create bookmark
        const bookmark = await prismaClient_1.prisma.bookmark.create({
            data: {
                userId,
                courseId: course_id,
            },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        thumbnail: true,
                        difficulty: true,
                        duration: true,
                    },
                },
            },
        });
        // If notes provided, also create/update a Note
        if (notes?.trim()) {
            await prismaClient_1.prisma.note.upsert({
                where: {
                    userId_courseId: {
                        userId,
                        courseId: course_id,
                    },
                },
                update: {
                    content: notes,
                    updatedAt: new Date(),
                },
                create: {
                    userId,
                    courseId: course_id,
                    content: notes,
                },
            });
        }
        res.status(201).json({
            status: 'success',
            message: 'Bookmark added successfully',
            data: {
                id: bookmark.course.id,
                title: bookmark.course.title,
                description: bookmark.course.description,
                thumbnail: bookmark.course.thumbnail,
                level: bookmark.course.difficulty,
                duration: bookmark.course.duration,
                bookmarked_at: bookmark.createdAt,
            },
        });
    }
    catch (error) {
        logger_1.default.error('[BookmarksController] createBookmark error', error instanceof Error ? error : new Error(String(error)), {
            userId: req.user?.userId,
            courseId: req.body?.course_id,
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.createBookmark = createBookmark;
const deleteBookmark = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const courseId = req.params.courseId;
        const deleted = await prismaClient_1.prisma.bookmark.deleteMany({
            where: {
                userId,
                courseId,
            },
        });
        if (deleted.count === 0) {
            res.status(404).json({ status: 'error', message: 'Bookmark not found' });
            return;
        }
        res.json({
            status: 'success',
            message: 'Bookmark removed successfully',
        });
    }
    catch (error) {
        logger_1.default.error('[BookmarksController] deleteBookmark error', error instanceof Error ? error : new Error(String(error)), {
            userId: req.user?.userId,
            courseId: req.params?.courseId,
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.deleteBookmark = deleteBookmark;

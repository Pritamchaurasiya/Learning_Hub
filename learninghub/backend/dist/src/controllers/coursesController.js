"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCourseProgress = exports.enrollInCourse = exports.getCourseReviews = exports.getCourseDetails = exports.listCourses = void 0;
const prismaClient_1 = require("../prismaClient");
const pagination_1 = require("../utils/pagination");
const listCourses = async (req, res) => {
    try {
        const { phase, difficulty, category, search } = req.query;
        const { page, limit, skip } = (0, pagination_1.getPaginationParams)(req.query);
        const filters = {};
        if (phase)
            filters.phase = phase;
        if (difficulty)
            filters.difficulty = difficulty;
        if (category)
            filters.category = category;
        // Add search by title or description
        if (search && typeof search === 'string') {
            filters.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }
        // Get total count for pagination
        const total = await prismaClient_1.prisma.course.count({ where: filters });
        const courses = await prismaClient_1.prisma.course.findMany({
            where: filters,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { progress: true, bookmarks: true }
                }
            }
        });
        res.json((0, pagination_1.createPaginatedResponse)(courses, total, page, limit));
    }
    catch (error) {
        console.error('[CoursesController] listCourses error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.listCourses = listCourses;
const getCourseDetails = async (req, res) => {
    try {
        const id = req.params.id;
        const course = await prismaClient_1.prisma.course.findUnique({
            where: { id },
            include: {
                tests: {
                    include: {
                        questions: true
                    }
                }
            }
        });
        if (!course) {
            res.status(404).json({ status: 'error', message: 'Course not found' });
            return;
        }
        res.json({ status: 'success', data: course });
    }
    catch (error) {
        console.error('[CoursesController] getCourseDetails error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getCourseDetails = getCourseDetails;
const getCourseReviews = async (req, res) => {
    try {
        const courseId = req.params.id;
        // Since Review model not in schema yet, return empty array
        // This endpoint is prepared for when Review model is added
        res.json({
            status: 'success',
            data: [],
            meta: { total: 0, page: 1, pages: 0 }
        });
    }
    catch (error) {
        console.error('[CoursesController] getCourseReviews error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getCourseReviews = getCourseReviews;
const enrollInCourse = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { courseId } = req.body;
        if (!courseId) {
            res.status(400).json({ status: 'error', message: 'Course ID is required' });
            return;
        }
        const enrollment = await prismaClient_1.prisma.userProgress.upsert({
            where: {
                userId_courseId: { userId, courseId }
            },
            update: {},
            create: {
                userId,
                courseId,
                status: 'started',
                progress: 0
            }
        });
        res.status(201).json({ status: 'success', data: enrollment });
    }
    catch (error) {
        console.error('[CoursesController] enrollInCourse error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.enrollInCourse = enrollInCourse;
const updateCourseProgress = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { courseId, progress } = req.body;
        const updated = await prismaClient_1.prisma.userProgress.update({
            where: {
                userId_courseId: { userId, courseId }
            },
            data: {
                progress,
                status: progress === 100 ? 'completed' : 'started',
                updatedAt: new Date()
            }
        });
        res.json({ status: 'success', data: updated });
    }
    catch (error) {
        console.error('[CoursesController] updateProgress error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.updateCourseProgress = updateCourseProgress;

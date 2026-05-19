"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCourseProgress = exports.enrollInCourse = exports.getCourseReviews = exports.getCourseDetails = exports.listCourses = void 0;
const prismaClient_1 = require("../prismaClient");
const pagination_1 = require("../utils/pagination");
const logger_1 = __importDefault(require("../utils/logger"));
const listCourses = async (req, res) => {
    try {
        const { phase, difficulty, category, search } = req.query;
        const { page, limit, skip } = (0, pagination_1.getPaginationParams)(req.query);
        const filters = {};
        if (phase && typeof phase === 'string')
            filters.phase = phase;
        if (difficulty && typeof difficulty === 'string')
            filters.difficulty = difficulty;
        if (category && typeof category === 'string')
            filters.category = category;
        // Add search by title or description
        if (search && typeof search === 'string') {
            filters.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }
        // Parallelize count + findMany for performance
        const [total, courses] = await Promise.all([
            prismaClient_1.prisma.course.count({ where: filters }),
            prismaClient_1.prisma.course.findMany({
                where: filters,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: { progress: true, bookmarks: true },
                    },
                },
            }),
        ]);
        res.status(200).json((0, pagination_1.createPaginatedResponse)(courses, total, page, limit));
    }
    catch (error) {
        logger_1.default.error('[CoursesController] listCourses error', error instanceof Error ? error : new Error(String(error)));
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
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        passingScore: true,
                        timeLimit: true,
                        _count: { select: { questions: true } },
                    },
                },
                modules: {
                    orderBy: { order: 'asc' },
                    include: {
                        lessons: {
                            orderBy: { order: 'asc' },
                            select: {
                                id: true,
                                title: true,
                                description: true,
                                duration: true,
                                order: true,
                                isFree: true,
                                videoUrl: true,
                                transcript: true,
                                resources: true,
                            },
                        },
                    },
                },
                instructor: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                        bio: true,
                    },
                },
            },
        });
        if (!course) {
            res.status(404).json({ status: 'error', message: 'Course not found' });
            return;
        }
        // Transform modules to sections format expected by frontend
        const sections = (course.modules || []).map(mod => ({
            id: mod.id,
            title: mod.title,
            lessons: (mod.lessons || []).map(les => ({
                id: les.id,
                title: les.title,
                description: les.description ?? null,
                duration: Math.round(les.duration / 60), // Convert seconds to minutes
                video_url: les.videoUrl,
                completed: false,
                order: les.order,
                is_free: les.isFree,
            })),
        }));
        // Check enrollment status if user is authenticated
        let isEnrolled = false;
        let progressPercent = null;
        const userId = req.user?.userId;
        if (userId) {
            const enrollment = await prismaClient_1.prisma.userProgress.findUnique({
                where: { idx_unique_user_course: { userId, courseId: id } },
            });
            if (enrollment) {
                isEnrolled = true;
                progressPercent = enrollment.progress;
            }
        }
        // Build response matching CourseDetails interface
        const instructor = course.instructor;
        const responseData = {
            id: course.id,
            title: course.title,
            description: course.description,
            short_description: course.shortDescription,
            thumbnail: course.thumbnail,
            trailer_video: course.trailerVideo,
            instructor: {
                id: instructor?.id ?? 'instructor-1',
                display_name: instructor?.username ?? 'Expert Instructor',
                avatar: instructor?.avatar ?? null,
                bio: instructor?.bio ?? null,
                total_students: course.studentCount,
                total_courses: 1,
            },
            price: course.price ?? 0,
            original_price: course.originalPrice,
            rating: course.rating,
            review_count: course.reviewCount,
            student_count: course.studentCount,
            duration: course.duration.toString(),
            level: course.difficulty,
            language: course.language,
            last_updated: course.lastUpdated?.toISOString() ?? new Date().toISOString(),
            certificate: course.certificate,
            sections,
            learning_outcomes: [],
            prerequisites: [],
            tags: course.category ? [course.category] : [],
            is_enrolled: isEnrolled,
            progress_percent: progressPercent,
        };
        res.status(200).json({ status: 'success', data: responseData });
    }
    catch (error) {
        logger_1.default.error('[CoursesController] getCourseDetails error', error instanceof Error ? error : new Error(String(error)), {
            courseId: req.params.id,
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getCourseDetails = getCourseDetails;
const getCourseReviews = async (req, res) => {
    try {
        const id = req.params.id;
        const course = await prismaClient_1.prisma.course.findUnique({
            where: { id },
            select: { reviewCount: true, rating: true },
        });
        if (!course) {
            res.status(404).json({ status: 'error', message: 'Course not found' });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: [],
            meta: {
                total: course.reviewCount,
                average_rating: course.rating,
                page: 1,
                pages: 0,
            },
        });
    }
    catch (error) {
        logger_1.default.error('[CoursesController] getCourseReviews error', error instanceof Error ? error : new Error(String(error)), {
            courseId: req.params.id,
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getCourseReviews = getCourseReviews;
const enrollInCourse = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const { courseId } = req.body;
        if (!courseId) {
            res.status(400).json({ status: 'error', message: 'Course ID is required' });
            return;
        }
        const course = await prismaClient_1.prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
        if (!course) {
            res.status(404).json({ status: 'error', message: 'Course not found' });
            return;
        }
        const enrollment = await prismaClient_1.prisma.userProgress.upsert({
            where: {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                idx_unique_user_course: { userId: userId, courseId },
            },
            update: {},
            create: {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                userId: userId,
                courseId,
                status: 'IN_PROGRESS',
                progress: 0,
            },
        });
        res.status(201).json({ status: 'success', data: enrollment });
    }
    catch (error) {
        logger_1.default.error('[CoursesController] enrollInCourse error', error instanceof Error ? error : new Error(String(error)), {
            userId: req.user?.userId,
            courseId: req.body?.courseId,
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.enrollInCourse = enrollInCourse;
const updateCourseProgress = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const { courseId, progress } = req.body;
        const normalizedProgress = Math.max(0, Math.min(100, Number(progress)));
        if (!courseId || Number.isNaN(normalizedProgress)) {
            res
                .status(400)
                .json({ status: 'error', message: 'Course ID and valid progress are required' });
            return;
        }
        const updated = await prismaClient_1.prisma.userProgress.upsert({
            where: {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                idx_unique_user_course: { userId: userId, courseId },
            },
            update: {
                progress: normalizedProgress,
                status: normalizedProgress === 100 ? 'COMPLETED' : 'IN_PROGRESS',
                updatedAt: new Date(),
            },
            create: {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                userId: userId,
                courseId,
                progress: normalizedProgress,
                status: normalizedProgress === 100 ? 'COMPLETED' : 'IN_PROGRESS',
            },
        });
        res.status(200).json({ status: 'success', data: updated });
    }
    catch (error) {
        logger_1.default.error('[CoursesController] updateProgress error', error instanceof Error ? error : new Error(String(error)), {
            userId: req.user?.userId,
            courseId: req.body?.courseId,
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.updateCourseProgress = updateCourseProgress;

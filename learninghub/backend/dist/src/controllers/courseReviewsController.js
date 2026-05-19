"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markReviewHelpful = exports.getCourseReviews = exports.createCourseReview = void 0;
const prismaClient_1 = require("../prismaClient");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * POST /api/v1/courses/:id/reviews
 * Create or update a course review.
 */
const createCourseReview = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const courseId = req.params.id;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const { rating, title, content } = req.body;
        if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
            res.status(400).json({ status: 'error', message: 'Rating must be between 1 and 5' });
            return;
        }
        const course = await prismaClient_1.prisma.course.findUnique({
            where: { id: courseId },
            select: { id: true, isPublished: true },
        });
        if (!course?.isPublished) {
            res.status(404).json({ status: 'error', message: 'Course not found' });
            return;
        }
        const existing = await prismaClient_1.prisma.courseReview.findUnique({
            where: { courseId_userId: { courseId, userId } },
        });
        let review;
        if (existing) {
            review = await prismaClient_1.prisma.courseReview.update({
                where: { courseId_userId: { courseId, userId } },
                data: {
                    rating,
                    title: title ?? existing.title,
                    content: content ?? existing.content,
                    updatedAt: new Date(),
                },
            });
        }
        else {
            review = await prismaClient_1.prisma.courseReview.create({
                data: {
                    courseId,
                    userId,
                    rating,
                    title,
                    content,
                    isVerified: true,
                },
            });
        }
        // Update course aggregate stats
        const stats = await prismaClient_1.prisma.courseReview.aggregate({
            where: { courseId, isVisible: true },
            _avg: { rating: true },
            _count: { id: true },
        });
        await prismaClient_1.prisma.course.update({
            where: { id: courseId },
            data: {
                rating: stats._avg.rating ?? 0,
                reviewCount: stats._count.id,
            },
        });
        res.status(existing ? 200 : 201).json({
            status: 'success',
            message: existing ? 'Review updated' : 'Review created',
            data: review,
        });
    }
    catch (error) {
        logger_1.default.error('[CourseReviews] createCourseReview error', error instanceof Error ? error : new Error(String(error)), { courseId: req.params.id, userId: req.user?.userId });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.createCourseReview = createCourseReview;
/**
 * GET /api/v1/courses/:id/reviews
 * Get paginated reviews for a course.
 */
const getCourseReviews = async (req, res) => {
    try {
        const courseId = req.params.id;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const skip = (page - 1) * limit;
        const course = await prismaClient_1.prisma.course.findUnique({
            where: { id: courseId },
            select: { reviewCount: true, rating: true },
        });
        if (!course) {
            res.status(404).json({ status: 'error', message: 'Course not found' });
            return;
        }
        const [reviews, total] = await Promise.all([
            prismaClient_1.prisma.courseReview.findMany({
                where: { courseId, isVisible: true },
                skip,
                take: limit,
                include: {
                    reviewer: {
                        select: {
                            id: true,
                            username: true,
                            avatar: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prismaClient_1.prisma.courseReview.count({ where: { courseId, isVisible: true } }),
        ]);
        res.json({
            status: 'success',
            data: reviews.map(r => ({
                id: r.id,
                rating: r.rating,
                title: r.title,
                content: r.content,
                is_verified: r.isVerified,
                helpful_count: r.helpfulCount,
                created_at: r.createdAt,
                reviewer: {
                    id: r.reviewer.id,
                    username: r.reviewer.username,
                    avatar: r.reviewer.avatar,
                },
            })),
            meta: {
                total,
                average_rating: course.rating,
                page,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        logger_1.default.error('[CourseReviews] getCourseReviews error', error instanceof Error ? error : new Error(String(error)), { courseId: req.params.id });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getCourseReviews = getCourseReviews;
/**
 * PUT /api/v1/courses/:courseId/reviews/:reviewId/helpful
 * Mark a review as helpful. Authenticated users only.
 * Uses a simple session-based deduplication to prevent spam.
 */
const helpfulVotes = new Map(); // userId -> Set of reviewIds
const markReviewHelpful = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const reviewId = req.params.reviewId;
        // Check if review exists
        const review = await prismaClient_1.prisma.courseReview.findUnique({
            where: { id: reviewId },
            select: { id: true },
        });
        if (!review) {
            res.status(404).json({ status: 'error', message: 'Review not found' });
            return;
        }
        // Check if user already voted (in-memory deduplication)
        const userVotes = helpfulVotes.get(userId) ?? new Set();
        if (userVotes.has(reviewId)) {
            res.status(409).json({ status: 'error', message: 'Already marked as helpful' });
            return;
        }
        // Increment helpfulCount
        await prismaClient_1.prisma.courseReview.update({
            where: { id: reviewId },
            data: { helpfulCount: { increment: 1 } },
        });
        // Record the vote
        userVotes.add(reviewId);
        helpfulVotes.set(userId, userVotes);
        res.json({ status: 'success', message: 'Review marked as helpful' });
    }
    catch (error) {
        logger_1.default.error('[CourseReviews] markReviewHelpful error', error instanceof Error ? error : new Error(String(error)), { reviewId: req.params.reviewId });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.markReviewHelpful = markReviewHelpful;

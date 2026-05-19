"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleBookmark = exports.updateStreak = exports.completeCourse = void 0;
const prismaClient_1 = require("../prismaClient");
const logger_1 = __importDefault(require("../utils/logger"));
const completeCourse = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const { courseId } = req.body;
        if (!courseId) {
            res.status(400).json({ status: 'error', message: 'CourseId is required' });
            return;
        }
        // XP is server-calculated based on course difficulty, not client-supplied
        const difficultyXP = {
            BEGINNER: 50,
            INTERMEDIATE: 100,
            ADVANCED: 200,
            EXPERT: 500,
        };
        const [course, user] = await Promise.all([
            prismaClient_1.prisma.course.findUnique({ where: { id: courseId }, select: { id: true, difficulty: true } }),
            prismaClient_1.prisma.user.findUnique({ where: { id: userId }, select: { id: true, xp: true } }),
        ]);
        if (!course) {
            res.status(404).json({ status: 'error', message: 'Course not found' });
            return;
        }
        if (!user) {
            res.status(404).json({ status: 'error', message: 'User not found' });
            return;
        }
        const existingProgress = await prismaClient_1.prisma.userProgress.findUnique({
            where: {
                idx_unique_user_course: { userId, courseId },
            },
            select: { id: true, status: true },
        });
        // Server-calculated XP based on course difficulty
        const baseXP = difficultyXP[course.difficulty] ?? 100;
        const awardedXP = existingProgress?.status === 'COMPLETED' ? 0 : baseXP;
        const newXP = user.xp + awardedXP;
        const newLevel = Math.floor(newXP / 100) + 1;
        const [progress, updatedUser] = await prismaClient_1.prisma.$transaction([
            prismaClient_1.prisma.userProgress.upsert({
                where: {
                    idx_unique_user_course: {
                        userId,
                        courseId,
                    },
                },
                update: {
                    status: 'COMPLETED',
                    progress: 100,
                },
                create: {
                    userId,
                    courseId,
                    status: 'COMPLETED',
                    progress: 100,
                },
            }),
            prismaClient_1.prisma.user.update({
                where: { id: userId },
                data: {
                    xp: newXP,
                    level: newLevel,
                    lastActive: new Date(),
                },
            }),
        ]);
        res.json({
            status: 'success',
            message: awardedXP > 0 ? 'Course completed successfully' : 'Course already completed',
            data: {
                progress,
                user: {
                    xp: updatedUser.xp,
                    level: updatedUser.level,
                },
                xp_awarded: awardedXP,
            },
        });
    }
    catch (error) {
        logger_1.default.error('Complete course error', error instanceof Error ? error : new Error(String(error)), {
            userId: req.user?.userId,
            courseId: req.body?.courseId,
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.completeCourse = completeCourse;
const updateStreak = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const user = await prismaClient_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            res.status(404).json({ status: 'error', message: 'User not found' });
            return;
        }
        // Use UTC date-only comparison for deterministic streak calculation
        // This avoids timezone and DST issues from raw millisecond division
        const today = new Date();
        const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
        const lastActive = new Date(user.lastActive);
        const lastActiveUTC = Date.UTC(lastActive.getUTCFullYear(), lastActive.getUTCMonth(), lastActive.getUTCDate());
        const diffDays = Math.round((todayUTC - lastActiveUTC) / (1000 * 60 * 60 * 24));
        let newStreak = user.streak;
        if (diffDays === 0) {
            // Same calendar day — no change
        }
        else if (diffDays === 1) {
            newStreak += 1;
        }
        else {
            // Streak broken (missed a day)
            newStreak = 1;
        }
        const newLongestStreak = Math.max(user.longestStreak, newStreak);
        const updatedUser = await prismaClient_1.prisma.user.update({
            where: { id: userId },
            data: {
                streak: newStreak,
                longestStreak: newLongestStreak,
                lastActive: today,
            },
        });
        res.json({
            status: 'success',
            message: 'Streak updated',
            data: {
                streak: updatedUser.streak,
                lastActive: updatedUser.lastActive,
            },
        });
    }
    catch (error) {
        logger_1.default.error('Update streak error', error instanceof Error ? error : new Error(String(error)), {
            userId: req.user?.userId,
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.updateStreak = updateStreak;
const toggleBookmark = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const { courseId } = req.body;
        if (!courseId || typeof courseId !== 'string') {
            res.status(400).json({ status: 'error', message: 'Course ID is required' });
            return;
        }
        const existing = await prismaClient_1.prisma.bookmark.findUnique({
            where: {
                idx_unique_user_course_bookmark: {
                    userId,
                    courseId,
                },
            },
        });
        if (existing) {
            await prismaClient_1.prisma.bookmark.delete({
                where: { id: existing.id },
            });
            res.json({ status: 'success', message: 'Bookmark removed', data: { bookmarked: false } });
        }
        else {
            await prismaClient_1.prisma.bookmark.create({
                data: {
                    userId,
                    courseId,
                },
            });
            res.json({ status: 'success', message: 'Bookmark added', data: { bookmarked: true } });
        }
    }
    catch (error) {
        logger_1.default.error('Toggle bookmark error', error instanceof Error ? error : new Error(String(error)), {
            userId: req.user?.userId,
            courseId: req.body?.courseId,
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.toggleBookmark = toggleBookmark;

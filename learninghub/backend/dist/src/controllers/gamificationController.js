"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDsaStats = exports.updateDailyGoal = exports.getAchievements = exports.getLeaderboard = void 0;
const prismaClient_1 = require("../prismaClient");
const logger_1 = __importDefault(require("../utils/logger"));
const QueryOptimizationService_1 = require("../services/QueryOptimizationService");
const getLeaderboard = async (req, res) => {
    try {
        const { timeframe, cursor, limit } = req.query;
        const result = await QueryOptimizationService_1.queryOptimizationService.getLeaderboard({
            timeframe: timeframe,
            cursor: cursor,
            limit: limit ? parseInt(limit) : undefined,
        });
        res.json({ status: 'success', data: result });
    }
    catch (error) {
        logger_1.default.error('[GamificationController] getLeaderboard error', error instanceof Error ? error : new Error(String(error)));
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getLeaderboard = getLeaderboard;
const getAchievements = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const achievements = await prismaClient_1.prisma.userAchievement.findMany({
            where: { userId },
            orderBy: { unlockedAt: 'desc' },
        });
        res.json({ status: 'success', data: achievements });
    }
    catch (error) {
        logger_1.default.error('[GamificationController] getAchievements error', error instanceof Error ? error : new Error(String(error)), {
            userId: req.user?.userId,
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getAchievements = getAchievements;
const updateDailyGoal = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        // Validate minutes input
        const rawMinutes = Number(req.body.minutes);
        if (!Number.isFinite(rawMinutes) || rawMinutes <= 0 || rawMinutes > 1440) {
            res
                .status(400)
                .json({ status: 'error', message: 'Minutes must be a positive number (max 1440)' });
            return;
        }
        const minutes = Math.floor(rawMinutes);
        // Rate limiting: max 10 updates per hour to prevent XP farming
        const recentUpdates = await prismaClient_1.prisma.dailyGoal.count({
            where: {
                userId,
                date: { gte: new Date(Date.now() - 3600000) }, // Last hour
            },
        });
        if (recentUpdates >= 10) {
            res.status(429).json({
                status: 'error',
                message: 'Too many updates. Please wait before logging more study time.',
            });
            return;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Atomic transaction to prevent race conditions on XP award
        const result = await prismaClient_1.prisma.$transaction(async (tx) => {
            const goal = await tx.dailyGoal.upsert({
                where: {
                    userId_date: { userId, date: today },
                },
                update: {
                    completedMinutes: { increment: minutes },
                },
                create: {
                    userId,
                    date: today,
                    completedMinutes: minutes,
                    targetMinutes: 30,
                },
            });
            let xpAwarded = 0;
            // Award XP atomically when goal is first completed
            if (goal.completedMinutes >= goal.targetMinutes && !goal.completed) {
                await tx.dailyGoal.update({
                    where: { id: goal.id },
                    data: { completed: true },
                });
                await tx.user.update({
                    where: { id: userId },
                    data: { xp: { increment: 100 } },
                });
                xpAwarded = 100;
            }
            return { goal, xpAwarded };
        });
        // Emit global realtime event for Leaderboard auto-refresh
        if (result.xpAwarded > 0 && req.io) {
            req.io.emit('ranking_update', { userId, xpEarned: result.xpAwarded });
        }
        res.json({ status: 'success', data: result.goal });
    }
    catch (error) {
        logger_1.default.error('[GamificationController] updateDailyGoal error', error instanceof Error ? error : new Error(String(error)), {
            userId: req.user?.userId,
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.updateDailyGoal = updateDailyGoal;
const getDsaStats = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const totalProblems = await prismaClient_1.prisma.problem.count();
        const solvedProblemsSet = await prismaClient_1.prisma.problemSubmission.findMany({
            where: { userId, status: 'accepted' },
            select: { problemId: true },
            distinct: ['problemId'],
        });
        const solvedProblemsCount = solvedProblemsSet.length;
        const totalSubmissions = await prismaClient_1.prisma.problemSubmission.count({ where: { userId } });
        const acceptanceRate = totalSubmissions > 0 ? (solvedProblemsCount / totalSubmissions) * 100 : 0;
        const [totalEasy, totalMedium, totalHard, easySolved, mediumSolved, hardSolved] = await Promise.all([
            prismaClient_1.prisma.problem.count({ where: { difficulty: 'easy' } }),
            prismaClient_1.prisma.problem.count({ where: { difficulty: 'medium' } }),
            prismaClient_1.prisma.problem.count({ where: { difficulty: 'hard' } }),
            prismaClient_1.prisma.problemSubmission.count({
                where: { userId, status: 'accepted', problem: { difficulty: 'easy' } },
            }),
            prismaClient_1.prisma.problemSubmission.count({
                where: { userId, status: 'accepted', problem: { difficulty: 'medium' } },
            }),
            prismaClient_1.prisma.problemSubmission.count({
                where: { userId, status: 'accepted', problem: { difficulty: 'hard' } },
            }),
        ]);
        const user = await prismaClient_1.prisma.user.findUnique({
            where: { id: userId },
            select: { streak: true, longestStreak: true, xp: true },
        });
        const rank = user ? (await prismaClient_1.prisma.user.count({ where: { xp: { gt: user.xp } } })) + 1 : 0;
        res.json({
            status: 'success',
            data: {
                total_problems: totalProblems,
                solved_problems: solvedProblemsCount,
                total_easy: totalEasy,
                easy_solved: easySolved,
                total_medium: totalMedium,
                medium_solved: mediumSolved,
                total_hard: totalHard,
                hard_solved: hardSolved,
                acceptance_rate: acceptanceRate,
                current_streak: user?.streak ?? 0,
                longest_streak: user?.longestStreak ?? 0,
                rank,
            },
        });
    }
    catch (error) {
        logger_1.default.error('[GamificationController] getDsaStats error', error instanceof Error ? error : new Error(String(error)), {
            userId: req.user?.userId,
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getDsaStats = getDsaStats;

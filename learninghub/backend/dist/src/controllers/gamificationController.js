"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDailyGoal = exports.getAchievements = exports.getLeaderboard = void 0;
const prismaClient_1 = require("../prismaClient");
const pagination_1 = require("../utils/pagination");
const getLeaderboard = async (req, res) => {
    try {
        const { page, limit, skip } = (0, pagination_1.getPaginationParams)(req.query);
        // Get total count of users
        const total = await prismaClient_1.prisma.user.count();
        const users = await prismaClient_1.prisma.user.findMany({
            orderBy: { xp: 'desc' },
            skip,
            take: limit,
            select: {
                id: true,
                email: true,
                username: true,
                xp: true,
                level: true,
                streak: true
            }
        });
        res.json((0, pagination_1.createPaginatedResponse)(users, total, page, limit));
    }
    catch (error) {
        console.error('[GamificationController] getLeaderboard error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getLeaderboard = getLeaderboard;
const getAchievements = async (req, res) => {
    try {
        const userId = req.user.userId;
        const achievements = await prismaClient_1.prisma.userAchievement.findMany({
            where: { userId }
        });
        res.json({ status: 'success', data: achievements });
    }
    catch (error) {
        console.error('[GamificationController] getAchievements error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getAchievements = getAchievements;
const updateDailyGoal = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { minutes } = req.body;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const goal = await prismaClient_1.prisma.dailyGoal.upsert({
            where: {
                userId_date: { userId, date: today }
            },
            update: {
                completedMinutes: { increment: minutes }
            },
            create: {
                userId,
                date: today,
                completedMinutes: minutes,
                targetMinutes: 30
            }
        });
        if (goal.completedMinutes >= goal.targetMinutes && !goal.completed) {
            await prismaClient_1.prisma.dailyGoal.update({
                where: { id: goal.id },
                data: { completed: true }
            });
            // Maybe award XP for completing daily goal
            await prismaClient_1.prisma.user.update({
                where: { id: userId },
                data: { xp: { increment: 100 } }
            });
        }
        res.json({ status: 'success', data: goal });
    }
    catch (error) {
        console.error('[GamificationController] updateDailyGoal error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.updateDailyGoal = updateDailyGoal;

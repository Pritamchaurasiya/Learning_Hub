import { Request, Response } from 'express';
import { prisma } from '../prismaClient';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination';

export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    
    // Get total count of users
    const total = await prisma.user.count();

    const users = await prisma.user.findMany({
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

    res.json(createPaginatedResponse(users, total, page, limit));
  } catch (error) {
    console.error('[GamificationController] getLeaderboard error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

export const getAchievements = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const achievements = await prisma.userAchievement.findMany({
      where: { userId }
    });

    res.json({ status: 'success', data: achievements });
  } catch (error) {
    console.error('[GamificationController] getAchievements error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

export const updateDailyGoal = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const { minutes } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const goal = await prisma.dailyGoal.upsert({
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
      await prisma.dailyGoal.update({
        where: { id: goal.id },
        data: { completed: true }
      });
      // Maybe award XP for completing daily goal
      await prisma.user.update({
        where: { id: userId },
        data: { xp: { increment: 100 } }
      });
    }

    res.json({ status: 'success', data: goal });
  } catch (error) {
    console.error('[GamificationController] updateDailyGoal error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

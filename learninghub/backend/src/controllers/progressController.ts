import { Request, Response } from 'express';
import { prisma } from '../prismaClient';

export const completeCourse = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const { courseId, xp } = req.body;

    if (!courseId || typeof xp !== 'number') {
      res.status(400).json({ status: 'error', message: 'CourseId and XP are required' });
      return;
    }

    // Check if course exists in DB (or frontend can just pass course ID)
    // We will upsert the progress
    const progress = await prisma.userProgress.upsert({
      where: {
        userId_courseId: {
          userId,
          courseId
        }
      },
      update: {
        status: 'completed'
      },
      create: {
        userId,
        courseId,
        status: 'completed'
      }
    });

    // Update User XP and Level
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const newXP = user.xp + xp;
    const newLevel = Math.floor(newXP / 100) + 1;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        xp: newXP,
        level: newLevel,
        lastActive: new Date()
      }
    });

    res.json({
      status: 'success',
      message: 'Course completed successfully',
      data: {
        progress,
        user: {
          xp: updatedUser.xp,
          level: updatedUser.level
        }
      }
    });
  } catch (error) {
    console.error('Complete course error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

export const updateStreak = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ status: 'error', message: 'User not found' });
      return;
    }

    const today = new Date();
    const lastActive = new Date(user.lastActive);
    const diffDays = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

    let newStreak = user.streak;
    if (diffDays === 1) {
      newStreak += 1;
    } else if (diffDays > 1) {
      newStreak = 1;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        streak: newStreak,
        lastActive: today
      }
    });

    res.json({
      status: 'success',
      message: 'Streak updated',
      data: {
        streak: updatedUser.streak,
        lastActive: updatedUser.lastActive
      }
    });
  } catch (error) {
    console.error('Update streak error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

export const toggleBookmark = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const { courseId } = req.body;

    const existing = await prisma.bookmark.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId
        }
      }
    });

    if (existing) {
      await prisma.bookmark.delete({
        where: { id: existing.id }
      });
      res.json({ status: 'success', message: 'Bookmark removed', data: { bookmarked: false } });
    } else {
      await prisma.bookmark.create({
        data: {
          userId,
          courseId
        }
      });
      res.json({ status: 'success', message: 'Bookmark added', data: { bookmarked: true } });
    }
  } catch (error) {
    console.error('Toggle bookmark error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

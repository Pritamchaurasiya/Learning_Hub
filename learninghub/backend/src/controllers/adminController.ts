import { Request, Response } from 'express';
import { prisma } from '../prismaClient';
import logger from '../utils/logger';

/**
 * Get admin dashboard statistics
 * Includes: total users, active users, total courses, revenue metrics
 */
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  const adminId = (req as any).user.userId;
  
  try {
    // Log dashboard access
    logger.audit('ACCESS_DASHBOARD', adminId, { action: 'view_dashboard_stats' });
    
    // Get total users count
    const totalUsers = await prisma.user.count();
    
    // Get active users (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeUsers = await prisma.user.count({
      where: {
        lastActive: {
          gte: twentyFourHoursAgo
        }
      }
    });
    
    // Get new users today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newUsersToday = await prisma.user.count({
      where: {
        createdAt: {
          gte: today
        }
      }
    });
    
    // Get total courses
    const totalCourses = await prisma.course.count();
    
    // Get recent course completions
    const recentCompletions = await prisma.userProgress.count({
      where: {
        status: 'completed',
        updatedAt: {
          gte: twentyFourHoursAgo
        }
      }
    });
    
    // Get total enrollments
    const totalEnrollments = await prisma.userProgress.count();
    
    // Get test submissions in last 24 hours
    const testSubmissions = await prisma.testResult.count({
      where: {
        completedAt: {
          gte: twentyFourHoursAgo
        }
      }
    });
    
    res.json({
      status: 'success',
      data: {
        total_users: totalUsers,
        active_users_24h: activeUsers,
        new_users_today: newUsersToday,
        total_courses: totalCourses,
        recent_completions: recentCompletions,
        total_enrollments: totalEnrollments,
        test_submissions_24h: testSubmissions,
        // Mock revenue data (would come from payment system)
        total_revenue: 12500,
        revenue_today: 450
      }
    });
  } catch (error) {
    logger.error('Admin getDashboardStats error', error instanceof Error ? error : new Error(String(error)), {
      adminId
    });
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

/**
 * Get all users with pagination and search
 */
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  const adminId = (req as any).user.userId;
  
  try {
    const { page = '1', limit = '20', search } = req.query;
    
    // Log user list access
    logger.audit('ACCESS_USER_LIST', adminId, { 
      page: Number(page),
      search: search ? String(search) : undefined
    });
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);
    
    const where: any = {};
    if (search) {
      where.OR = [
        { username: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          avatar: true,
          xp: true,
          streak: true,
          lastActive: true,
          createdAt: true
        }
      }),
      prisma.user.count({ where })
    ]);
    
    res.json({
      status: 'success',
      data: {
        users,
        pagination: {
          page: parseInt(page as string),
          limit: take,
          total,
          totalPages: Math.ceil(total / take)
        }
      }
    });
  } catch (error) {
    logger.error('Admin getUsers error', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

/**
 * Update user role (admin action with audit)
 */
export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { role } = req.body;
  const adminId = (req as any).user.userId;
  
  try {
    if (!['user', 'instructor', 'admin'].includes(role)) {
      res.status(400).json({ status: 'error', message: 'Invalid role' });
      return;
    }
    
    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        username: true,
        role: true
      }
    });
    
    // Log admin action using audit logger
    logger.audit('UPDATE_USER_ROLE', adminId, { targetUserId: id, newRole: role });
    
    res.json({
      status: 'success',
      message: 'User role updated successfully',
      data: user
    });
  } catch (error) {
    logger.error('Admin updateUserRole error', error instanceof Error ? error : new Error(String(error)), {
      adminId,
      targetUserId: id,
      newRole: role
    });
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

/**
 * Delete user (admin action with audit)
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const adminId = (req as any).user.userId;
  
  try {
    // Prevent self-deletion
    if (id === adminId) {
      res.status(400).json({ status: 'error', message: 'Cannot delete your own account' });
      return;
    }
    
    await prisma.user.delete({ where: { id } });
    
    // Log admin action using audit logger
    logger.audit('DELETE_USER', adminId, { targetUserId: id });
    
    res.json({
      status: 'success',
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Admin deleteUser error', error instanceof Error ? error : new Error(String(error)), {
      adminId,
      targetUserId: id
    });
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

/**
 * Get system health/status
 */
export const getSystemStatus = async (req: Request, res: Response): Promise<void> => {
  const adminId = (req as any).user.userId;
  
  try {
    // Log system status access
    logger.audit('ACCESS_SYSTEM_STATUS', adminId, { action: 'view_system_health' });
    
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'success',
      data: {
        database: 'connected',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      }
    });
  } catch (error) {
    logger.error('Admin getSystemStatus error', error instanceof Error ? error : new Error(String(error)), {
      adminId
    });
    res.status(500).json({ 
      status: 'error', 
      message: 'System check failed',
      data: { database: 'disconnected' }
    });
  }
};

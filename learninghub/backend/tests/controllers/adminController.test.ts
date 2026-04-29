import { Request, Response } from 'express';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { getDashboardStats, getUsers, updateUserRole, deleteUser, getSystemStatus } from '../../src/controllers/adminController';
import { prisma } from '../../src/prismaClient';
import { createUser, createAdmin } from '../factories/user.factory';
import { createCourses } from '../factories/course.factory';

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  audit: jest.fn(),
}));

describe('AdminController', () => {
  let mockReq: DeepMockProxy<Request>;
  let mockRes: DeepMockProxy<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn().mockReturnThis();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockReq = mockDeep<Request>();
    mockRes = mockDeep<Response>();
    mockRes.status = statusMock;
    mockRes.json = jsonMock;
    
    jest.clearAllMocks();
  });

  describe('getDashboardStats', () => {
    it('should return dashboard stats successfully', async () => {
      const admin = createAdmin({ id: 'admin-123' });
      mockReq.user = { userId: admin.id };

      (prisma.user.count as jest.Mock).mockResolvedValueOnce(100); // total users
      (prisma.user.count as jest.Mock).mockResolvedValueOnce(50);  // active users
      (prisma.user.count as jest.Mock).mockResolvedValueOnce(5);   // new users today
      (prisma.course.count as jest.Mock).mockResolvedValueOnce(20); // total courses
      (prisma.userProgress.count as jest.Mock).mockResolvedValueOnce(10); // recent completions
      (prisma.userProgress.count as jest.Mock).mockResolvedValueOnce(500); // total enrollments
      (prisma.testResult.count as jest.Mock).mockResolvedValueOnce(25); // test submissions

      await getDashboardStats(mockReq as any, mockRes);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'success',
        data: {
          total_users: 100,
          active_users_24h: 50,
          new_users_today: 5,
          total_courses: 20,
          recent_completions: 10,
          total_enrollments: 500,
          test_submissions_24h: 25,
          total_revenue: 12500,
          revenue_today: 450,
        },
      });
    });

    it('should return 500 on database error', async () => {
      mockReq.user = { userId: 'admin-123' };
      (prisma.user.count as jest.Mock).mockRejectedValue(new Error('Database error'));

      await getDashboardStats(mockReq as any, mockRes);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal server error',
      });
    });
  });

  describe('getUsers', () => {
    it('should return paginated users', async () => {
      const admin = createAdmin({ id: 'admin-123' });
      const users = [
        createUser({ id: 'user-1', email: 'user1@test.com' }),
        createUser({ id: 'user-2', email: 'user2@test.com' }),
      ];

      mockReq.user = { userId: admin.id };
      mockReq.query = { page: '1', limit: '20' };
      (prisma.user.findMany as jest.Mock).mockResolvedValue(users);
      (prisma.user.count as jest.Mock).mockResolvedValue(2);

      await getUsers(mockReq as any, mockRes);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'success',
        data: {
          users: expect.any(Array),
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            totalPages: 1,
          },
        },
      });
    });

    it('should filter users by search query', async () => {
      const admin = createAdmin({ id: 'admin-123' });
      const users = [createUser({ id: 'user-1', email: 'search@test.com' })];

      mockReq.user = { userId: admin.id };
      mockReq.query = { search: 'search' };
      (prisma.user.findMany as jest.Mock).mockResolvedValue(users);
      (prisma.user.count as jest.Mock).mockResolvedValue(1);

      await getUsers(mockReq as any, mockRes);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      );
    });
  });

  describe('updateUserRole', () => {
    it('should update user role successfully', async () => {
      const admin = createAdmin({ id: 'admin-123' });
      const user = createUser({ id: 'user-456', role: 'student' });

      mockReq.user = { userId: admin.id };
      mockReq.params = { id: user.id };
      mockReq.body = { role: 'instructor' };
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...user,
        role: 'instructor',
      });

      await updateUserRole(mockReq as any, mockRes);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'success',
        message: 'User role updated successfully',
        data: expect.objectContaining({ role: 'instructor' }),
      });
    });

    it('should return 400 for invalid role', async () => {
      const admin = createAdmin({ id: 'admin-123' });

      mockReq.user = { userId: admin.id };
      mockReq.params = { id: 'user-456' };
      mockReq.body = { role: 'invalid_role' };

      await updateUserRole(mockReq as any, mockRes);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid role',
      });
    });

    it('should return 500 on database error', async () => {
      const admin = createAdmin({ id: 'admin-123' });

      mockReq.user = { userId: admin.id };
      mockReq.params = { id: 'user-456' };
      mockReq.body = { role: 'instructor' };
      (prisma.user.update as jest.Mock).mockRejectedValue(new Error('Database error'));

      await updateUserRole(mockReq as any, mockRes);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal server error',
      });
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const admin = createAdmin({ id: 'admin-123' });
      const user = createUser({ id: 'user-456' });

      mockReq.user = { userId: admin.id };
      mockReq.params = { id: user.id };
      (prisma.user.delete as jest.Mock).mockResolvedValue(user);

      await deleteUser(mockReq as any, mockRes);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'success',
        message: 'User deleted successfully',
      });
    });

    it('should prevent self-deletion', async () => {
      const admin = createAdmin({ id: 'admin-123' });

      mockReq.user = { userId: admin.id };
      mockReq.params = { id: admin.id }; // Trying to delete self

      await deleteUser(mockReq as any, mockRes);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Cannot delete your own account',
      });
    });

    it('should return 500 on database error', async () => {
      const admin = createAdmin({ id: 'admin-123' });

      mockReq.user = { userId: admin.id };
      mockReq.params = { id: 'user-456' };
      (prisma.user.delete as jest.Mock).mockRejectedValue(new Error('Database error'));

      await deleteUser(mockReq as any, mockRes);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal server error',
      });
    });
  });

  describe('getSystemStatus', () => {
    it('should return system status when database is connected', async () => {
      const admin = createAdmin({ id: 'admin-123' });

      mockReq.user = { userId: admin.id };
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ 1: 1 }]);

      await getSystemStatus(mockReq as any, mockRes);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'success',
        data: {
          database: 'connected',
          timestamp: expect.any(String),
          uptime: expect.any(Number),
        },
      });
    });

    it('should return 500 when database is disconnected', async () => {
      const admin = createAdmin({ id: 'admin-123' });

      mockReq.user = { userId: admin.id };
      (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      await getSystemStatus(mockReq as any, mockRes);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'System check failed',
        data: { database: 'disconnected' },
      });
    });
  });
});

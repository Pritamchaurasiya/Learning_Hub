"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jest_mock_extended_1 = require("jest-mock-extended");
const adminController_1 = require("../../src/controllers/adminController");
const prismaClient_1 = require("../../src/prismaClient");
const user_factory_1 = require("../factories/user.factory");
// Mock logger
jest.mock('../../src/utils/logger', () => ({
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    audit: jest.fn(),
}));
describe('AdminController', () => {
    let mockReq;
    let mockRes;
    let jsonMock;
    let statusMock;
    beforeEach(() => {
        jsonMock = jest.fn().mockReturnThis();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockReq = (0, jest_mock_extended_1.mockDeep)();
        mockRes = (0, jest_mock_extended_1.mockDeep)();
        mockRes.status = statusMock;
        mockRes.json = jsonMock;
        jest.clearAllMocks();
    });
    describe('getDashboardStats', () => {
        it('should return dashboard stats successfully', async () => {
            const admin = (0, user_factory_1.createAdmin)({ id: 'admin-123' });
            mockReq.user = { userId: admin.id };
            prismaClient_1.prisma.user.count.mockResolvedValueOnce(100); // total users
            prismaClient_1.prisma.user.count.mockResolvedValueOnce(50); // active users
            prismaClient_1.prisma.user.count.mockResolvedValueOnce(5); // new users today
            prismaClient_1.prisma.course.count.mockResolvedValueOnce(20); // total courses
            prismaClient_1.prisma.userProgress.count.mockResolvedValueOnce(10); // recent completions
            prismaClient_1.prisma.userProgress.count.mockResolvedValueOnce(500); // total enrollments
            prismaClient_1.prisma.testResult.count.mockResolvedValueOnce(25); // test submissions
            await (0, adminController_1.getDashboardStats)(mockReq, mockRes);
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
            prismaClient_1.prisma.user.count.mockRejectedValue(new Error('Database error'));
            await (0, adminController_1.getDashboardStats)(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'error',
                message: 'Internal server error',
            });
        });
    });
    describe('getUsers', () => {
        it('should return paginated users', async () => {
            const admin = (0, user_factory_1.createAdmin)({ id: 'admin-123' });
            const users = [
                (0, user_factory_1.createUser)({ id: 'user-1', email: 'user1@test.com' }),
                (0, user_factory_1.createUser)({ id: 'user-2', email: 'user2@test.com' }),
            ];
            mockReq.user = { userId: admin.id };
            mockReq.query = { page: '1', limit: '20' };
            prismaClient_1.prisma.user.findMany.mockResolvedValue(users);
            prismaClient_1.prisma.user.count.mockResolvedValue(2);
            await (0, adminController_1.getUsers)(mockReq, mockRes);
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
            const admin = (0, user_factory_1.createAdmin)({ id: 'admin-123' });
            const users = [(0, user_factory_1.createUser)({ id: 'user-1', email: 'search@test.com' })];
            mockReq.user = { userId: admin.id };
            mockReq.query = { search: 'search' };
            prismaClient_1.prisma.user.findMany.mockResolvedValue(users);
            prismaClient_1.prisma.user.count.mockResolvedValue(1);
            await (0, adminController_1.getUsers)(mockReq, mockRes);
            expect(prismaClient_1.prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    OR: expect.any(Array),
                }),
            }));
        });
    });
    describe('updateUserRole', () => {
        it('should update user role successfully', async () => {
            const admin = (0, user_factory_1.createAdmin)({ id: 'admin-123' });
            const user = (0, user_factory_1.createUser)({ id: 'user-456', role: 'student' });
            mockReq.user = { userId: admin.id };
            mockReq.params = { id: user.id };
            mockReq.body = { role: 'instructor' };
            prismaClient_1.prisma.user.update.mockResolvedValue({
                ...user,
                role: 'instructor',
            });
            await (0, adminController_1.updateUserRole)(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'success',
                message: 'User role updated successfully',
                data: expect.objectContaining({ role: 'instructor' }),
            });
        });
        it('should return 400 for invalid role', async () => {
            const admin = (0, user_factory_1.createAdmin)({ id: 'admin-123' });
            mockReq.user = { userId: admin.id };
            mockReq.params = { id: 'user-456' };
            mockReq.body = { role: 'invalid_role' };
            await (0, adminController_1.updateUserRole)(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'error',
                message: 'Invalid role',
            });
        });
        it('should return 500 on database error', async () => {
            const admin = (0, user_factory_1.createAdmin)({ id: 'admin-123' });
            mockReq.user = { userId: admin.id };
            mockReq.params = { id: 'user-456' };
            mockReq.body = { role: 'instructor' };
            prismaClient_1.prisma.user.update.mockRejectedValue(new Error('Database error'));
            await (0, adminController_1.updateUserRole)(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'error',
                message: 'Internal server error',
            });
        });
    });
    describe('deleteUser', () => {
        it('should delete user successfully', async () => {
            const admin = (0, user_factory_1.createAdmin)({ id: 'admin-123' });
            const user = (0, user_factory_1.createUser)({ id: 'user-456' });
            mockReq.user = { userId: admin.id };
            mockReq.params = { id: user.id };
            prismaClient_1.prisma.user.delete.mockResolvedValue(user);
            await (0, adminController_1.deleteUser)(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'success',
                message: 'User deleted successfully',
            });
        });
        it('should prevent self-deletion', async () => {
            const admin = (0, user_factory_1.createAdmin)({ id: 'admin-123' });
            mockReq.user = { userId: admin.id };
            mockReq.params = { id: admin.id }; // Trying to delete self
            await (0, adminController_1.deleteUser)(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'error',
                message: 'Cannot delete your own account',
            });
        });
        it('should return 500 on database error', async () => {
            const admin = (0, user_factory_1.createAdmin)({ id: 'admin-123' });
            mockReq.user = { userId: admin.id };
            mockReq.params = { id: 'user-456' };
            prismaClient_1.prisma.user.delete.mockRejectedValue(new Error('Database error'));
            await (0, adminController_1.deleteUser)(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'error',
                message: 'Internal server error',
            });
        });
    });
    describe('getSystemStatus', () => {
        it('should return system status when database is connected', async () => {
            const admin = (0, user_factory_1.createAdmin)({ id: 'admin-123' });
            mockReq.user = { userId: admin.id };
            prismaClient_1.prisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);
            await (0, adminController_1.getSystemStatus)(mockReq, mockRes);
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
            const admin = (0, user_factory_1.createAdmin)({ id: 'admin-123' });
            mockReq.user = { userId: admin.id };
            prismaClient_1.prisma.$queryRaw.mockRejectedValue(new Error('Connection failed'));
            await (0, adminController_1.getSystemStatus)(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'error',
                message: 'System check failed',
                data: { database: 'disconnected' },
            });
        });
    });
});

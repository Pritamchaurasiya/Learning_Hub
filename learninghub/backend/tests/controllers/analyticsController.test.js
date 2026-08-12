"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jest_mock_extended_1 = require("jest-mock-extended");
const analyticsController_1 = require("../../src/controllers/analyticsController");
const prismaClient_1 = require("../../src/prismaClient");
jest.mock('../../src/utils/logger', () => {
    const mockLogger = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        audit: jest.fn(),
    };
    return {
        ...mockLogger,
        default: mockLogger,
    };
});
jest.mock('../../src/services/CacheService', () => ({
    cacheService: {
        generateKey: jest.fn((...args) => args.join(':')),
        getOrSet: jest.fn(async (key, cb) => cb()),
        topicWeakKey: jest.fn(userId => `weak:${userId}`),
    },
}));
describe('AnalyticsController learner endpoints', () => {
    let mockReq;
    let mockRes;
    let jsonMock;
    let statusMock;
    let nextMock;
    beforeEach(() => {
        jsonMock = jest.fn().mockReturnThis();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        nextMock = jest.fn();
        mockReq = (0, jest_mock_extended_1.mockDeep)();
        mockRes = (0, jest_mock_extended_1.mockDeep)();
        mockRes.status = statusMock;
        mockRes.json = jsonMock;
        mockReq.query = {};
    });
    describe('getLearnerDashboardStats', () => {
        it('returns learner stats from persisted progress and tests', async () => {
            mockReq.user = { userId: 'user-1', email: 'student@test.com', role: 'STUDENT' };
            prismaClient_1.prisma.user.findUnique.mockResolvedValue({
                xp: 140,
                level: 4,
                streak: 3,
                longestStreak: 8,
            });
            prismaClient_1.prisma.testResult.aggregate.mockResolvedValue({
                _avg: { percentage: 84.6 },
            });
            prismaClient_1.prisma.topicPerformance.findMany.mockResolvedValue([
                {
                    topicName: 'Math',
                    subjectName: 'Algebra',
                    totalAttempts: 10,
                    correctAnswers: 8,
                    accuracy: 80,
                },
            ]);
            await (0, analyticsController_1.getLearnerDashboardStats)(mockReq, mockRes, nextMock);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'success',
                data: {
                    total_tests: 0,
                    total_learning_time: 0,
                    average_score: 85,
                    current_streak: 3,
                    longest_streak: 8,
                    xp_points: 140,
                    level: 4,
                    topic_performance: [{ topic: 'Math', subject: 'Algebra', attempts: 10, accuracy: 80 }],
                },
            });
        });
        it('returns 500 when the authenticated user no longer exists', async () => {
            mockReq.user = { userId: 'missing-user', email: 'student@test.com', role: 'STUDENT' };
            prismaClient_1.prisma.user.findUnique.mockResolvedValue(null);
            prismaClient_1.prisma.testResult.aggregate.mockResolvedValue({
                _avg: { percentage: null },
            });
            prismaClient_1.prisma.topicPerformance.findMany.mockResolvedValue([]);
            await (0, analyticsController_1.getLearnerDashboardStats)(mockReq, mockRes, nextMock);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'error',
                message: 'Internal server error',
                code: 'INTERNAL_ERROR',
            });
        });
    });
    describe('getLearningActivity', () => {
        it('aggregates recent learning activity by day', async () => {
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);
            mockReq.user = { userId: 'user-1', email: 'student@test.com', role: 'STUDENT' };
            mockReq.query = { days: '2' };
            prismaClient_1.prisma.dailyGoal.findMany.mockResolvedValue([
                { date: today, completedMinutes: 25 },
            ]);
            prismaClient_1.prisma.testResult.findMany.mockResolvedValue([
                { completedAt: today, passed: true, score: 14 },
                { completedAt: today, passed: false, score: 4 },
            ]);
            await (0, analyticsController_1.getLearningActivity)(mockReq, mockRes, nextMock);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'success',
                data: expect.arrayContaining([
                    expect.objectContaining({
                        date: today.toISOString().split('T')[0],
                        time_spent: 25,
                        xp_earned: 14,
                        tests_completed: 2,
                    }),
                ]),
            });
            expect(jsonMock.mock.calls[0][0].data).toHaveLength(2);
        });
        it('rejects activity requests without an authenticated user', async () => {
            mockReq.user = undefined;
            await (0, analyticsController_1.getLearningActivity)(mockReq, mockRes, nextMock);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'error',
                message: 'Authentication required',
                code: 'NO_TOKEN',
            });
        });
    });
});

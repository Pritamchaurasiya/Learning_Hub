"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Tests Controller — Integration Tests
 * Uses the global prisma mock from tests/setup.ts (jest-mock-extended mockDeep).
 */
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importStar(require("express"));
const prismaClient_1 = require("../../src/prismaClient");
jest.mock('../../src/utils/logger', () => ({
    default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), audit: jest.fn(), debug: jest.fn() },
}));
const testsController_1 = require("../../src/controllers/testsController");
// ─── App factory ──────────────────────────────────────────────────────────────
function makeApp(userId = 'user-123') {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use((req, _res, next) => { req.user = { userId, email: 'test@test.com', role: 'STUDENT' }; next(); });
    const r = (0, express_1.Router)();
    r.get('/tests', testsController_1.listTests);
    r.get('/tests/attempts', testsController_1.getTestAttempts); // static BEFORE /:id
    r.get('/tests/:id', testsController_1.getTestDetails);
    r.post('/tests/:id/start', testsController_1.startTest);
    r.post('/tests/:id/submit', testsController_1.submitTest);
    app.use('/api', r);
    return app;
}
// ─── Shared fixtures ──────────────────────────────────────────────────────────
const Q1 = { id: 'q1', text: 'What is 2+2?', type: 'mcq', difficulty: 0.3, bloomLevel: 'remember', points: 10, order: 1, explanation: '4', options: [{ id: 'o1', text: '3', isCorrect: false, order: 0 }, { id: 'o2', text: '4', isCorrect: true, order: 1 }] };
const TEST = { id: 'test-1', title: 'Sample', description: 'desc', courseId: 'c1', timeLimit: 30, passingScore: 60, totalMarks: 10, negativeMarks: 0, mode: 'mock', difficulty: 'medium', isPublished: true, isAiGenerated: false, createdAt: new Date(), updatedAt: new Date(), _count: { questions: 1, results: 0 }, course: { title: 'Course', id: 'c1' }, questions: [Q1] };
// ─── GET /tests ───────────────────────────────────────────────────────────────
describe('GET /tests', () => {
    it('returns 200 with test list', async () => {
        ;
        prismaClient_1.prisma.test.count.mockResolvedValue(1);
        prismaClient_1.prisma.test.findMany.mockResolvedValue([TEST]);
        prismaClient_1.prisma.testResult.groupBy.mockResolvedValue([]);
        const res = await (0, supertest_1.default)(makeApp()).get('/api/tests');
        expect(res.status).toBe(200);
        expect(res.body.data[0].id).toBe('test-1');
    });
    it('filters by courseId', async () => {
        ;
        prismaClient_1.prisma.test.count.mockResolvedValue(0);
        prismaClient_1.prisma.test.findMany.mockResolvedValue([]);
        prismaClient_1.prisma.testResult.groupBy.mockResolvedValue([]);
        const res = await (0, supertest_1.default)(makeApp()).get('/api/tests?courseId=c1');
        expect(res.status).toBe(200);
        const where = prismaClient_1.prisma.test.findMany.mock.calls[0]?.[0]?.where;
        expect(where).toMatchObject({ courseId: 'c1' });
    });
    it('returns 500 on DB error', async () => {
        ;
        prismaClient_1.prisma.test.count.mockRejectedValue(new Error('DB down'));
        const res = await (0, supertest_1.default)(makeApp()).get('/api/tests');
        expect(res.status).toBe(500);
    });
});
// ─── GET /tests/:id ───────────────────────────────────────────────────────────
describe('GET /tests/:id', () => {
    it('returns 200 with quiz data', async () => {
        ;
        prismaClient_1.prisma.test.findUnique.mockResolvedValue(TEST);
        const res = await (0, supertest_1.default)(makeApp()).get('/api/tests/test-1');
        expect(res.status).toBe(200);
        expect(res.body.data.quiz.id).toBe('test-1');
        expect(res.body.data.quiz.total_questions).toBe(1);
        // getTestDetails does NOT return questions array (use startTest for that)
        expect(res.body.data.quiz).not.toHaveProperty('isCorrect');
    });
    it('returns 404 when not found', async () => {
        ;
        prismaClient_1.prisma.test.findUnique.mockResolvedValue(null);
        const res = await (0, supertest_1.default)(makeApp()).get('/api/tests/nope');
        expect(res.status).toBe(404);
    });
});
// ─── POST /tests/:id/start ────────────────────────────────────────────────────
describe('POST /tests/:id/start', () => {
    it('creates new attempt → 201', async () => {
        ;
        prismaClient_1.prisma.test.findUnique.mockResolvedValue(TEST);
        prismaClient_1.prisma.testResult.findFirst
            .mockResolvedValueOnce(null) // no in-progress
            .mockResolvedValueOnce(null) // no previous (attempt #1)
        ;
        prismaClient_1.prisma.testResult.create.mockResolvedValue({ id: 'a1', attemptNumber: 1 });
        const res = await (0, supertest_1.default)(makeApp()).post('/api/tests/test-1/start');
        expect(res.status).toBe(201);
        expect(res.body.data.attempt_id).toBe('a1');
        expect(res.body.data.questions).toHaveLength(1);
    });
    it('resumes in-progress attempt → 200', async () => {
        ;
        prismaClient_1.prisma.test.findUnique.mockResolvedValue(TEST);
        prismaClient_1.prisma.testResult.findFirst.mockResolvedValue({ id: 'existing', attemptNumber: 1, completedAt: null });
        const res = await (0, supertest_1.default)(makeApp()).post('/api/tests/test-1/start');
        expect(res.status).toBe(200);
        expect(res.body.data.attempt_id).toBe('existing');
        expect(prismaClient_1.prisma.testResult.create).not.toHaveBeenCalled();
    });
    it('returns 404 when test not found', async () => {
        ;
        prismaClient_1.prisma.test.findUnique.mockResolvedValue(null);
        const res = await (0, supertest_1.default)(makeApp()).post('/api/tests/bad/start');
        expect(res.status).toBe(404);
    });
    it('returns 403 when max attempts reached', async () => {
        ;
        prismaClient_1.prisma.test.findUnique.mockResolvedValue(TEST);
        prismaClient_1.prisma.testResult.findFirst
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ attemptNumber: 3 });
        const res = await (0, supertest_1.default)(makeApp()).post('/api/tests/test-1/start');
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('MAX_ATTEMPTS_REACHED');
    });
});
// ─── POST /tests/:id/submit ───────────────────────────────────────────────────
describe('POST /tests/:id/submit', () => {
    // submitTest uses prisma.$transaction — mock it to run the callback with a tx proxy
    function mockTx(overrides = {}) {
        ;
        prismaClient_1.prisma.$transaction.mockImplementation(async (cb) => {
            const tx = {
                testResult: {
                    findUnique: overrides.findUnique ?? jest.fn().mockResolvedValue(null),
                    findFirst: overrides.findFirst ?? jest.fn().mockResolvedValue(null),
                    update: overrides.update ?? jest.fn().mockResolvedValue({}),
                    create: overrides.create ?? jest.fn().mockResolvedValue({}),
                },
                user: { update: overrides.userUpdate ?? jest.fn().mockResolvedValue({}) },
            };
            return cb(tx);
        });
    }
    it('scores correctly, passes, awards XP → 201', async () => {
        ;
        prismaClient_1.prisma.test.findUnique.mockResolvedValue(TEST);
        const mockUpdate = jest.fn().mockResolvedValue({ id: 'a1', score: 10, totalPoints: 10, percentage: 100, passed: true, timeTaken: 120, completedAt: new Date(), attemptNumber: 1 });
        const mockUserUpdate = jest.fn().mockResolvedValue({});
        mockTx({
            findUnique: jest.fn().mockResolvedValue({ id: 'a1', status: 'IN_PROGRESS', score: 0, totalPoints: 0, percentage: 0, passed: false, timeTaken: 0, attemptNumber: 1 }),
            update: mockUpdate,
            userUpdate: mockUserUpdate,
        });
        const res = await (0, supertest_1.default)(makeApp()).post('/api/tests/test-1/submit').send({ answers: { q1: 'o2' }, timeTaken: 120, attempt_id: 'a1' });
        expect(res.status).toBe(201);
        expect(res.body.data.passed).toBe(true);
        expect(res.body.data.correct_count).toBe(1);
        expect(res.body.data.incorrect_count).toBe(0);
        expect(mockUserUpdate).toHaveBeenCalled();
    });
    it('applies negative marking for wrong answer → 201', async () => {
        ;
        prismaClient_1.prisma.test.findUnique.mockResolvedValue({ ...TEST, negativeMarks: 2 });
        mockTx({
            findUnique: jest.fn().mockResolvedValue({ id: 'a1', status: 'IN_PROGRESS', score: 0, totalPoints: 0, percentage: 0, passed: false, timeTaken: 0, attemptNumber: 1 }),
            update: jest.fn().mockResolvedValue({ id: 'a1', score: 0, totalPoints: 10, percentage: 0, passed: false, timeTaken: 60, completedAt: new Date(), attemptNumber: 1 }),
        });
        const res = await (0, supertest_1.default)(makeApp()).post('/api/tests/test-1/submit').send({ answers: { q1: 'o1' }, timeTaken: 60, attempt_id: 'a1' });
        expect(res.status).toBe(201);
        expect(res.body.data.incorrect_count).toBe(1);
        expect(res.body.data.passed).toBe(false);
    });
    it('returns 400 when answers missing', async () => {
        const res = await (0, supertest_1.default)(makeApp()).post('/api/tests/test-1/submit').send({ timeTaken: 60 });
        expect(res.status).toBe(400);
    });
    it('returns 404 when test not found', async () => {
        ;
        prismaClient_1.prisma.test.findUnique.mockResolvedValue(null);
        const res = await (0, supertest_1.default)(makeApp()).post('/api/tests/bad/submit').send({ answers: {}, timeTaken: 0, attempt_id: 'a1' });
        expect(res.status).toBe(404);
    });
});
// ─── GET /tests/attempts ──────────────────────────────────────────────────────
describe('GET /tests/attempts', () => {
    it('returns attempt history → 200', async () => {
        ;
        prismaClient_1.prisma.testResult.findMany.mockResolvedValue([{
                id: 'a1', testId: 'test-1', score: 80, totalPoints: 100, percentage: 80, passed: true,
                timeTaken: 900, attemptNumber: 1, status: 'COMPLETED', startedAt: new Date(), completedAt: new Date(),
                test: { id: 'test-1', title: 'Sample', mode: 'mock', difficulty: 'medium', timeLimit: 30, passingScore: 60, totalMarks: 100 },
            }]);
        const res = await (0, supertest_1.default)(makeApp()).get('/api/tests/attempts');
        expect(res.status).toBe(200);
        expect(res.body.data.results).toHaveLength(1);
        expect(res.body.data.results[0].score).toBe(80);
    });
    it('returns empty list when no attempts', async () => {
        ;
        prismaClient_1.prisma.testResult.findMany.mockResolvedValue([]);
        const res = await (0, supertest_1.default)(makeApp()).get('/api/tests/attempts');
        expect(res.status).toBe(200);
        expect(res.body.data.results).toHaveLength(0);
        expect(res.body.data.totalXp).toBe(0);
    });
});

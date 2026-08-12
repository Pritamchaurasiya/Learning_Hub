"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jest_mock_extended_1 = require("jest-mock-extended");
const problemsController_1 = require("../../src/controllers/problemsController");
const prismaClient_1 = require("../../src/prismaClient");
const CodeSandboxService_1 = require("../../src/services/CodeSandboxService");
jest.mock('../../src/services/CodeSandboxService', () => ({
    CodeSandboxService: {
        execute: jest.fn(),
    },
}));
jest.mock('../../src/services/GrowthEngineService', () => ({
    growthEngineService: {
        awardXP: jest.fn().mockResolvedValue(undefined),
    },
}));
describe('ProblemsController', () => {
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
        mockReq.user = { userId: 'user-1', email: 'student@test.com', role: 'STUDENT' };
        prismaClient_1.prisma.problemSubmission.create.mockImplementation(async ({ data }) => data);
    });
    describe('listProblems', () => {
        it('returns paginated problems list', async () => {
            ;
            prismaClient_1.prisma.problem.count.mockResolvedValue(2);
            prismaClient_1.prisma.problem.findMany.mockResolvedValue([
                { id: 'p1', title: 'Two Sum', difficulty: 'EASY', points: 100, user_status: 'UNATTEMPTED' },
                { id: 'p2', title: 'Reverse Linked List', difficulty: 'MEDIUM', points: 200, user_status: 'ATTEMPTED' },
            ]);
            prismaClient_1.prisma.problemSubmission.findMany.mockResolvedValue([]);
            await (0, problemsController_1.listProblems)(mockReq, mockRes, nextMock);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                status: 'success',
                data: expect.arrayContaining([
                    expect.objectContaining({ id: 'p1', title: 'Two Sum' }),
                    expect.objectContaining({ id: 'p2', title: 'Reverse Linked List' }),
                ]),
                meta: expect.objectContaining({ total: 2 }),
            }));
        });
        it('filters problems by difficulty', async () => {
            mockReq.query = { difficulty: 'EASY' };
            prismaClient_1.prisma.problem.count.mockResolvedValue(1);
            prismaClient_1.prisma.problem.findMany.mockResolvedValue([
                { id: 'p1', title: 'Two Sum', difficulty: 'EASY', points: 100, user_status: 'UNATTEMPTED' },
            ]);
            prismaClient_1.prisma.problemSubmission.findMany.mockResolvedValue([]);
            await (0, problemsController_1.listProblems)(mockReq, mockRes, nextMock);
            expect(prismaClient_1.prisma.problem.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({ difficulty: 'EASY' }),
            }));
        });
    });
    describe('getProblem', () => {
        it('returns problem by slug', async () => {
            mockReq.params = { slug: 'two-sum' };
            prismaClient_1.prisma.problem.findUnique.mockResolvedValue({
                id: 'p1',
                slug: 'two-sum',
                title: 'Two Sum',
                description: 'Find two numbers that add up to target',
                difficulty: 'EASY',
                points: 100,
            });
            await (0, problemsController_1.getProblem)(mockReq, mockRes, nextMock);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                status: 'success',
                data: expect.objectContaining({ id: 'p1', slug: 'two-sum' }),
            }));
        });
        it('returns 404 when problem not found', async () => {
            mockReq.params = { slug: 'non-existent' };
            prismaClient_1.prisma.problem.findUnique.mockResolvedValue(null);
            await (0, problemsController_1.getProblem)(mockReq, mockRes, nextMock);
            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'error',
                message: 'Problem not found',
                code: 'NOT_FOUND',
            });
        });
    });
    describe('submitSolution', () => {
        it('submits code and returns accepted result', async () => {
            mockReq.params = { id: 'p1' };
            mockReq.body = { code: 'console.log("hello")', language: 'javascript' };
            prismaClient_1.prisma.problem.findUnique.mockResolvedValue({
                id: 'p1',
                title: 'Two Sum',
                points: 100,
                testCases: '[{"input":"1 2","output":"3"}]',
            });
            CodeSandboxService_1.CodeSandboxService.execute.mockResolvedValue({
                status: 'accepted',
                executionTime: 120,
                memoryUsed: 256,
                testCasesPassed: 1,
                testCasesTotal: 1,
            });
            await (0, problemsController_1.submitSolution)(mockReq, mockRes, nextMock);
            expect(CodeSandboxService_1.CodeSandboxService.execute).toHaveBeenCalledWith(expect.objectContaining({
                code: 'console.log("hello")',
                language: 'javascript',
                timeLimit: 5,
                memoryLimit: 256,
            }));
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                status: 'success',
                data: expect.objectContaining({ status: 'ACCEPTED', score: 100 }),
            }));
        });
        it('returns partial score for wrong answer', async () => {
            mockReq.params = { id: 'p1' };
            mockReq.body = { code: 'console.log("wrong")', language: 'javascript' };
            prismaClient_1.prisma.problem.findUnique.mockResolvedValue({
                id: 'p1',
                title: 'Two Sum',
                points: 100,
                testCases: '[{"input":"1 2","output":"3"}]',
            });
            CodeSandboxService_1.CodeSandboxService.execute.mockResolvedValue({
                status: 'wrong_answer',
                executionTime: 120,
                memoryUsed: 256,
                testCasesPassed: 0,
                testCasesTotal: 1,
            });
            await (0, problemsController_1.submitSolution)(mockReq, mockRes, nextMock);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                status: 'success',
                data: expect.objectContaining({ status: 'WRONG_ANSWER', score: 0 }),
            }));
        });
        it('returns 404 when problem does not exist', async () => {
            mockReq.params = { id: 'non-existent' };
            mockReq.body = { code: 'console.log("hello")', language: 'javascript' };
            prismaClient_1.prisma.problem.findUnique.mockResolvedValue(null);
            await (0, problemsController_1.submitSolution)(mockReq, mockRes, nextMock);
            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'error',
                message: 'Problem not found',
                code: 'NOT_FOUND',
            });
        });
        it('handles compilation error gracefully', async () => {
            mockReq.params = { id: 'p1' };
            mockReq.body = { code: 'invalid syntax here !!!', language: 'javascript' };
            prismaClient_1.prisma.problem.findUnique.mockResolvedValue({
                id: 'p1',
                title: 'Two Sum',
                points: 100,
                testCases: '[{"input":"1 2","output":"3"}]',
            });
            CodeSandboxService_1.CodeSandboxService.execute.mockResolvedValue({
                status: 'compilation_error',
                executionTime: 0,
                memoryUsed: 0,
                testCasesPassed: 0,
                testCasesTotal: 1,
            });
            await (0, problemsController_1.submitSolution)(mockReq, mockRes, nextMock);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                status: 'success',
                data: expect.objectContaining({ status: 'COMPILATION_ERROR' }),
            }));
        });
    });
    describe('getSubmissions', () => {
        it('returns submissions for a problem', async () => {
            mockReq.params = { id: 'p1' };
            mockReq.user = { userId: 'user-1', email: 'student@test.com', role: 'STUDENT' };
            prismaClient_1.prisma.problemSubmission.findMany.mockResolvedValue([
                { id: 's1', status: 'ACCEPTED', score: 100, language: 'javascript', createdAt: new Date() },
                { id: 's2', status: 'WRONG_ANSWER', score: 0, language: 'javascript', createdAt: new Date() },
            ]);
            await (0, problemsController_1.getSubmissions)(mockReq, mockRes, nextMock);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                status: 'success',
                data: expect.arrayContaining([
                    expect.objectContaining({ id: 's1', status: 'ACCEPTED' }),
                    expect.objectContaining({ id: 's2', status: 'WRONG_ANSWER' }),
                ]),
            }));
        });
    });
});

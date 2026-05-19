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
exports.submitProblemSolution = exports.getProblemDetails = exports.listProblems = void 0;
const prismaClient_1 = require("../prismaClient");
const pagination_1 = require("../utils/pagination");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Transform Prisma Problem to frontend format
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformProblem(problem, userId) {
    // Parse tags from comma-separated string to array of objects
    const tagsArray = problem.tags
        ? problem.tags.split(',').map((t, idx) => ({
            id: String(idx),
            name: t.trim(),
        }))
        : [];
    // Parse starterCode JSON if it exists, otherwise default
    let starterCode = [];
    try {
        if (problem.starterCode) {
            starterCode = JSON.parse(problem.starterCode);
        }
        else {
            starterCode = [
                { language: 'python', code: '# Write your solution here\n' },
                { language: 'javascript', code: '// Write your solution here\n' },
                { language: 'java', code: '// Write your solution here\npublic class Solution {\n}' },
            ];
        }
    }
    catch {
        starterCode = [];
    }
    // Parse testCases JSON for examples
    let examples = [];
    try {
        if (problem.testCases) {
            const parsed = JSON.parse(problem.testCases);
            if (Array.isArray(parsed)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                examples = parsed.map((tc) => ({
                    input: tc.input ?? '',
                    output: tc.output ?? '',
                    explanation: tc.explanation,
                }));
            }
        }
    }
    catch {
        examples = [];
    }
    // Compute submission stats
    const totalSubmissions = problem._count?.submissions ?? 0;
    const acceptedCount = problem._acceptedCount ?? 0;
    // Determine user's status
    let user_status = 'UNATTEMPTED';
    if (userId && problem.userSubmissionStatus) {
        user_status = problem.userSubmissionStatus === 'accepted' ? 'SOLVED' : 'ATTEMPTED';
    }
    return {
        id: problem.id,
        title: problem.title,
        slug: problem.slug ??
            problem.title
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, ''),
        difficulty: (problem.difficulty ?? 'medium').toLowerCase(),
        category: problem.category ?? '',
        description: problem.description ?? '',
        examples,
        constraints: [],
        starter_code: starterCode,
        acceptance_rate: totalSubmissions > 0 ? (acceptedCount / totalSubmissions) * 100 : 0,
        submission_count: totalSubmissions,
        total_submissions: totalSubmissions, // Alias for frontend compatibility
        solved_count: acceptedCount,
        user_status,
        tags: tagsArray,
        points: problem.points ?? 100,
    };
}
const listProblems = async (req, res) => {
    try {
        const { difficulty, category } = req.query;
        const { page, limit, skip } = (0, pagination_1.getPaginationParams)(req.query);
        const userId = req.user?.userId;
        const filters = {};
        if (difficulty)
            filters.difficulty = difficulty;
        if (category)
            filters.category = category;
        const [total, problems] = await Promise.all([
            prismaClient_1.prisma.problem.count({ where: filters }),
            prismaClient_1.prisma.problem.findMany({
                where: filters,
                skip,
                take: limit,
                include: {
                    _count: { select: { submissions: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        const transformed = problems.map(p => transformProblem(p, userId));
        res.json((0, pagination_1.createPaginatedResponse)(transformed, total, page, limit));
    }
    catch (error) {
        logger_1.default.error('[ProblemsController] listProblems error', error instanceof Error ? error : new Error(String(error)));
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.listProblems = listProblems;
const getProblemDetails = async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.user?.userId;
        const problem = await prismaClient_1.prisma.problem.findUnique({
            where: { id },
            include: {
                _count: { select: { submissions: true } },
            },
        });
        if (!problem) {
            res.status(404).json({ status: 'error', message: 'Problem not found' });
            return;
        }
        const transformed = transformProblem(problem, userId);
        res.json({ status: 'success', data: transformed });
    }
    catch (error) {
        logger_1.default.error('[ProblemsController] getProblemDetails error', error instanceof Error ? error : new Error(String(error)), {
            problemId: req.params.id,
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getProblemDetails = getProblemDetails;
const submitProblemSolution = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const problemId = req.params.id;
        const { code, language } = req.body;
        // Validate required fields
        if (!code || typeof code !== 'string' || code.trim().length === 0) {
            res.status(400).json({ status: 'error', message: 'Code submission is required' });
            return;
        }
        // Verify problem exists
        const problem = await prismaClient_1.prisma.problem.findUnique({
            where: { id: problemId },
            select: { id: true, title: true, testCases: true },
        });
        if (!problem) {
            res.status(404).json({ status: 'error', message: 'Problem not found' });
            return;
        }
        // Rate limiting: prevent spam submissions (10-second window)
        const recentSubmissions = await prismaClient_1.prisma.problemSubmission.count({
            where: {
                userId,
                problemId,
                submittedAt: { gte: new Date(Date.now() - 10000) },
            },
        });
        if (recentSubmissions >= 5) {
            res.status(429).json({
                status: 'error',
                message: 'Too many submissions. Please wait before trying again.',
            });
            return;
        }
        // Execute code through sandbox service
        const { CodeSandboxService } = await Promise.resolve().then(() => __importStar(require('../services/CodeSandboxService')));
        const executionResult = await CodeSandboxService.execute({
            code,
            language: language ?? 'javascript',
            testCases: problem.testCases ? JSON.parse(problem.testCases) : [],
            timeLimit: 2000, // 2 seconds
            memoryLimit: 256 * 1024, // 256MB
        });
        // Create submission record
        const submission = await prismaClient_1.prisma.problemSubmission.create({
            data: {
                userId,
                problemId,
                code,
                language: language ?? 'javascript',
                status: executionResult.status,
                executionTime: executionResult.executionTime,
                memoryUsed: executionResult.memoryUsed,
            },
        });
        // Award XP for accepted solutions
        if (executionResult.status === 'accepted') {
            await prismaClient_1.prisma.user.update({
                where: { id: userId },
                data: { xp: { increment: 50 } },
            });
            if (req.io) {
                req.io.emit('ranking_update', { userId, xpEarned: 50 });
            }
        }
        res.json({
            status: 'success',
            data: {
                submissionId: submission.id,
                status: executionResult.status,
                time: `${executionResult.executionTime}ms`,
                memory: `${executionResult.memoryUsed}KB`,
                message: executionResult.message,
                testCasesPassed: executionResult.testCasesPassed,
                testCasesTotal: executionResult.testCasesTotal,
            },
        });
    }
    catch (error) {
        logger_1.default.error('[ProblemsController] submitSolution error', error instanceof Error ? error : new Error(String(error)), {
            userId: req.user?.userId,
            problemId: req.params.id,
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.submitProblemSolution = submitProblemSolution;

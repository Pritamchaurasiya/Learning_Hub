"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitProblemSolution = exports.getProblemDetails = exports.listProblems = void 0;
const prismaClient_1 = require("../prismaClient");
const pagination_1 = require("../utils/pagination");
const listProblems = async (req, res) => {
    try {
        const { difficulty, category } = req.query;
        const { page, limit, skip } = (0, pagination_1.getPaginationParams)(req.query);
        const filters = {};
        if (difficulty)
            filters.difficulty = difficulty;
        if (category)
            filters.category = category;
        // Get total count for pagination
        const total = await prismaClient_1.prisma.problem.count({ where: filters });
        const problems = await prismaClient_1.prisma.problem.findMany({
            where: filters,
            skip,
            take: limit,
            include: {
                _count: {
                    select: { submissions: true }
                }
            }
        });
        res.json((0, pagination_1.createPaginatedResponse)(problems, total, page, limit));
    }
    catch (error) {
        console.error('[ProblemsController] listProblems error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.listProblems = listProblems;
const getProblemDetails = async (req, res) => {
    try {
        const id = req.params.id;
        const problem = await prismaClient_1.prisma.problem.findUnique({
            where: { id }
        });
        if (!problem) {
            res.status(404).json({ status: 'error', message: 'Problem not found' });
            return;
        }
        res.json({ status: 'success', data: problem });
    }
    catch (error) {
        console.error('[ProblemsController] getProblemDetails error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getProblemDetails = getProblemDetails;
const submitProblemSolution = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id: problemId } = req.params;
        const { code, language } = req.body;
        // Mock execution logic
        // In a real SaaS, this would call a Judge0 or a custom sandbox
        const status = Math.random() > 0.3 ? 'accepted' : 'wrong_answer';
        const submission = await prismaClient_1.prisma.problemSubmission.create({
            data: {
                userId,
                problemId,
                code,
                language: language || 'javascript',
                status,
                executionTime: Math.floor(Math.random() * 100),
                memoryUsed: Math.floor(Math.random() * 5000)
            }
        });
        if (status === 'accepted') {
            await prismaClient_1.prisma.user.update({
                where: { id: userId },
                data: {
                    xp: { increment: 50 }
                }
            });
        }
        res.status(201).json({ status: 'success', data: submission });
    }
    catch (error) {
        console.error('[ProblemsController] submitSolution error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.submitProblemSolution = submitProblemSolution;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitTest = exports.startTest = exports.getTestDetails = exports.listTests = void 0;
const prismaClient_1 = require("../prismaClient");
const pagination_1 = require("../utils/pagination");
const listTests = async (req, res) => {
    try {
        const { courseId } = req.query;
        const { page, limit, skip } = (0, pagination_1.getPaginationParams)(req.query);
        const filters = {};
        if (courseId)
            filters.courseId = courseId;
        // Get total count for pagination
        const total = await prismaClient_1.prisma.test.count({ where: filters });
        const tests = await prismaClient_1.prisma.test.findMany({
            where: filters,
            skip,
            take: limit,
            include: {
                _count: {
                    select: { questions: true, results: true }
                }
            }
        });
        res.status(200).json((0, pagination_1.createPaginatedResponse)(tests, total, page, limit));
    }
    catch (error) {
        console.error('[TestsController] listTests error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.listTests = listTests;
const getTestDetails = async (req, res) => {
    try {
        const id = req.params.id;
        const test = await prismaClient_1.prisma.test.findUnique({
            where: { id },
            include: {
                questions: {
                    orderBy: { order: 'asc' }
                }
            }
        });
        if (!test) {
            res.status(404).json({ status: 'error', message: 'Test not found' });
            return;
        }
        res.json({ status: 'success', data: test });
    }
    catch (error) {
        console.error('[TestsController] getTestDetails error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getTestDetails = getTestDetails;
const startTest = async (req, res) => {
    try {
        const testId = req.params.id;
        const userId = req.user.userId;
        const test = await prismaClient_1.prisma.test.findUnique({
            where: { id: testId },
            include: {
                questions: {
                    orderBy: { order: 'asc' }
                }
            }
        });
        if (!test) {
            res.status(404).json({ status: 'error', message: 'Test not found' });
            return;
        }
        // Check if there's already an incomplete attempt for this user and test
        const existingResult = await prismaClient_1.prisma.testResult.findFirst({
            where: {
                userId,
                testId,
                completedAt: null // Only find incomplete attempts (null = not completed)
            }
        });
        if (existingResult) {
            // Return existing attempt
            const questions = test.questions.map(q => ({
                id: q.id,
                text: q.text,
                type: q.type,
                options: JSON.parse(q.options || '[]'),
                correct_answer: q.correctAnswer,
                explanation: q.explanation || '',
                points: q.points
            }));
            res.status(200).json({
                status: 'success',
                data: {
                    attempt_id: existingResult.id,
                    questions
                }
            });
            return;
        }
        // Create a test result entry for this attempt
        const result = await prismaClient_1.prisma.testResult.create({
            data: {
                userId,
                testId,
                score: 0,
                totalPoints: test.questions.reduce((acc, q) => acc + q.points, 0),
                percentage: 0,
                passed: false,
                timeTaken: 0,
                answers: JSON.stringify({})
            }
        });
        // Map questions to expected shape - frontend expects 'question' not 'text'
        const questions = test.questions.map(q => ({
            id: q.id,
            question: q.text, // Frontend expects 'question' field
            type: q.type,
            options: JSON.parse(q.options || '[]'),
            correct_answer: q.correctAnswer,
            explanation: q.explanation || '',
            points: q.points
        }));
        res.status(201).json({
            status: 'success',
            data: {
                attempt_id: result.id,
                questions
            }
        });
    }
    catch (error) {
        console.error('StartTest error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.startTest = startTest;
const submitTest = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id: testId } = req.params;
        const { answers, timeTaken, attempt_id } = req.body; // { questionId: answerValue }
        const test = await prismaClient_1.prisma.test.findUnique({
            where: { id: testId },
            include: { questions: true }
        });
        if (!test) {
            res.status(404).json({ status: 'error', message: 'Test not found' });
            return;
        }
        let score = 0;
        const totalPoints = test.questions.reduce((acc, q) => acc + q.points, 0);
        let correctAnswers = 0;
        test.questions.forEach(q => {
            if (answers[q.id] === q.correctAnswer) {
                score += q.points;
                correctAnswers++;
            }
        });
        const percentage = (score / totalPoints) * 100;
        const passed = percentage >= test.passingScore;
        // Find and update the incomplete attempt, or create if not found
        let result;
        if (attempt_id) {
            result = await prismaClient_1.prisma.testResult.update({
                where: { id: attempt_id },
                data: {
                    score,
                    totalPoints,
                    percentage,
                    passed,
                    timeTaken: timeTaken || 0,
                    answers: JSON.stringify(answers),
                    completedAt: new Date()
                }
            });
        }
        else {
            // Fallback: find incomplete attempt and update it
            const existingAttempt = await prismaClient_1.prisma.testResult.findFirst({
                where: { userId, testId, completedAt: null }
            });
            if (existingAttempt) {
                result = await prismaClient_1.prisma.testResult.update({
                    where: { id: existingAttempt.id },
                    data: {
                        score,
                        totalPoints,
                        percentage,
                        passed,
                        timeTaken: timeTaken || 0,
                        answers: JSON.stringify(answers),
                        completedAt: new Date()
                    }
                });
            }
            else {
                // No incomplete attempt found, create new completed result
                result = await prismaClient_1.prisma.testResult.create({
                    data: {
                        userId,
                        testId,
                        score,
                        totalPoints,
                        percentage,
                        passed,
                        timeTaken: timeTaken || 0,
                        answers: JSON.stringify(answers),
                        completedAt: new Date()
                    }
                });
            }
        }
        // Award XP if passed using transaction for consistency
        if (passed) {
            await prismaClient_1.prisma.$transaction([
                prismaClient_1.prisma.user.update({
                    where: { id: userId },
                    data: { xp: { increment: score * 10 } }
                })
            ]);
        }
        // Return response in frontend-expected format
        res.status(201).json({
            status: 'success',
            data: {
                attempt_id: result.id,
                score: result.score,
                passed: result.passed,
                total_questions: test.questions.length, // Frontend expects 'total_questions'
                correct_answers: correctAnswers, // Frontend expects 'correct_answers'
                time_taken: result.timeTaken, // Frontend expects 'time_taken' (snake_case)
                percentage: result.percentage
            }
        });
    }
    catch (error) {
        console.error('[TestsController] submitTest error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.submitTest = submitTest;

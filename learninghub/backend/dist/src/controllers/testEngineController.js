"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTimeRemaining = exports.getAttemptHistory = exports.getTestAnalytics = exports.getTestQuestions = exports.practiceAnswer = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
const TestEngineService_1 = require("../services/TestEngineService");
/**
 * POST /api/v1/tests/:id/practice/answer
 * Submit a single answer in practice mode with instant feedback.
 */
const practiceAnswer = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const testId = req.params.id;
        const { question_id, selected_option_id } = req.body;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        if (!question_id || !selected_option_id) {
            res
                .status(400)
                .json({ status: 'error', message: 'question_id and selected_option_id are required' });
            return;
        }
        const result = await TestEngineService_1.testEngineService.submitPracticeAnswer({
            userId,
            testId,
            questionId: question_id,
            selectedOptionId: selected_option_id,
        });
        res.json({ status: 'success', data: result });
    }
    catch (error) {
        logger_1.default.error('[TestsController] practiceAnswer error', error instanceof Error ? error : new Error(String(error)), { testId: req.params.id, userId: req.user?.userId });
        res.status(500).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'Internal server error',
        });
    }
};
exports.practiceAnswer = practiceAnswer;
/**
 * GET /api/v1/tests/:id/questions
 * Get test questions (shuffled for practice mode).
 */
const getTestQuestions = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const testId = req.params.id;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const questions = await TestEngineService_1.testEngineService.getTestQuestions(testId, userId);
        res.json({ status: 'success', data: { questions, count: questions.length } });
    }
    catch (error) {
        logger_1.default.error('[TestsController] getTestQuestions error', error instanceof Error ? error : new Error(String(error)), { testId: req.params.id });
        res.status(500).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'Internal server error',
        });
    }
};
exports.getTestQuestions = getTestQuestions;
/**
 * GET /api/v1/tests/analytics
 * Get comprehensive test analytics for the user.
 */
const getTestAnalytics = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const analytics = await TestEngineService_1.testEngineService.getTestAnalytics(userId);
        res.json({ status: 'success', data: analytics });
    }
    catch (error) {
        logger_1.default.error('[TestsController] getTestAnalytics error', error instanceof Error ? error : new Error(String(error)), { userId: req.user?.userId });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getTestAnalytics = getTestAnalytics;
/**
 * GET /api/v1/tests/attempts/history
 * Get paginated attempt history with filtering.
 */
const getAttemptHistory = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const { test_id, mode, status, page, limit } = req.query;
        const history = await TestEngineService_1.testEngineService.getAttemptHistory(userId, {
            testId: test_id,
            mode: mode,
            status: status,
            page: page ? parseInt(page) : undefined,
            limit: limit ? parseInt(limit) : undefined,
        });
        res.json({ status: 'success', data: history });
    }
    catch (error) {
        logger_1.default.error('[TestsController] getAttemptHistory error', error instanceof Error ? error : new Error(String(error)), { userId: req.user?.userId });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getAttemptHistory = getAttemptHistory;
/**
 * GET /api/v1/tests/:id/time
 * Get remaining time for an active test.
 */
const getTimeRemaining = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const testId = req.params.id;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const time = await TestEngineService_1.testEngineService.validateTimeRemaining(userId, testId);
        res.json({ status: 'success', data: time });
    }
    catch (error) {
        logger_1.default.error('[TestsController] getTimeRemaining error', error instanceof Error ? error : new Error(String(error)), { testId: req.params.id });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getTimeRemaining = getTimeRemaining;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeBookmark = exports.getBookmarkedQuestions = exports.bookmarkQuestion = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
const TestEngineService_1 = require("../services/TestEngineService");
/**
 * POST /api/v1/questions/bookmarks
 * Bookmark a question for later review.
 */
const bookmarkQuestion = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const { question_id, notes } = req.body;
        if (!question_id) {
            res.status(400).json({ status: 'error', message: 'question_id is required' });
            return;
        }
        const bookmark = await TestEngineService_1.testEngineService.bookmarkQuestion(userId, question_id, notes);
        res.status(201).json({ status: 'success', data: bookmark });
    }
    catch (error) {
        if (error instanceof Error && error.message === 'Question already bookmarked') {
            res.status(409).json({ status: 'error', message: error.message });
            return;
        }
        logger_1.default.error('[QuestionBookmarks] bookmarkQuestion error', error instanceof Error ? error : new Error(String(error)), { userId: req.user?.userId });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.bookmarkQuestion = bookmarkQuestion;
/**
 * GET /api/v1/questions/bookmarks
 * Get user's bookmarked questions.
 */
const getBookmarkedQuestions = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const bookmarks = await TestEngineService_1.testEngineService.getBookmarkedQuestions(userId);
        res.json({ status: 'success', data: { bookmarks, count: bookmarks.length } });
    }
    catch (error) {
        logger_1.default.error('[QuestionBookmarks] getBookmarkedQuestions error', error instanceof Error ? error : new Error(String(error)), { userId: req.user?.userId });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getBookmarkedQuestions = getBookmarkedQuestions;
/**
 * DELETE /api/v1/questions/bookmarks/:questionId
 * Remove a question bookmark.
 */
const removeBookmark = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const questionId = req.params.questionId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        await TestEngineService_1.testEngineService.removeBookmark(userId, questionId);
        res.json({ status: 'success', message: 'Bookmark removed' });
    }
    catch (error) {
        logger_1.default.error('[QuestionBookmarks] removeBookmark error', error instanceof Error ? error : new Error(String(error)), { userId: req.user?.userId, questionId: req.params.questionId });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.removeBookmark = removeBookmark;

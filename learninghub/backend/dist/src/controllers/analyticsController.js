"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWeakAreas = exports.getPerformanceTrend = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
const QueryOptimizationService_1 = require("../services/QueryOptimizationService");
const AITestService_1 = require("../services/AITestService");
/**
 * GET /api/v1/analytics/performance-trend
 * Get user's performance trend over time for chart visualization.
 */
const getPerformanceTrend = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const days = req.query.days ? parseInt(req.query.days) : 30;
        const trend = await QueryOptimizationService_1.queryOptimizationService.getPerformanceTrend(userId, days);
        res.json({ status: 'success', data: trend });
    }
    catch (error) {
        logger_1.default.error('[AnalyticsController] getPerformanceTrend error', error instanceof Error ? error : new Error(String(error)), { userId: req.user?.userId });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getPerformanceTrend = getPerformanceTrend;
/**
 * GET /api/v1/analytics/weak-areas
 * Get user's weak areas for targeted practice.
 */
const getWeakAreas = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const weakTopics = await AITestService_1.aiTestService.getWeakTopics(userId);
        res.json({ status: 'success', data: { weak_areas: weakTopics } });
    }
    catch (error) {
        logger_1.default.error('[AnalyticsController] getWeakAreas error', error instanceof Error ? error : new Error(String(error)), { userId: req.user?.userId });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getWeakAreas = getWeakAreas;

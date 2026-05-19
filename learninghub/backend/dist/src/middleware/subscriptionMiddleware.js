"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkUsageLimit = exports.requirePremium = void 0;
const SubscriptionService_1 = require("../services/SubscriptionService");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Middleware to require premium subscription.
 */
const requirePremium = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const hasAccess = await SubscriptionService_1.subscriptionService.hasPremiumAccess(userId);
        if (!hasAccess) {
            res.status(403).json({
                status: 'error',
                message: 'Premium subscription required',
                code: 'PREMIUM_REQUIRED',
            });
            return;
        }
        next();
    }
    catch (error) {
        logger_1.default.error('[requirePremium] error', error instanceof Error ? error : new Error(String(error)));
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.requirePremium = requirePremium;
/**
 * Middleware to check usage limits.
 * @param limitType - The type of usage limit to check
 */
const checkUsageLimit = (limitType) => {
    return async (req, res, next) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ status: 'error', message: 'Authentication required' });
                return;
            }
            const result = await SubscriptionService_1.subscriptionService.checkUsageLimit(userId, limitType);
            if (!result.allowed) {
                res.status(429).json({
                    status: 'error',
                    message: 'Usage limit exceeded. Upgrade your plan for more.',
                    code: 'USAGE_LIMIT_EXCEEDED',
                    data: {
                        current: result.current,
                        limit: result.limit,
                    },
                });
                return;
            }
            // Attach limit info to request for downstream use
            // req.usageLimit = result
            next();
        }
        catch (error) {
            logger_1.default.error('[checkUsageLimit] error', error instanceof Error ? error : new Error(String(error)));
            res.status(500).json({ status: 'error', message: 'Internal server error' });
        }
    };
};
exports.checkUsageLimit = checkUsageLimit;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCoupon = exports.cancelSubscription = exports.createSubscription = exports.getMySubscription = exports.getTiers = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
const SubscriptionService_1 = require("../services/SubscriptionService");
/**
 * GET /api/v1/subscriptions/tiers
 * Get all available subscription tiers.
 */
const getTiers = async (_req, res) => {
    try {
        const tiers = await SubscriptionService_1.subscriptionService.getTiers();
        res.json({
            status: 'success',
            data: {
                tiers: tiers.map(t => ({
                    id: t.id,
                    name: t.name,
                    display_name: t.displayName,
                    description: t.description,
                    price: Number(t.price),
                    currency: t.currency,
                    interval: t.interval,
                    trial_days: t.trialDays,
                    features: t.features,
                    limits: t.limits,
                })),
            },
        });
    }
    catch (error) {
        logger_1.default.error('[Subscriptions] getTiers error', error instanceof Error ? error : new Error(String(error)));
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getTiers = getTiers;
/**
 * GET /api/v1/subscriptions/me
 * Get current user's subscription.
 */
const getMySubscription = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const subscription = await SubscriptionService_1.subscriptionService.getUserSubscription(userId);
        if (!subscription) {
            res.json({
                status: 'success',
                data: {
                    active: false,
                    tier: 'free',
                    limits: {
                        tests_per_day: 3,
                        ai_generations_per_day: 2,
                        questions_per_day: 50,
                    },
                },
            });
            return;
        }
        res.json({
            status: 'success',
            data: {
                active: subscription.status === 'ACTIVE' || subscription.status === 'TRIAL',
                tier: subscription.tier.name,
                display_name: subscription.tier.displayName,
                status: subscription.status,
                price: Number(subscription.tier.price),
                interval: subscription.tier.interval,
                trial_ends_at: subscription.trialEndsAt,
                current_period_end: subscription.currentPeriodEnd,
                limits: subscription.tier.limits,
                usage: subscription.usageLimits[0] ?? null,
            },
        });
    }
    catch (error) {
        logger_1.default.error('[Subscriptions] getMySubscription error', error instanceof Error ? error : new Error(String(error)));
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getMySubscription = getMySubscription;
/**
 * POST /api/v1/subscriptions/create
 * Create a new subscription.
 */
const createSubscription = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const { tier_id, coupon_code } = req.body;
        if (!tier_id) {
            res.status(400).json({ status: 'error', message: 'tier_id is required' });
            return;
        }
        // Validate coupon if provided
        if (coupon_code) {
            const couponResult = await SubscriptionService_1.subscriptionService.validateCoupon(coupon_code, tier_id);
            if (!couponResult.valid) {
                res.status(400).json({ status: 'error', message: couponResult.message });
                return;
            }
        }
        const tier = await SubscriptionService_1.subscriptionService.getTiers();
        const selectedTier = tier.find(t => t.id === tier_id);
        if (!selectedTier) {
            res.status(404).json({ status: 'error', message: 'Tier not found' });
            return;
        }
        // For now, create a free trial subscription
        // In production, this would redirect to Stripe checkout
        const subscription = await SubscriptionService_1.subscriptionService.createSubscription({
            userId,
            tierId: tier_id,
            trialDays: selectedTier.trialDays,
        });
        if (coupon_code) {
            await SubscriptionService_1.subscriptionService.applyCoupon(coupon_code);
        }
        res.status(201).json({
            status: 'success',
            message: 'Subscription created',
            data: {
                id: subscription.id,
                tier: subscription.tier.name,
                status: subscription.status,
                trial_ends_at: subscription.trialEndsAt,
            },
        });
    }
    catch (error) {
        logger_1.default.error('[Subscriptions] createSubscription error', error instanceof Error ? error : new Error(String(error)));
        res.status(500).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'Internal server error',
        });
    }
};
exports.createSubscription = createSubscription;
/**
 * POST /api/v1/subscriptions/cancel
 * Cancel current subscription.
 */
const cancelSubscription = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        await SubscriptionService_1.subscriptionService.cancelSubscription(userId);
        res.json({ status: 'success', message: 'Subscription cancelled' });
    }
    catch (error) {
        logger_1.default.error('[Subscriptions] cancelSubscription error', error instanceof Error ? error : new Error(String(error)));
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.cancelSubscription = cancelSubscription;
/**
 * POST /api/v1/subscriptions/coupon/validate
 * Validate a coupon code.
 */
const validateCoupon = async (req, res) => {
    try {
        const { code, tier_id } = req.body;
        if (!code) {
            res.status(400).json({ status: 'error', message: 'Coupon code is required' });
            return;
        }
        const result = await SubscriptionService_1.subscriptionService.validateCoupon(code, tier_id);
        res.json({ status: 'success', data: result });
    }
    catch (error) {
        logger_1.default.error('[Subscriptions] validateCoupon error', error instanceof Error ? error : new Error(String(error)));
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.validateCoupon = validateCoupon;

"use strict";
/**
 * Subscription Service
 *
 * Manages user subscriptions, usage limits, and premium access.
 * Integrates with Stripe for payment processing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionService = exports.SubscriptionService = void 0;
const prismaClient_1 = require("../prismaClient");
class SubscriptionService {
    /**
     * Get all active subscription tiers.
     */
    async getTiers() {
        return prismaClient_1.prisma.subscriptionTier.findMany({
            where: { isActive: true },
            orderBy: { price: 'asc' },
        });
    }
    /**
     * Get user's current subscription.
     */
    async getUserSubscription(userId) {
        return prismaClient_1.prisma.subscription.findUnique({
            where: { userId },
            include: {
                tier: true,
                usageLimits: {
                    orderBy: { period: 'desc' },
                    take: 1,
                },
            },
        });
    }
    /**
     * Create a new subscription (with optional trial).
     */
    async createSubscription(input) {
        const tier = await prismaClient_1.prisma.subscriptionTier.findUnique({
            where: { id: input.tierId, isActive: true },
        });
        if (!tier) {
            throw new Error('Invalid subscription tier');
        }
        const now = new Date();
        const trialEndsAt = input.trialDays && input.trialDays > 0
            ? new Date(now.getTime() + input.trialDays * 24 * 60 * 60 * 1000)
            : null;
        const currentPeriodEnd = new Date(now);
        if (tier.interval === 'YEARLY') {
            currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
        }
        else if (tier.interval === 'MONTHLY') {
            currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
        }
        return prismaClient_1.prisma.$transaction(async (tx) => {
            // Create subscription
            const subscription = await tx.subscription.create({
                data: {
                    userId: input.userId,
                    tierId: input.tierId,
                    status: trialEndsAt ? 'TRIAL' : 'ACTIVE',
                    stripeSubscriptionId: input.stripeSubscriptionId,
                    stripeCustomerId: input.stripeCustomerId,
                    trialEndsAt,
                    currentPeriodStart: now,
                    currentPeriodEnd,
                },
                include: { tier: true },
            });
            // Initialize usage limits for current period
            await tx.usageLimit.create({
                data: {
                    subscriptionId: subscription.id,
                    period: now,
                    testsTaken: 0,
                    aiGenerations: 0,
                    questionsAnswered: 0,
                },
            });
            return subscription;
        });
    }
    /**
     * Cancel a subscription.
     */
    async cancelSubscription(userId) {
        await prismaClient_1.prisma.subscription.update({
            where: { userId },
            data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
            },
        });
    }
    /**
     * Check if user has premium access.
     */
    async hasPremiumAccess(userId) {
        const subscription = await prismaClient_1.prisma.subscription.findUnique({
            where: { userId },
            include: { tier: true },
        });
        if (!subscription)
            return false;
        // Check if subscription is active or in trial
        if (subscription.status === 'ACTIVE' || subscription.status === 'TRIAL') {
            // Check if trial has expired
            if (subscription.status === 'TRIAL' &&
                subscription.trialEndsAt &&
                subscription.trialEndsAt < new Date()) {
                return false;
            }
            // Check if period has expired
            if (subscription.currentPeriodEnd && subscription.currentPeriodEnd < new Date()) {
                return false;
            }
            return true;
        }
        return false;
    }
    /**
     * Check and enforce usage limits.
     */
    async checkUsageLimit(userId, limitType) {
        const subscription = await prismaClient_1.prisma.subscription.findUnique({
            where: { userId },
            include: {
                tier: true,
                usageLimits: {
                    orderBy: { period: 'desc' },
                    take: 1,
                },
            },
        });
        // Free tier — no subscription
        if (!subscription) {
            const freeLimits = {
                testsTaken: 3,
                aiGenerations: 2,
                questionsAnswered: 50,
            };
            // Get current usage from today's test results
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let current = 0;
            if (limitType === 'testsTaken') {
                current = await prismaClient_1.prisma.testResult.count({
                    where: { userId, status: 'COMPLETED', completedAt: { gte: today } },
                });
            }
            else if (limitType === 'aiGenerations') {
                current = await prismaClient_1.prisma.test.count({
                    where: { isAiGenerated: true, createdBy: userId, createdAt: { gte: today } },
                });
            }
            return {
                allowed: current < freeLimits[limitType],
                current,
                limit: freeLimits[limitType],
            };
        }
        // Check subscription status
        if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIAL') {
            return { allowed: false, current: 0, limit: 0 };
        }
        // Get limits from tier
        const limits = subscription.tier.limits ?? {};
        const limit = limits[limitType] ?? Infinity;
        // Get current usage
        const usage = subscription.usageLimits[0];
        const current = usage ? usage[limitType] : 0;
        return {
            allowed: current < limit,
            current,
            limit,
        };
    }
    /**
     * Increment usage counter.
     */
    async incrementUsage(userId, limitType) {
        const subscription = await prismaClient_1.prisma.subscription.findUnique({
            where: { userId },
            include: {
                usageLimits: {
                    orderBy: { period: 'desc' },
                    take: 1,
                },
            },
        });
        if (!subscription)
            return; // Free tier — no tracking needed
        const usage = subscription.usageLimits[0];
        if (!usage)
            return;
        await prismaClient_1.prisma.usageLimit.update({
            where: { id: usage.id },
            data: {
                [limitType]: { increment: 1 },
                updatedAt: new Date(),
            },
        });
    }
    /**
     * Validate a coupon code.
     */
    async validateCoupon(code, tierId) {
        const coupon = await prismaClient_1.prisma.coupon.findUnique({
            where: { code, isActive: true },
        });
        if (!coupon) {
            return { valid: false, message: 'Coupon not found' };
        }
        if (coupon.validFrom > new Date()) {
            return { valid: false, message: 'Coupon is not yet active' };
        }
        if (coupon.validUntil < new Date()) {
            return { valid: false, message: 'Coupon has expired' };
        }
        if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
            return { valid: false, message: 'Coupon has reached maximum uses' };
        }
        if (tierId &&
            coupon.applicableTierIds.length > 0 &&
            !coupon.applicableTierIds.includes(tierId)) {
            return { valid: false, message: 'Coupon not applicable for this tier' };
        }
        return {
            valid: true,
            discount: {
                type: coupon.discountType,
                value: Number(coupon.discountValue),
            },
        };
    }
    /**
     * Apply a coupon (increment usage count).
     */
    async applyCoupon(code) {
        await prismaClient_1.prisma.coupon.update({
            where: { code },
            data: { usedCount: { increment: 1 } },
        });
    }
}
exports.SubscriptionService = SubscriptionService;
exports.subscriptionService = new SubscriptionService();

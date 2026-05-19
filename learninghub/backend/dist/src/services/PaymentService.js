"use strict";
/**
 * Payment Service - Stripe Integration
 * Handles checkout sessions, webhooks, and enrollment.
 * NOTE: Stripe and the Payment model are optional — the service degrades gracefully
 * when STRIPE_SECRET_KEY is not configured.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const prismaClient_1 = require("../prismaClient");
const logger_1 = __importDefault(require("../utils/logger"));
// Lazy-load Stripe to avoid crashing when the package isn't installed
async function getStripe() {
    try {
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key)
            return null;
        const Stripe = require('stripe');
        return new Stripe(key, { apiVersion: '2024-12-18.acacia' });
    }
    catch {
        return null;
    }
}
class PaymentService {
    static async createCheckoutSession(params) {
        const stripe = await getStripe();
        if (!stripe) {
            throw new Error('Payment gateway not configured. Please set STRIPE_SECRET_KEY.');
        }
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: params.currency,
                        product_data: {
                            name: params.courseTitle,
                            metadata: {
                                courseId: params.courseId,
                                userId: params.userId,
                            },
                        },
                        unit_amount: Math.round(params.amount * 100),
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: params.successUrl,
            cancel_url: params.cancelUrl,
            metadata: {
                userId: params.userId,
                courseId: params.courseId,
            },
        });
        // Log payment intent (Payment model not yet in schema — use ActivityLog as fallback)
        try {
            await prismaClient_1.prisma.activityLog.create({
                data: {
                    userId: params.userId,
                    activityType: 'COURSE_ENROLL',
                    entityType: 'Payment',
                    entityId: session.id,
                    metadata: {
                        courseId: params.courseId,
                        amount: params.amount,
                        currency: params.currency,
                        gateway: 'stripe',
                        status: 'pending',
                    },
                },
            });
        }
        catch (e) {
            logger_1.default.warn(`[PaymentService] Could not log payment activity: ${String(e)}`);
        }
        return { id: session.id, url: session.url };
    }
    static async handleWebhook(body, sig) {
        const stripe = await getStripe();
        if (!stripe)
            throw new Error('Stripe not configured');
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required for webhook verification');
        }
        return stripe.webhooks.constructEvent(body, sig, webhookSecret);
    }
    static async processSuccessfulPayment(session) {
        const userId = session.metadata?.userId;
        const courseId = session.metadata?.courseId;
        if (!userId || !courseId) {
            logger_1.default.error(`[PaymentService] Webhook missing metadata for session ${session.id}`);
            return;
        }
        // Enroll user in course (upsert to avoid duplicate)
        await prismaClient_1.prisma.userProgress.upsert({
            where: { idx_unique_user_course: { userId, courseId } },
            create: { userId, courseId, progress: 0, status: 'IN_PROGRESS' },
            update: { status: 'IN_PROGRESS' },
        });
        logger_1.default.info(`[PaymentService] User ${userId} enrolled in course ${courseId} via payment ${session.id}`);
    }
}
exports.PaymentService = PaymentService;

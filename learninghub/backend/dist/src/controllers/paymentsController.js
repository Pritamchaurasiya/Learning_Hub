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
exports.applyCoupon = exports.handleWebhook = exports.createOrder = void 0;
const prismaClient_1 = require("../prismaClient");
const logger_1 = __importDefault(require("../utils/logger"));
const createOrder = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const { course_id, gateway: _gateway } = req.body;
        if (!course_id) {
            res.status(400).json({ status: 'error', message: 'Course ID is required' });
            return;
        }
        // Verify course exists and is published
        const course = await prismaClient_1.prisma.course.findUnique({
            where: { id: course_id },
            select: { id: true, title: true, price: true, isPublished: true },
        });
        if (!course) {
            res.status(404).json({ status: 'error', message: 'Course not found' });
            return;
        }
        if (!course.isPublished) {
            res.status(400).json({ status: 'error', message: 'Course is not available for purchase' });
            return;
        }
        if (!course.price || Number(course.price) <= 0) {
            res.status(400).json({ status: 'error', message: 'This course is free' });
            return;
        }
        // Check if already enrolled
        const existingEnrollment = await prismaClient_1.prisma.userProgress.findUnique({
            where: { idx_unique_user_course: { userId, courseId: course_id } },
        });
        if (existingEnrollment) {
            res.status(400).json({ status: 'error', message: 'Already enrolled in this course' });
            return;
        }
        // Create payment session through Stripe service
        const { PaymentService } = await Promise.resolve().then(() => __importStar(require('../services/PaymentService')));
        const session = await PaymentService.createCheckoutSession({
            userId,
            courseId: course_id,
            amount: Number(course.price),
            currency: 'usd',
            courseTitle: course.title,
            successUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/cancel`,
        });
        res.status(201).json({
            status: 'success',
            data: {
                payment_url: session.url,
                session_id: session.id,
                order_id: session.id,
                status: 'pending',
            },
        });
    }
    catch (error) {
        logger_1.default.error('[PaymentsController] createOrder error', error instanceof Error ? error : new Error(String(error)));
        res.status(500).json({ status: 'error', message: 'Payment initiation failed' });
    }
};
exports.createOrder = createOrder;
const handleWebhook = async (req, res) => {
    try {
        const sig = req.headers['stripe-signature'];
        const { PaymentService } = await Promise.resolve().then(() => __importStar(require('../services/PaymentService')));
        const event = await PaymentService.handleWebhook(req.body, sig);
        // PaymentService.handleWebhook only validates and returns the event.
        // Actual payment processing (enrollment) is handled inside the webhook handler
        // in PaymentService to avoid double-processing.
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            await PaymentService.processSuccessfulPayment(session);
        }
        res.json({ received: true });
    }
    catch (error) {
        logger_1.default.error('[PaymentsController] webhook error', error instanceof Error ? error : new Error(String(error)));
        res.status(400).json({ status: 'error', message: 'Webhook handling failed' });
    }
};
exports.handleWebhook = handleWebhook;
const applyCoupon = async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            res.status(400).json({ status: 'error', message: 'Coupon code is required' });
            return;
        }
        // Coupon model not yet in schema — return not-found for now
        // TODO: Add Coupon model to Prisma schema and implement real coupon logic
        res.status(404).json({
            status: 'error',
            message: 'Coupon not found or expired',
        });
    }
    catch (error) {
        logger_1.default.error('[PaymentsController] applyCoupon error', error instanceof Error ? error : new Error(String(error)));
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.applyCoupon = applyCoupon;

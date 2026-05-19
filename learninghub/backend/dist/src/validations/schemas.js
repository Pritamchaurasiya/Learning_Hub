"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRegisterSchema = exports.adminLoginSchema = exports.bookmarkSchema = exports.completeCourseSchema = exports.updateDailyGoalSchema = exports.submitProblemSchema = exports.createLiveSessionSchema = exports.submitTestSchema = exports.updateProgressSchema = exports.enrollCourseSchema = exports.refreshSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
const idSchema = zod_1.z
    .string()
    .min(1, 'ID is required')
    .regex(/^[a-zA-Z0-9-]+$/, 'Invalid ID format');
exports.registerSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email address'),
        password: zod_1.z
            .string()
            .min(8, 'Password must be at least 8 characters long')
            .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
            .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
            .regex(/[0-9]/, 'Password must contain at least one number')
            .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
        username: zod_1.z.string().min(2, 'Username must be at least 2 characters').optional(),
    }),
});
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email address'),
        password: zod_1.z.string().min(1, 'Password is required'),
    }),
});
exports.refreshSchema = zod_1.z
    .object({
    body: zod_1.z.object({
        refresh_token: zod_1.z.string().min(1, 'Refresh token is required'),
    }),
})
    .or(zod_1.z.object({
    body: zod_1.z.object({
        refresh: zod_1.z.string().min(1, 'Refresh token is required'),
    }),
})); // Support both refresh and refresh_token for backward compatibility
exports.enrollCourseSchema = zod_1.z.object({
    body: zod_1.z.object({
        courseId: idSchema,
    }),
});
exports.updateProgressSchema = zod_1.z.object({
    body: zod_1.z.object({
        courseId: idSchema,
        progress: zod_1.z.number().min(0).max(100),
    }),
});
exports.submitTestSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: idSchema,
    }),
    body: zod_1.z.object({
        answers: zod_1.z.record(zod_1.z.string(), zod_1.z.string()),
        timeTaken: zod_1.z.number().optional(),
        attempt_id: zod_1.z.string().optional(),
    }),
});
exports.createLiveSessionSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(3),
        instructorName: zod_1.z.string(),
        scheduledAt: zod_1.z.string().datetime(),
        durationMinutes: zod_1.z.number().positive(),
        maxParticipants: zod_1.z.number().int().positive().optional(),
    }),
});
exports.submitProblemSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: idSchema,
    }),
    body: zod_1.z.object({
        code: zod_1.z.string().min(1),
        language: zod_1.z.string().default('javascript'),
    }),
});
exports.updateDailyGoalSchema = zod_1.z.object({
    body: zod_1.z.object({
        minutes: zod_1.z.number().positive(),
    }),
});
// Legacy support
exports.completeCourseSchema = zod_1.z.object({
    body: zod_1.z.object({
        courseId: idSchema,
        xp: zod_1.z
            .number()
            .int()
            .min(1, 'XP must be a positive integer')
            .max(1000, 'XP exceeds allowed maximum'),
    }),
});
exports.bookmarkSchema = zod_1.z.object({
    body: zod_1.z.object({
        courseId: idSchema,
    }),
});
// ==================== ADMIN AUTH SCHEMAS ====================
exports.adminLoginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email address'),
        password: zod_1.z.string().min(1, 'Password is required'),
    }),
});
exports.adminRegisterSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email address'),
        password: zod_1.z
            .string()
            .min(8, 'Password must be at least 8 characters long')
            .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
            .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
            .regex(/[0-9]/, 'Password must contain at least one number')
            .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
        username: zod_1.z.string().min(2, 'Username must be at least 2 characters'),
        adminSecret: zod_1.z.string().min(1, 'Admin secret is required'),
    }),
});

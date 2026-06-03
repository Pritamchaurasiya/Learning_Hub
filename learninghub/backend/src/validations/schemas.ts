import { z } from 'zod'

const idSchema = z
  .string()
  .min(1, 'ID is required')
  .max(50, 'ID cannot exceed 50 characters')
  .regex(/^[a-zA-Z0-9-]+$/, 'Invalid ID format')

export const registerSchema = z.object({
  body: z.object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Invalid email address')
      .max(255, 'Email address must not exceed 255 characters'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password must not exceed 128 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    username: z
      .string()
      .min(2, 'Username must be at least 2 characters')
      .max(50, 'Username must not exceed 50 characters')
      .optional(),
  }),
})

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Invalid email address')
      .max(255, 'Email address must not exceed 255 characters'),
    password: z
      .string()
      .min(1, 'Password is required')
      .max(128, 'Password must not exceed 128 characters'),
  }),
})

export const refreshSchema = z.object({
  body: z
    .object({
      refresh_token: z.string().min(1, 'Refresh token is required').optional(),
      refresh: z.string().min(1, 'Refresh token is required').optional(),
    })
    .refine(data => data.refresh_token || data.refresh, {
      message: 'Refresh token is required (provide refresh_token or refresh)',
    }),
}) // Support both refresh and refresh_token for backward compatibility

export const enrollCourseSchema = z.object({
  body: z.object({
    courseId: idSchema,
  }),
})

export const updateProgressSchema = z.object({
  body: z.object({
    courseId: idSchema,
    progress: z.number().min(0).max(100),
  }),
})

export const submitTestSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
  body: z.object({
    answers: z.record(
      z.string().max(50, 'Answer key must not exceed 50 characters'),
      z.union([
        z.string().max(50, 'Answer must not exceed 50 characters'),
        z.array(z.string().max(50, 'Answer must not exceed 50 characters')),
      ])
    ),
    timeTaken: z.number().nonnegative('Time taken must be non-negative').optional(),
    attempt_id: z.string().max(50, 'Attempt ID must not exceed 50 characters').optional(),
  }),
})

export const createLiveSessionSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(100, 'Title must not exceed 100 characters'),
    instructorName: z
      .string()
      .min(1, 'Instructor name is required')
      .max(100, 'Instructor name must not exceed 100 characters'),
    scheduledAt: z.string().datetime(),
    durationMinutes: z
      .number()
      .int()
      .positive()
      .max(480, 'Duration cannot exceed 480 minutes (8 hours)'),
    maxParticipants: z
      .number()
      .int()
      .positive()
      .max(1000, 'Max participants cannot exceed 1000')
      .optional(),
  }),
})

export const submitProblemSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
  body: z.object({
    code: z.string().min(1, 'Code is required').max(100000, 'Code size must not exceed 100KB'),
    language: z
      .string()
      .max(50, 'Language identifier must not exceed 50 characters')
      .default('javascript'),
  }),
})

export const updateDailyGoalSchema = z.object({
  body: z.object({
    minutes: z
      .number()
      .int()
      .positive()
      .max(1440, 'Daily goal cannot exceed 1440 minutes (24 hours)'),
  }),
})

// Legacy support
export const completeCourseSchema = z.object({
  body: z.object({
    courseId: idSchema,
  }),
})

export const bookmarkSchema = z.object({
  body: z.object({
    courseId: idSchema,
  }),
})

// ==================== ADMIN AUTH SCHEMAS ====================
export const adminLoginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Invalid email address')
      .max(255, 'Email address must not exceed 255 characters'),
    password: z
      .string()
      .min(1, 'Password is required')
      .max(128, 'Password must not exceed 128 characters'),
  }),
})

export const adminRegisterSchema = z.object({
  body: z.object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Invalid email address')
      .max(255, 'Email address must not exceed 255 characters'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password must not exceed 128 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    username: z
      .string()
      .min(2, 'Username must be at least 2 characters')
      .max(50, 'Username must not exceed 50 characters'),
    adminSecret: z
      .string()
      .min(1, 'Admin secret is required')
      .max(255, 'Admin secret must not exceed 255 characters'),
  }),
})

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Invalid email address')
      .max(255, 'Email address must not exceed 255 characters'),
  }),
})

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required').max(255, 'Token is too long'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password must not exceed 128 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  }),
})

import { z } from 'zod'

const idSchema = z
  .string()
  .min(1, 'ID is required')
  .regex(/^[a-zA-Z0-9-]+$/, 'Invalid ID format')

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    username: z.string().min(2, 'Username must be at least 2 characters').optional(),
  }),
})

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
})

export const refreshSchema = z
  .object({
    body: z.object({
      refresh_token: z.string().min(1, 'Refresh token is required'),
    }),
  })
  .or(
    z.object({
      body: z.object({
        refresh: z.string().min(1, 'Refresh token is required'),
      }),
    })
  ) // Support both refresh and refresh_token for backward compatibility

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
    answers: z.record(z.string(), z.string()),
    timeTaken: z.number().optional(),
    attempt_id: z.string().optional(),
  }),
})

export const createLiveSessionSchema = z.object({
  body: z.object({
    title: z.string().min(3),
    instructorName: z.string(),
    scheduledAt: z.string().datetime(),
    durationMinutes: z.number().positive(),
    maxParticipants: z.number().int().positive().optional(),
  }),
})

export const submitProblemSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
  body: z.object({
    code: z.string().min(1),
    language: z.string().default('javascript'),
  }),
})

export const updateDailyGoalSchema = z.object({
  body: z.object({
    minutes: z.number().positive(),
  }),
})

// Legacy support
export const completeCourseSchema = z.object({
  body: z.object({
    courseId: idSchema,
    xp: z
      .number()
      .int()
      .min(1, 'XP must be a positive integer')
      .max(1000, 'XP exceeds allowed maximum'),
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
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
})

export const adminRegisterSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    username: z.string().min(2, 'Username must be at least 2 characters'),
    adminSecret: z.string().min(1, 'Admin secret is required'),
  }),
})

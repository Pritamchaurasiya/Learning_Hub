import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    username: z.string().min(2, 'Username must be at least 2 characters').optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refresh_token: z.string().min(1, 'Refresh token is required'),
  }),
}).or(z.object({
  body: z.object({
    refresh: z.string().min(1, 'Refresh token is required'),
  }),
})); // Support both refresh and refresh_token for backward compatibility

export const enrollCourseSchema = z.object({
  body: z.object({
    courseId: z.string().uuid('Invalid Course ID format'),
  }),
});

export const updateProgressSchema = z.object({
  body: z.object({
    courseId: z.string().uuid('Invalid Course ID format'),
    progress: z.number().min(0).max(100),
  }),
});

export const submitTestSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Test ID format'),
  }),
  body: z.object({
    answers: z.record(z.string(), z.string()),
    timeTaken: z.number().optional(),
  }),
});

export const createLiveSessionSchema = z.object({
  body: z.object({
    title: z.string().min(3),
    instructorName: z.string(),
    scheduledAt: z.string().datetime(),
    durationMinutes: z.number().positive(),
    maxParticipants: z.number().int().positive().optional(),
  }),
});

export const submitProblemSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Problem ID format'),
  }),
  body: z.object({
    code: z.string().min(1),
    language: z.string().default('javascript'),
  }),
});

export const updateDailyGoalSchema = z.object({
  body: z.object({
    minutes: z.number().positive(),
  }),
});

// Legacy support
export const completeCourseSchema = z.object({
  body: z.object({
    courseId: z.string().min(1, 'Course ID is required'),
    xp: z.number().int().positive('XP must be a positive integer'),
  }),
});

export const bookmarkSchema = z.object({
  body: z.object({
    courseId: z.string().min(1, 'Course ID is required'),
  }),
});

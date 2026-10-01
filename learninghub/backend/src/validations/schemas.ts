import { z } from 'zod'

const idSchema = z
  .string()
  .min(1, 'ID is required')
  .max(50, 'ID cannot exceed 50 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid ID format')

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
      refresh_token: z
        .string()
        .min(1, 'Refresh token is required')
        .max(512, 'Refresh token too long')
        .optional(),
      refresh: z
        .string()
        .min(1, 'Refresh token is required')
        .max(512, 'Refresh token too long')
        .optional(),
      // Frontend canonical contract: also accept camelCase refreshToken
      refreshToken: z
        .string()
        .min(1, 'Refresh token is required')
        .max(512, 'Refresh token too long')
        .optional(),
    })
    .refine(data => data.refresh_token ?? data.refresh ?? data.refreshToken, {
      message: 'Refresh token is required (provide refresh_token, refresh, or refreshToken)',
    }),
})

// Autosave test answers — must be an object map of questionId → optionId|optionId[]|text
export const autosaveTestSchema = z.object({
  body: z.object({
    answers: z.record(
      z.string().min(1).max(128),
      z.union([z.string().max(1024), z.array(z.string().max(1024)).max(10)])
    ),
    attempt_id: z.string().min(1).max(128).optional(),
    attemptId: z.string().min(1).max(128).optional(),
    locked_section_ids: z.array(z.string().max(128)).optional(),
    lockedSectionIds: z.array(z.string().max(128)).optional(),
  }),
})

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
    answers: z
      .record(
        z.string().max(50, 'Answer key must not exceed 50 characters'),
        z.union([
          z.string().max(10000, 'Subjective answer must not exceed 10000 characters'),
          z.array(z.string().max(50, 'Answer must not exceed 50 characters')),
        ])
      )
      .superRefine((answers, ctx) => {
        const keys = Object.keys(answers)
        if (keys.length > 500) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Too many answers: ${keys.length}. Maximum is 500.`,
          })
        }
      }),
    timeTaken: z.number().nonnegative('Time taken must be non-negative').optional(),
    attempt_id: z.string().max(50, 'Attempt ID must not exceed 50 characters').optional(),
    confidences: z
      .record(z.string().max(50), z.enum(['LOW', 'MEDIUM', 'HIGH', 'low', 'medium', 'high']))
      .optional(),
    timesSpent: z
      .record(z.string().max(50), z.number().nonnegative('Time spent must be non-negative'))
      .optional(),
  }),
})

export const createTestSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title must not exceed 200 characters'),
    description: z.string().max(2000, 'Description must not exceed 2000 characters').optional().nullable(),
    examId: z.string().max(100).optional().nullable(),
    timeLimit: z.number().int().min(0, 'Time limit must be non-negative').max(480, 'Time limit cannot exceed 480 minutes').default(30),
    passingScore: z.number().min(0).max(100).default(60),
    maxAttempts: z.number().int().min(1).max(100).default(5),
    mode: z.enum(['PRACTICE', 'MOCK', 'TIMED_CHALLENGE', 'ADAPTIVE', 'CONTEST', 'practice', 'mock', 'timed_challenge', 'adaptive', 'contest']).default('PRACTICE'),
    difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'MIXED', 'ADAPTIVE', 'easy', 'medium', 'hard', 'mixed', 'adaptive']).default('MIXED'),
    totalMarks: z.number().nonnegative().optional(),
    negativeMarks: z.number().nonnegative().default(0),
    isPublished: z.boolean().default(true),
    shuffleQuestions: z.boolean().default(false),
    shuffleOptions: z.boolean().default(false),
    questions: z.array(z.object({
      text: z.string().min(3, 'Question text must be at least 3 characters'),
      type: z.enum(['MCQ', 'MSQ', 'TRUE_FALSE', 'NUMERICAL', 'SHORT_ANSWER', 'SUBJECTIVE', 'mcq', 'multiple_select', 'true_false', 'numerical', 'subjective']).default('MCQ'),
      difficulty: z.number().min(0).max(5).default(0.5),
      bloomLevel: z.enum(['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE']).default('UNDERSTAND'),
      points: z.number().int().positive().default(4),
      explanation: z.string().max(2000).optional().nullable(),
      topic: z.string().max(100).optional().nullable(),
      tags: z.array(z.string().max(50)).default([]),
      options: z.array(z.object({
        text: z.string().min(1, 'Option text cannot be empty'),
        isCorrect: z.boolean().default(false),
        explanation: z.string().max(1000).optional().nullable(),
        order: z.number().int().nonnegative().optional(),
      })).default([]),
    })).max(200, 'Maximum 200 questions allowed per test').optional().default([]),
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
    customInput: z.string().max(10000, 'Custom input must not exceed 10KB').optional(),
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

export const updateProfileSchema = z.object({
  body: z.object({
    username: z.string().min(2).max(50).optional(),
    email: z.string().trim().toLowerCase().email('Invalid email address').max(255).optional(),
    bio: z.string().max(500).optional(),
    location: z.string().max(100).optional(),
    website: z.string().url().max(200).optional().or(z.literal('')),
    avatar: z.string().max(500).optional(),
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

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z
      .string()
      .min(1, 'Current password is required')
      .max(128, 'Password must not exceed 128 characters'),
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

export const setupMfaSchema = z.object({
  body: z.object({
    token: z.string().min(6).max(6).optional(),
  }),
})

export const verifyMfaEnableSchema = z.object({
  body: z.object({
    token: z
      .string()
      .min(6, 'MFA token must be at least 6 digits')
      .max(6, 'MFA token must be at most 6 digits'),
  }),
})

export const disableMfaSchema = z.object({
  body: z.object({
    token: z
      .string()
      .min(6, 'MFA token must be at least 6 digits')
      .max(6, 'MFA token must be at most 6 digits'),
  }),
})

export const verifyMfaSchema = z.object({
  body: z.object({
    userId: z.string().min(1, 'User ID is required').optional(),
    token: z
      .string()
      .min(6, 'MFA token must be at least 6 digits')
      .max(6, 'MFA token must be at most 6 digits'),
  }),
})

// ==================== PAYMENTS SCHEMAS ====================
export const verifySessionSchema = z.object({
  body: z.object({
    session_id: z.string().min(1, 'Session ID is required').max(200),
  }),
})

// ==================== BOOKMARK SCHEMAS ====================
export const createBookmarkSchema = z.object({
  body: z.object({
    course_id: idSchema,
    notes: z.string().max(5000).optional(),
  }),
})

// ==================== LESSONS SCHEMAS ====================
export const updateLessonProgressSchema = z.object({
  params: z.object({
    courseId: idSchema,
    lessonId: idSchema,
  }),
  body: z.object({
    progress_percent: z.number().min(0).max(100).optional(),
    completed: z.boolean().optional(),
  }),
})

export const saveLessonNotesSchema = z.object({
  params: z.object({
    courseId: idSchema,
    lessonId: idSchema,
  }),
  body: z.object({
    notes: z.string().max(50000).default(''),
  }),
})

export const completeLessonSchema = z.object({
  params: z.object({
    courseId: idSchema,
    lessonId: idSchema,
  }),
  body: z
    .object({
      time_spent: z.number().int().nonnegative().max(86400).optional(),
    })
    .optional(),
})

// ==================== SUBSCRIPTIONS SCHEMAS ====================
export const createSubscriptionSchema = z.object({
  body: z.object({
    tier_id: idSchema.optional(),
    payment_method_id: z.string().max(200).optional(),
  }),
})

export const validateCouponSchema = z.object({
  body: z.object({
    code: z.string().min(1, 'Coupon code is required').max(50),
  }),
})

// ==================== AI SCHEMAS ====================
export const analyzeLearningPathSchema = z.object({
  body: z.object({
    courseIds: z.array(idSchema).max(50).optional(),
    goal: z.string().max(1000).optional(),
  }),
})

export const tutorMessageSchema = z.object({
  body: z.object({
    message: z.string().min(1, 'Message is required').max(10000),
    session_id: z.string().max(100).optional(),
    course_context: z.string().max(500).optional(),
    context: z.any().optional(),
  }),
})

export const createChatSessionSchema = z.object({
  body: z.object({
    title: z.string().max(200).optional(),
  }),
})

export const generatePracticeTestSchema = z.object({
  body: z
    .object({
      course_id: idSchema.optional(),
      topic_ids: z.array(idSchema).max(20).optional(),
      num_questions: z.coerce.number().int().min(1).max(100).optional(),
      topic: z.string().trim().min(1).max(500).optional(),
      difficulty: z
        .enum([
          'BEGINNER',
          'INTERMEDIATE',
          'ADVANCED',
          'EXPERT',
          'EASY',
          'MEDIUM',
          'HARD',
          'MIXED',
          'ADAPTIVE',
          'easy',
          'medium',
          'hard',
          'mixed',
          'adaptive',
        ])
        .optional(),
      count: z.coerce.number().int().min(1).max(100).optional(),
      mode: z
        .enum([
          'PRACTICE',
          'MOCK',
          'TIMED_CHALLENGE',
          'ADAPTIVE',
          'practice',
          'mock',
          'timed_challenge',
          'adaptive',
        ])
        .optional(),
      exam_context: z.any().optional(),
      time_limit: z.coerce.number().int().min(1).optional(),
      async: z.boolean().optional(),
    })
    .transform(body => ({
      ...body,
      count: body.count ?? body.num_questions,
    })),
})

export const codeReviewSchema = z.object({
  body: z.object({
    code: z.string().min(1, 'Code is required').max(100000),
    language: z.string().max(50).default('javascript'),
  }),
})

// ==================== SEARCH SCHEMAS ====================
export const searchSchema = z.object({
  query: z.object({
    q: z.string().max(200).optional(),
    type: z.enum(['courses', 'lessons', 'all']).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
})


// ==================== NOTIFICATIONS SCHEMAS ====================
export const markNotificationReadSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
})

export const userAnalyticsSchema = z.object({
  query: z.object({
    period: z.enum(['7d', '30d', '90d', 'all']).optional(),
    course_id: idSchema.optional(),
  }),
})

// ==================== AB TESTING SCHEMAS ====================
export const trackConversionSchema = z.object({
  body: z.object({
    experimentId: z.string().min(1, 'Experiment ID is required').max(100),
    eventName: z.string().min(1, 'Event name is required').max(100),
    value: z.number().optional(),
  }),
})

export const getExperimentResultsSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
})

// ==================== ANALYTICS SCHEMAS ====================
export const getLearningActivitySchema = z.object({
  query: z.object({
    days: z
      .string()
      .optional()
      .transform(val => (val ? Number(val) : 30))
      .pipe(z.number().int().min(1).max(365)),
  }),
})

export const getPerformanceTrendSchema = z.object({
  query: z.object({
    days: z
      .string()
      .optional()
      .transform(val => (val ? Number(val) : 30))
      .pipe(z.number().int().min(1).max(365)),
  }),
})

// ==================== EXAM CONTENT SCHEMAS ====================
export const createPYQSchema = z.object({
  body: z.object({
    year: z
      .union([z.string(), z.number()])
      .refine(val => String(val).length >= 2, 'Year is required'),
    exam: z.string().min(1, 'Exam name is required').max(200),
    subject: z.string().min(1, 'Subject is required').max(200),
    questions: z.array(z.record(z.string(), z.any())).min(1, 'At least one question is required'),
  }),
})

export const getExamsSchema = z.object({
  query: z.object({
    countryId: z.string().optional(),
  }),
})

export const getSubjectsSchema = z.object({
  params: z.object({
    examId: idSchema,
  }),
})

// ==================== BOOKMARK SCHEMAS ====================
export const bookmarkQuestionSchema = z.object({
  body: z.object({
    question_id: z.string().min(1, 'Question ID is required').max(50),
    notes: z.string().max(1000).optional(),
  }),
})

export const removeBookmarkSchema = z.object({
  params: z.object({
    questionId: z.string().min(1, 'Question ID is required').max(50),
  }),
})

// ==================== RECOMMENDATIONS SCHEMAS ====================
export const getRecommendationsSchema = z.object({
  query: z.object({
    limit: z
      .string()
      .optional()
      .transform(val => (val ? Number(val) : 10))
      .pipe(z.number().int().min(1).max(50)),
  }),
})

export const getNextTestRecommendationSchema = z.object({
  query: z.object({
    limit: z
      .string()
      .optional()
      .transform(val => (val ? Number(val) : 5))
      .pipe(z.number().int().min(1).max(20)),
  }),
})

export const getImprovementRoadmapSchema = z.object({
  query: z.object({
    weeks: z
      .string()
      .optional()
      .transform(val => (val ? Number(val) : 4))
      .pipe(z.number().int().min(1).max(12)),
  }),
})

export const getSpacedRepetitionSchema = z.object({
  query: z.object({
    limit: z
      .string()
      .optional()
      .transform(val => (val ? Number(val) : 5))
      .pipe(z.number().int().min(1).max(20)),
  }),
})

// ==================== USER ANALYTICS SCHEMAS ====================
export const getMyAnalyticsSchema = z.object({
  query: z.object({
    days: z
      .string()
      .optional()
      .transform(val => (val ? Number(val) : 30))
      .pipe(z.number().int().min(1).max(365)),
  }),
})

export const getAccuracyTrendSchema = z.object({
  query: z.object({
    days: z
      .string()
      .optional()
      .transform(val => (val ? Number(val) : 30))
      .pipe(z.number().int().min(1).max(365)),
  }),
})

export const getGrowthMetricsSchema = z.object({
  query: z.object({
    days: z
      .string()
      .optional()
      .transform(val => (val ? Number(val) : 30))
      .pipe(z.number().int().min(1).max(365)),
  }),
})

// ==================== ADMIN SCHEMAS ====================
export const adminUpdateRoleSchema = z.object({
  body: z.object({
    role: z.enum(['STUDENT', 'INSTRUCTOR', 'ADMIN', 'SUPERADMIN'], {
      message: 'Role must be one of: STUDENT, INSTRUCTOR, ADMIN, SUPERADMIN',
    }),
  }),
})

export const adminAnalyticsQuerySchema = z.object({
  query: z.object({
    days: z
      .string()
      .optional()
      .transform(val => (val ? Number(val) : 30))
      .pipe(z.number().int().min(1).max(365)),
  }),
})

export const adminAuditLogQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform(val => (val ? Number(val) : 1))
      .pipe(z.number().int().min(1))
      .optional(),
    limit: z
      .string()
      .optional()
      .transform(val => (val ? Number(val) : 20))
      .pipe(z.number().int().min(1).max(100))
      .optional(),
    user_id: z.string().max(50).optional(),
    action: z.string().max(100).optional(),
    severity: z.string().max(20).optional(),
    entity_type: z.string().max(50).optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
  }),
})

export const adminDauQuerySchema = z.object({
  query: z.object({
    days: z
      .string()
      .optional()
      .transform(val => (val ? Number(val) : 30))
      .pipe(z.number().int().min(1).max(365)),
  }),
})

export const adminSecurityEventsSchema = z.object({
  query: z.object({
    days: z
      .string()
      .optional()
      .transform(val => (val ? Number(val) : 7))
      .pipe(z.number().int().min(1).max(365)),
  }),
})

// ==================== COMMERCE SCHEMAS ====================

export const addToCartSchema = z.object({
  body: z.object({
    course_id: z
      .string()
      .min(1, 'Course ID is required')
      .max(128, 'Course ID must not exceed 128 characters'),
    quantity: z
      .number()
      .int()
      .positive('Quantity must be positive')
      .max(1, 'Maximum quantity is 1 for digital courses')
      .optional()
      .default(1),
    course_title: z.string().max(500).optional(),
    price: z.number().nonnegative().optional(),
    original_price: z.number().nonnegative().optional(),
    thumbnail: z.string().url().max(2000).optional().nullable(),
    instructor_name: z.string().max(200).optional(),
  }),
})

export const updateCartItemSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
  body: z.object({
    quantity: z
      .number()
      .int()
      .positive('Quantity must be positive')
      .max(1, 'Maximum quantity is 1'),
  }),
})

export const removeCartItemSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
})

export const applyCouponSchema = z.object({
  body: z
    .object({
      code: z
        .string()
        .max(50, 'Coupon code must not exceed 50 characters')
        .optional(),
      coupon_code: z
        .string()
        .max(50, 'Coupon code must not exceed 50 characters')
        .optional(),
    })
    .refine(data => data.code || data.coupon_code, {
      message: 'Coupon code is required (provide code or coupon_code)',
    }),
})

export const createOrderSchema = z.object({
  body: z.object({
    gateway: z
      .string()
      .max(20, 'Gateway must not exceed 20 characters')
      .optional()
      .default('razorpay'),
    course_id: z.string().max(128).optional(),
    idempotency_key: z.string().max(128).optional(),
    idempotencyKey: z.string().max(128).optional(),
  }),
})

// ==================== SUBSCRIPTION SCHEMAS ====================

export const createCheckoutSchema = z.object({
  body: z.object({
    tierId: z
      .string()
      .min(1, 'Tier ID is required')
      .max(50, 'Tier ID must not exceed 50 characters'),
  }),
})

// ==================== CERTIFICATE SCHEMAS ====================

export const generateCertificateSchema = z.object({
  body: z.object({
    courseId: z
      .string()
      .min(1, 'Course ID is required')
      .max(128, 'Course ID must not exceed 128 characters'),
  }),
})

export const verifyCertificateSchema = z.object({
  params: z.object({
    code: z
      .string()
      .min(1, 'Certificate code is required')
      .max(100, 'Certificate code must not exceed 100 characters')
      .regex(/^[A-Za-z0-9\-]+$/, 'Invalid certificate code format'),
  }),
})

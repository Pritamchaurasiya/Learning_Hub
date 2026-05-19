"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWeakTopics = exports.generateWeakAreaTest = exports.generatePracticeTest = exports.getTutorResponse = exports.analyzeLearningPath = void 0;
const generative_ai_1 = require("@google/generative-ai");
const prismaClient_1 = require("../prismaClient");
const logger_1 = __importDefault(require("../utils/logger"));
const AITestService_1 = require("../services/AITestService");
// ─── Gemini client (lazy-init, singleton) ────────────────────────────────────
let _genAI = null;
function getGenAI() {
    if (_genAI)
        return _genAI;
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'mock-key' || key.trim() === '') {
        logger_1.default.warn('[AIController] GEMINI_API_KEY not set — AI features will be unavailable');
        return null;
    }
    _genAI = new generative_ai_1.GoogleGenerativeAI(key);
    return _genAI;
}
// ─── Helpers ─────────────────────────────────────────────────────────────────
async function buildLearningContext(userId) {
    try {
        const [user, completedCourses, recentTests] = await Promise.all([
            prismaClient_1.prisma.user.findUnique({
                where: { id: userId },
                select: { username: true, xp: true, level: true, streak: true },
            }),
            prismaClient_1.prisma.userProgress.count({ where: { userId, status: 'COMPLETED' } }),
            prismaClient_1.prisma.testResult.findMany({
                where: { userId, status: 'COMPLETED' },
                orderBy: { completedAt: 'desc' },
                take: 5,
                select: { percentage: true, passed: true, test: { select: { title: true } } },
            }),
        ]);
        const avgScore = recentTests.length > 0
            ? Math.round(recentTests.reduce((s, r) => s + r.percentage, 0) / recentTests.length)
            : null;
        return [
            `Student: ${user?.username ?? 'Learner'}`,
            `Level: ${user?.level ?? 1} | XP: ${user?.xp ?? 0} | Streak: ${user?.streak ?? 0} days`,
            `Completed courses: ${completedCourses}`,
            avgScore !== null ? `Recent test average: ${avgScore}%` : '',
        ]
            .filter(Boolean)
            .join('\n');
    }
    catch {
        return '';
    }
}
// ─── Controllers ─────────────────────────────────────────────────────────────
/**
 * POST /api/v1/ai/learning-path
 */
const analyzeLearningPath = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const [completedCourses, inProgressCourses, testResults, weakTopics] = await Promise.all([
            prismaClient_1.prisma.userProgress.findMany({
                where: { userId, status: 'COMPLETED' },
                include: { course: { select: { title: true, category: true, difficulty: true } } },
                take: 10,
            }),
            prismaClient_1.prisma.userProgress.findMany({
                where: { userId, status: 'IN_PROGRESS' },
                include: { course: { select: { title: true, category: true } } },
                take: 5,
            }),
            prismaClient_1.prisma.testResult.findMany({
                where: { userId, status: 'COMPLETED' },
                orderBy: { completedAt: 'desc' },
                take: 10,
                select: {
                    percentage: true,
                    passed: true,
                    test: { select: { title: true, difficulty: true } },
                },
            }),
            prismaClient_1.prisma.testResult.findMany({
                where: { userId, status: 'COMPLETED', percentage: { lt: 50 } },
                orderBy: { completedAt: 'desc' },
                take: 5,
                select: { test: { select: { title: true } }, percentage: true },
            }),
        ]);
        const genAI = getGenAI();
        if (!genAI) {
            const avgScore = testResults.length > 0
                ? Math.round(testResults.reduce((s, r) => s + r.percentage, 0) / testResults.length)
                : 0;
            const passRate = testResults.length > 0
                ? Math.round((testResults.filter(r => r.passed).length / testResults.length) * 100)
                : 0;
            res.json({
                status: 'success',
                data: {
                    strengths: completedCourses.map(c => c.course.title).slice(0, 3),
                    weaknesses: weakTopics.map(t => t.test.title).slice(0, 3),
                    recommendation: inProgressCourses.length > 0
                        ? `Continue with "${inProgressCourses[0].course.title}" to maintain momentum.`
                        : 'Enrol in a new course to keep progressing.',
                    stats: {
                        avg_score: avgScore,
                        pass_rate: passRate,
                        completed_courses: completedCourses.length,
                    },
                    ai_powered: false,
                },
            });
            return;
        }
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const prompt = `
You are a personalised learning coach for an edtech platform.

Student data:
- Completed courses: ${completedCourses.map(c => `${c.course.title} (${c.course.difficulty})`).join(', ') || 'None yet'}
- In-progress courses: ${inProgressCourses.map(c => c.course.title).join(', ') || 'None'}
- Recent test scores: ${testResults.map(r => `${r.test.title}: ${Math.round(r.percentage)}%`).join(', ') || 'No tests taken'}
- Struggling areas (< 50%): ${weakTopics.map(t => `${t.test.title} (${Math.round(t.percentage)}%)`).join(', ') || 'None identified'}

Respond with ONLY valid JSON (no markdown):
{
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2"],
  "recommendation": "One actionable sentence",
  "next_steps": ["step1", "step2", "step3"]
}
`;
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const jsonText = text.startsWith('```') ? text.split('```')[1].replace(/^json\n?/, '') : text;
        const analysis = JSON.parse(jsonText);
        res.json({ status: 'success', data: { ...analysis, ai_powered: true } });
    }
    catch (error) {
        logger_1.default.error('[AIController] analyzeLearningPath error', error instanceof Error ? error : new Error(String(error)));
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.analyzeLearningPath = analyzeLearningPath;
/**
 * POST /api/v1/ai/tutor
 */
const getTutorResponse = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const { message, context } = req.body;
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            res.status(400).json({ status: 'error', message: 'Message is required' });
            return;
        }
        const sanitizedMessage = message.trim().substring(0, 2000);
        const genAI = getGenAI();
        if (!genAI) {
            res.json({
                status: 'success',
                data: {
                    response: 'The AI tutor is currently unavailable (API key not configured). Please check the course materials or contact support.',
                    model: 'unavailable',
                    ai_powered: false,
                },
            });
            return;
        }
        const userContext = await buildLearningContext(userId);
        let courseContext = '';
        if (context?.course_id) {
            try {
                const course = await prismaClient_1.prisma.course.findUnique({
                    where: { id: context.course_id },
                    select: { title: true, description: true, category: true },
                });
                if (course) {
                    courseContext = `\nCurrent course: ${course.title} (${course.category})\n${course.description?.substring(0, 300)}`;
                }
            }
            catch {
                /* ignore */
            }
        }
        const systemPrompt = `You are an expert AI Tutor for LearningHub, an edtech platform.

Your traits:
- Encouraging, precise, and deeply knowledgeable
- Explain complex topics simply without dumbing them down
- Use analogies and concrete examples
- Always respond in the same language as the student's question
- Keep responses focused and under 400 words unless a detailed explanation is explicitly needed
- Format code with proper markdown code blocks

Student context:
${userContext}${courseContext}

If you don't know something, say so honestly rather than guessing.`;
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            systemInstruction: systemPrompt,
        });
        const result = await model.generateContent(sanitizedMessage);
        const tutorMessage = result.response.text();
        if (!tutorMessage) {
            res.status(500).json({ status: 'error', message: 'AI returned an empty response' });
            return;
        }
        res.json({
            status: 'success',
            data: {
                response: tutorMessage,
                usage: {
                    prompt_tokens: result.response.usageMetadata?.promptTokenCount ?? 0,
                    completion_tokens: result.response.usageMetadata?.candidatesTokenCount ?? 0,
                    total_tokens: result.response.usageMetadata?.totalTokenCount ?? 0,
                },
                model: 'gemini-2.0-flash',
                ai_powered: true,
            },
        });
    }
    catch (error) {
        logger_1.default.error('[AIController] getTutorResponse error', error instanceof Error ? error : new Error(String(error)));
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getTutorResponse = getTutorResponse;
/**
 * POST /api/v1/ai/generate-test
 * Generates a practice test and persists it to the database.
 */
const generatePracticeTest = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const { topic, difficulty = 'MEDIUM', count = 10, mode = 'PRACTICE', exam_context, time_limit, } = req.body;
        if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
            res.status(400).json({ status: 'error', message: 'Topic is required' });
            return;
        }
        const result = await AITestService_1.aiTestService.generateTest({
            userId,
            topic: topic.trim(),
            difficulty: difficulty.toUpperCase(),
            count: Math.min(Math.max(parseInt(String(count), 10) || 10, 5), 50),
            mode: (mode ?? 'PRACTICE').toUpperCase(),
            examContext: exam_context,
            timeLimit: time_limit,
        });
        res.json({ status: 'success', data: result });
    }
    catch (error) {
        logger_1.default.error('[AIController] generatePracticeTest error', error instanceof Error ? error : new Error(String(error)));
        res.status(500).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'Internal server error',
        });
    }
};
exports.generatePracticeTest = generatePracticeTest;
/**
 * POST /api/v1/ai/generate-weak-area-test
 * Generates a test targeting the user's weakest topics.
 */
const generateWeakAreaTest = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const { count = 10 } = req.body;
        const result = await AITestService_1.aiTestService.generateWeakAreaTest(userId, Math.min(Math.max(parseInt(String(count), 10) || 10, 5), 50));
        res.json({ status: 'success', data: result });
    }
    catch (error) {
        logger_1.default.error('[AIController] generateWeakAreaTest error', error instanceof Error ? error : new Error(String(error)));
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.generateWeakAreaTest = generateWeakAreaTest;
/**
 * GET /api/v1/ai/weak-topics
 * Returns the user's weak topics based on test performance.
 */
const getWeakTopics = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const weakTopics = await AITestService_1.aiTestService.getWeakTopics(userId);
        res.json({ status: 'success', data: { weak_topics: weakTopics } });
    }
    catch (error) {
        logger_1.default.error('[AIController] getWeakTopics error', error instanceof Error ? error : new Error(String(error)));
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getWeakTopics = getWeakTopics;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestResult = exports.createOption = exports.createQuestion = exports.createTest = void 0;
const createTest = (overrides = {}) => ({
    id: 'test-' + Math.random().toString(36).substring(7),
    examId: null,
    title: 'Sample Test',
    description: 'A sample test description',
    timeLimit: 30,
    passingScore: 60,
    maxAttempts: 3,
    mode: 'MOCK',
    difficulty: 'MIXED',
    totalMarks: 100,
    negativeMarks: 0,
    isPublished: true,
    isAiGenerated: false,
    templateId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
});
exports.createTest = createTest;
const createQuestion = (overrides = {}) => ({
    id: 'q-' + Math.random().toString(36).substring(7),
    testId: 'test-123',
    topicId: null,
    text: 'Sample question?',
    type: 'MCQ',
    difficulty: 0.5,
    bloomLevel: 'UNDERSTAND',
    explanation: 'Explanation here',
    solutionSteps: null,
    tags: [],
    isAiGenerated: false,
    points: 10,
    order: 0,
    ...overrides,
});
exports.createQuestion = createQuestion;
const createOption = (overrides = {}) => ({
    id: 'opt-' + Math.random().toString(36).substring(7),
    questionId: 'q-123',
    text: 'Option text',
    isCorrect: false,
    explanation: null,
    order: 0,
    ...overrides,
});
exports.createOption = createOption;
const createTestResult = (overrides = {}) => ({
    id: 'tr-' + Math.random().toString(36).substring(7),
    userId: 'user-123',
    testId: 'test-123',
    attemptNumber: 1,
    score: 80,
    cbmScore: 0,
    totalPoints: 100,
    percentage: 80,
    passed: true,
    timeTaken: 1200,
    status: 'COMPLETED',
    completedAt: new Date(),
    startedAt: new Date(Date.now() - 1200000),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});
exports.createTestResult = createTestResult;

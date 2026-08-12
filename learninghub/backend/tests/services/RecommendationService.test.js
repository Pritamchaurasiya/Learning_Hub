"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RecommendationService_1 = require("../../src/services/RecommendationService");
const prismaClient_1 = require("../../src/prismaClient");
const TopicPerformanceService_1 = require("../../src/services/TopicPerformanceService");
const ConductorClient_1 = require("../../src/services/ml/ConductorClient");
jest.mock('../../src/prismaClient', () => {
    const mockClient = {
        userExamPreference: {
            findUnique: jest.fn(),
        },
        topicPerformance: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
        },
        test: {
            findMany: jest.fn(),
        },
    };
    return { prisma: mockClient };
});
jest.mock('../../src/services/TopicPerformanceService', () => ({
    topicPerformanceService: {
        getWeakTopics: jest.fn(),
        getTopicsDueForReview: jest.fn(),
        getTopicMasteryMap: jest.fn(),
    },
}));
jest.mock('../../src/services/ml/ConductorClient', () => ({
    conductorClient: {
        getDktRecommendations: jest.fn(),
    },
}));
jest.mock('../../src/services/CacheService', () => ({
    cacheService: {
        getOrSet: jest.fn((key, fetcher) => fetcher()),
        recommendationStudyKey: jest.fn((id) => `study_${id}`),
        recommendationTestKey: jest.fn((id) => `test_${id}`),
        recommendationRoadmapKey: jest.fn((id) => `roadmap_${id}`),
        recommendationSpacedKey: jest.fn((id) => `spaced_${id}`),
    },
}));
describe('RecommendationService Suite', () => {
    let service;
    beforeEach(() => {
        jest.clearAllMocks();
        service = new RecommendationService_1.RecommendationService();
    });
    describe('getStudyRecommendations', () => {
        it('should return prioritized study recommendations (weak areas first)', async () => {
            ;
            TopicPerformanceService_1.topicPerformanceService.getWeakTopics.mockResolvedValue([
                {
                    topicName: 'Algebra',
                    subjectName: 'Math',
                    accuracy: 40,
                    totalAttempts: 5,
                    lastAttemptAt: new Date(Date.now() - 86400000 * 3),
                },
            ]);
            TopicPerformanceService_1.topicPerformanceService.getTopicsDueForReview.mockResolvedValue([
                {
                    topicName: 'Geometry',
                    subjectName: 'Math',
                    accuracy: 70,
                    totalAttempts: 10,
                    lastAttemptAt: new Date(Date.now() - 86400000 * 15),
                },
            ]);
            prismaClient_1.prisma.userExamPreference.findUnique.mockResolvedValue(null);
            const recs = await service.getStudyRecommendations('user-1', 10);
            expect(recs.length).toBe(2);
            expect(recs[0].topicName).toBe('Algebra'); // Weak area has higher priority
            expect(recs[0].type).toBe('weak_area');
            expect(recs[1].topicName).toBe('Geometry');
            expect(recs[1].type).toBe('review_due');
        });
        it('should deduplicate topics that appear in both weak and dueForReview lists', async () => {
            const sameDate = new Date();
            TopicPerformanceService_1.topicPerformanceService.getWeakTopics.mockResolvedValue([
                { topicName: 'Algebra', accuracy: 30, totalAttempts: 5, lastAttemptAt: sameDate },
            ]);
            TopicPerformanceService_1.topicPerformanceService.getTopicsDueForReview.mockResolvedValue([
                { topicName: 'Algebra', accuracy: 30, totalAttempts: 5, lastAttemptAt: sameDate },
            ]);
            prismaClient_1.prisma.userExamPreference.findUnique.mockResolvedValue(null);
            const recs = await service.getStudyRecommendations('user-1', 10);
            expect(recs.length).toBe(1);
            expect(recs[0].topicName).toBe('Algebra');
            expect(recs[0].type).toBe('weak_area');
        });
    });
    describe('getNextTestRecommendation', () => {
        it('should score and sort tests by how well they match weak topics', async () => {
            ;
            TopicPerformanceService_1.topicPerformanceService.getWeakTopics.mockResolvedValue([
                { topicName: 'Algebra' },
                { topicName: 'Calculus' },
            ]);
            prismaClient_1.prisma.userExamPreference.findUnique.mockResolvedValue({ examId: 'exam-1' });
            prismaClient_1.prisma.test.findMany.mockResolvedValue([
                {
                    id: 't-1',
                    title: 'Algebra Mastery Test',
                    difficulty: 'MEDIUM',
                    mode: 'PRACTICE',
                    timeLimit: 30,
                    questions: [{ id: 'q1', tags: ['Algebra', 'Calculus'] }],
                    _count: { questions: 10 },
                },
                {
                    id: 't-2',
                    title: 'General Math Test',
                    difficulty: 'EASY',
                    mode: 'PRACTICE',
                    timeLimit: 20,
                    questions: [{ id: 'q2', tags: ['Geometry'] }],
                    _count: { questions: 5 },
                },
            ]);
            const recs = await service.getNextTestRecommendation('user-1', 5);
            expect(recs.length).toBe(2);
            expect(recs[0].testId).toBe('t-1');
            expect(recs[0].matchScore).toBe(100); // All tags match weak topics
            expect(recs[1].testId).toBe('t-2');
            expect(recs[1].matchScore).toBe(0); // No tags match
        });
    });
    describe('getImprovementRoadmap', () => {
        it('should generate a weekly plan to reach target mastery', async () => {
            ;
            TopicPerformanceService_1.topicPerformanceService.getTopicMasteryMap.mockResolvedValue({
                overallAccuracy: 50,
                weakTopics: [{ topicName: 'Algebra', accuracy: 40, totalAttempts: 5 }],
                topics: [
                    { topicName: 'Algebra', accuracy: 40, strengthLevel: 'weak', totalAttempts: 5 },
                    { topicName: 'Geometry', accuracy: 55, strengthLevel: 'developing', totalAttempts: 4 },
                ],
            });
            const roadmap = await service.getImprovementRoadmap('user-1', 2);
            expect(roadmap.currentLevel).toBe('Developing'); // 50% = Developing
            expect(roadmap.targetLevel).toBe('Intermediate'); // Next level after Developing
            expect(roadmap.weeklyPlan.length).toBe(1); // 2 topics / minimum 2 topics per week = 1 week
            expect(roadmap.keyFocusAreas).toContain('Algebra');
        });
    });
    describe('getSpacedRepetitionRecommendations', () => {
        it('should use ML DKT recommendations when available and priority > 50', async () => {
            ;
            ConductorClient_1.conductorClient.getDktRecommendations.mockResolvedValue([
                { topic_name: 'Calculus', priority: 85, expected_accuracy: 45 },
            ]);
            prismaClient_1.prisma.topicPerformance.findMany.mockResolvedValue([
                {
                    topicName: 'Calculus',
                    totalAttempts: 5,
                    accuracy: 80,
                    lastAttemptAt: new Date(Date.now() - 86400000 * 5),
                },
            ]);
            const recs = await service.getSpacedRepetitionRecommendations('user-1');
            expect(recs.length).toBe(1);
            expect(recs[0].topicName).toBe('Calculus');
            expect(recs[0].priority).toBe(85);
            expect(recs[0].reason).toContain('ML predicts knowledge decay');
        });
        it('should fallback to forgetting curve heuristic when ML is unavailable', async () => {
            ;
            ConductorClient_1.conductorClient.getDktRecommendations.mockResolvedValue(null);
            prismaClient_1.prisma.topicPerformance.findMany.mockResolvedValue([
                {
                    topicName: 'Algebra',
                    totalAttempts: 5,
                    accuracy: 50,
                    lastAttemptAt: new Date(Date.now() - 86400000 * 35),
                },
            ]);
            const recs = await service.getSpacedRepetitionRecommendations('user-1');
            expect(recs.length).toBe(1);
            expect(recs[0].topicName).toBe('Algebra');
            expect(recs[0].reason).toContain('Due for review');
        });
    });
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ItemCalibrationService_1 = require("../../../src/services/ml/ItemCalibrationService");
const prismaClient_1 = require("../../../src/prismaClient");
const ConductorClient_1 = require("../../../src/services/ml/ConductorClient");
const mockPrisma = prismaClient_1.prisma;
jest.mock('../../../src/utils/logger', () => {
    const mockLogger = {
        warn: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        audit: jest.fn(),
    };
    return {
        ...mockLogger,
        default: mockLogger,
    };
});
jest.mock('../../../src/services/ml/ConductorClient', () => ({
    conductorClient: {
        calibrateItem: jest.fn(),
    },
}));
describe('ItemCalibrationService Suite', () => {
    let service;
    beforeEach(() => {
        jest.clearAllMocks();
        service = new ItemCalibrationService_1.ItemCalibrationService();
    });
    it('should skip questions with fewer than 5 answers', async () => {
        mockPrisma.question.findMany = jest.fn().mockResolvedValue([{ id: 'q-1', difficulty: 0.5, _count: { TestAttemptAnswer: 2 } }]);
        mockPrisma.testAttemptAnswer.findMany = jest
            .fn()
            .mockResolvedValue([{ isCorrect: true }, { isCorrect: false }]); // only 2 answers
        const stats = await service.calibrateAllItems();
        expect(stats.totalScanned).toBe(1);
        expect(stats.skipped).toBe(1);
        expect(stats.calibratedWithML).toBe(0);
        expect(stats.calibratedWithHeuristics).toBe(0);
        expect(ConductorClient_1.conductorClient.calibrateItem).not.toHaveBeenCalled();
    });
    it('should calibrate item using Conductor ML pipeline when available', async () => {
        mockPrisma.question.findMany = jest.fn().mockResolvedValue([{ id: 'q-ml', difficulty: 0.5, _count: { TestAttemptAnswer: 5 } }]);
        mockPrisma.testAttemptAnswer.findMany = jest
            .fn()
            .mockResolvedValue([
            { isCorrect: true },
            { isCorrect: true },
            { isCorrect: false },
            { isCorrect: true },
            { isCorrect: false },
        ]) // 5 answers
        ;
        ConductorClient_1.conductorClient.calibrateItem.mockResolvedValue({
            difficulty: 0.8,
            discrimination: 1.5,
        });
        mockPrisma.question.update = jest.fn().mockResolvedValue({});
        const stats = await service.calibrateAllItems();
        expect(stats.totalScanned).toBe(1);
        expect(stats.calibratedWithML).toBe(1);
        expect(stats.calibratedWithHeuristics).toBe(0);
        expect(stats.skipped).toBe(0);
        expect(ConductorClient_1.conductorClient.calibrateItem).toHaveBeenCalledWith('q-ml', [
            { isCorrect: true },
            { isCorrect: true },
            { isCorrect: false },
            { isCorrect: true },
            { isCorrect: false },
        ]);
        // Old: 0.5, target: 0.8 -> new: 0.5 + 0.1*(0.8-0.5) = 0.53 (diff > 0.02)
        expect(mockPrisma.question.update).toHaveBeenCalledWith({
            where: { id: 'q-ml' },
            data: { difficulty: 0.53 },
        });
    });
    it('should fallback to heuristics when Conductor returns null or invalid difficulty', async () => {
        mockPrisma.question.findMany = jest
            .fn()
            .mockResolvedValue([{ id: 'q-heuristics', difficulty: 0.5, _count: { TestAttemptAnswer: 5 } }]);
        mockPrisma.testAttemptAnswer.findMany = jest.fn().mockResolvedValue([
            { isCorrect: true },
            { isCorrect: true },
            { isCorrect: true },
            { isCorrect: true },
            { isCorrect: true }, // 100% correct -> empirical diff = 1 - 1 = 0.0
        ]);
        ConductorClient_1.conductorClient.calibrateItem.mockResolvedValue(null);
        mockPrisma.question.update = jest.fn().mockResolvedValue({});
        const stats = await service.calibrateAllItems();
        expect(stats.totalScanned).toBe(1);
        expect(stats.calibratedWithML).toBe(0);
        expect(stats.calibratedWithHeuristics).toBe(1);
        expect(stats.skipped).toBe(0);
        // Old: 0.5, target: 0.0 -> new: 0.5 + 0.1*(0 - 0.5) = 0.45 (diff > 0.02)
        expect(mockPrisma.question.update).toHaveBeenCalledWith({
            where: { id: 'q-heuristics' },
            data: { difficulty: 0.45 },
        });
    });
    it('should not update database if difficulty shift is <= 0.02', async () => {
        mockPrisma.question.findMany = jest
            .fn()
            .mockResolvedValue([{ id: 'q-small-shift', difficulty: 0.5, _count: { TestAttemptAnswer: 5 } }]);
        mockPrisma.testAttemptAnswer.findMany = jest.fn().mockResolvedValue([
            { isCorrect: true },
            { isCorrect: true },
            { isCorrect: false },
            { isCorrect: false },
            { isCorrect: true }, // 60% correct -> target = 0.4
        ]);
        ConductorClient_1.conductorClient.calibrateItem.mockResolvedValue({
            difficulty: 0.51, // old: 0.5, target: 0.51 -> new: 0.501 -> diff 0.001 <= 0.02
            discrimination: 1.0,
        });
        mockPrisma.question.update = jest.fn();
        const stats = await service.calibrateAllItems();
        expect(stats.calibratedWithML).toBe(1);
        expect(mockPrisma.question.update).not.toHaveBeenCalled();
    });
    it('should catch database errors and return partial stats without crashing', async () => {
        mockPrisma.question.findMany = jest.fn().mockRejectedValue(new Error('DB failure'));
        const stats = await service.calibrateAllItems();
        expect(stats.totalScanned).toBe(0);
        expect(stats.skipped).toBe(0);
    });
});

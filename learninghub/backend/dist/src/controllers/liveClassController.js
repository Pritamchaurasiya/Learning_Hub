"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinLiveSession = exports.createLiveSession = exports.listLiveSessions = void 0;
const prismaClient_1 = require("../prismaClient");
const pagination_1 = require("../utils/pagination");
const logger_1 = __importDefault(require("../utils/logger"));
const listLiveSessions = async (req, res) => {
    try {
        const { status } = req.query;
        const { page, limit, skip } = (0, pagination_1.getPaginationParams)(req.query);
        const filters = {};
        if (status)
            filters.status = status;
        // Parallelize count + findMany
        const [total, sessions] = await Promise.all([
            prismaClient_1.prisma.liveSession.count({ where: filters }),
            prismaClient_1.prisma.liveSession.findMany({
                where: filters,
                skip,
                take: limit,
                orderBy: { scheduledAt: 'asc' },
            }),
        ]);
        res.json((0, pagination_1.createPaginatedResponse)(sessions, total, page, limit));
    }
    catch (error) {
        logger_1.default.error('[LiveClassController] listLiveSessions error', error instanceof Error ? error : new Error(String(error)));
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.listLiveSessions = listLiveSessions;
const createLiveSession = async (req, res) => {
    try {
        // Role guard: only admin or instructor can create sessions
        const userRole = req.user?.role;
        if (!userRole || !['ADMIN', 'SUPERADMIN', 'INSTRUCTOR'].includes(userRole)) {
            res
                .status(403)
                .json({ status: 'error', message: 'Only admins and instructors can create live sessions' });
            return;
        }
        const { title, instructorName, scheduledAt, durationMinutes, maxParticipants } = req.body;
        const instructorId = req.user?.userId;
        const session = await prismaClient_1.prisma.liveSession.create({
            data: {
                title,
                instructorName,
                instructorId,
                scheduledAt: new Date(scheduledAt),
                durationMinutes,
                maxParticipants,
                status: 'upcoming',
            },
        });
        res.status(201).json({ status: 'success', data: session });
    }
    catch (error) {
        logger_1.default.error('[LiveClassController] createLiveSession error', error instanceof Error ? error : new Error(String(error)), {
            userId: req.user?.userId,
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.createLiveSession = createLiveSession;
const joinLiveSession = async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        // Fetch session first to validate existence and check capacity
        const session = await prismaClient_1.prisma.liveSession.findUnique({ where: { id } });
        if (!session) {
            res.status(404).json({ status: 'error', message: 'Session not found' });
            return;
        }
        if (session.status === 'completed') {
            res.status(400).json({ status: 'error', message: 'Session has already ended' });
            return;
        }
        if (session.currentParticipants >= session.maxParticipants) {
            res.status(400).json({ status: 'error', message: 'Session is full' });
            return;
        }
        // Atomic increment with capacity guard using raw SQL to prevent race conditions
        const result = await prismaClient_1.prisma.$executeRaw `
      UPDATE "LiveSession"
      SET "currentParticipants" = "currentParticipants" + 1
      WHERE id = ${id}
        AND "currentParticipants" < "maxParticipants"
    `;
        if (result === 0) {
            // Race condition: another user filled the last spot
            res.status(400).json({ status: 'error', message: 'Session is full' });
            return;
        }
        const updated = await prismaClient_1.prisma.liveSession.findUnique({ where: { id } });
        res.json({ status: 'success', data: updated });
    }
    catch (error) {
        logger_1.default.error('[LiveClassController] joinLiveSession error', error instanceof Error ? error : new Error(String(error)), {
            sessionId: req.params.id,
            userId: req.user?.userId,
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.joinLiveSession = joinLiveSession;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinLiveSession = exports.createLiveSession = exports.listLiveSessions = void 0;
const prismaClient_1 = require("../prismaClient");
const pagination_1 = require("../utils/pagination");
const listLiveSessions = async (req, res) => {
    try {
        const { status } = req.query;
        const { page, limit, skip } = (0, pagination_1.getPaginationParams)(req.query);
        const filters = {};
        if (status)
            filters.status = status;
        // Get total count for pagination
        const total = await prismaClient_1.prisma.liveSession.count({ where: filters });
        const sessions = await prismaClient_1.prisma.liveSession.findMany({
            where: filters,
            skip,
            take: limit,
            orderBy: { scheduledAt: 'asc' }
        });
        res.json((0, pagination_1.createPaginatedResponse)(sessions, total, page, limit));
    }
    catch (error) {
        console.error('[LiveClassController] listLiveSessions error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.listLiveSessions = listLiveSessions;
const createLiveSession = async (req, res) => {
    try {
        const { title, instructorName, scheduledAt, durationMinutes, maxParticipants } = req.body;
        const session = await prismaClient_1.prisma.liveSession.create({
            data: {
                title,
                instructorName,
                scheduledAt: new Date(scheduledAt),
                durationMinutes,
                maxParticipants,
                status: 'upcoming'
            }
        });
        res.status(201).json({ status: 'success', data: session });
    }
    catch (error) {
        console.error('[LiveClassController] createLiveSession error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.createLiveSession = createLiveSession;
const joinLiveSession = async (req, res) => {
    try {
        const { id } = req.params;
        const session = await prismaClient_1.prisma.liveSession.findUnique({ where: { id } });
        if (!session) {
            res.status(404).json({ status: 'error', message: 'Session not found' });
            return;
        }
        if (session.currentParticipants >= session.maxParticipants) {
            res.status(400).json({ status: 'error', message: 'Session is full' });
            return;
        }
        const updated = await prismaClient_1.prisma.liveSession.update({
            where: { id },
            data: {
                currentParticipants: { increment: 1 }
            }
        });
        res.json({ status: 'success', data: updated });
    }
    catch (error) {
        console.error('[LiveClassController] joinLiveSession error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.joinLiveSession = joinLiveSession;

import { Request, Response } from 'express';
import { prisma } from '../prismaClient';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination';

export const listLiveSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const { page, limit, skip } = getPaginationParams(req.query);
    
    const filters: any = {};
    if (status) filters.status = status as string;

    // Get total count for pagination
    const total = await prisma.liveSession.count({ where: filters });

    const sessions = await prisma.liveSession.findMany({
      where: filters,
      skip,
      take: limit,
      orderBy: { scheduledAt: 'asc' }
    });

    res.json(createPaginatedResponse(sessions, total, page, limit));
  } catch (error) {
    console.error('[LiveClassController] listLiveSessions error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

export const createLiveSession = async (req: any, res: Response): Promise<void> => {
  try {
    const { title, instructorName, scheduledAt, durationMinutes, maxParticipants } = req.body;

    const session = await prisma.liveSession.create({
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
  } catch (error) {
    console.error('[LiveClassController] createLiveSession error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

export const joinLiveSession = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const session = await prisma.liveSession.findUnique({ where: { id } });

    if (!session) {
      res.status(404).json({ status: 'error', message: 'Session not found' });
      return;
    }

    if (session.currentParticipants >= session.maxParticipants) {
      res.status(400).json({ status: 'error', message: 'Session is full' });
      return;
    }

    const updated = await prisma.liveSession.update({
      where: { id },
      data: {
        currentParticipants: { increment: 1 }
      }
    });

    res.json({ status: 'success', data: updated });
  } catch (error) {
    console.error('[LiveClassController] joinLiveSession error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

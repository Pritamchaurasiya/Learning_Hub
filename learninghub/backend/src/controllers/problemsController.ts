import { Request, Response } from 'express';
import { prisma } from '../prismaClient';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination';

export const listProblems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { difficulty, category } = req.query;
    const { page, limit, skip } = getPaginationParams(req.query);
    
    const filters: any = {};
    if (difficulty) filters.difficulty = difficulty as string;
    if (category) filters.category = category as string;

    // Get total count for pagination
    const total = await prisma.problem.count({ where: filters });

    const problems = await prisma.problem.findMany({
      where: filters,
      skip,
      take: limit,
      include: {
        _count: {
          select: { submissions: true }
        }
      }
    });

    res.json(createPaginatedResponse(problems, total, page, limit));
  } catch (error) {
    console.error('[ProblemsController] listProblems error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

export const getProblemDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const problem = await prisma.problem.findUnique({
      where: { id }
    });

    if (!problem) {
      res.status(404).json({ status: 'error', message: 'Problem not found' });
      return;
    }

    res.json({ status: 'success', data: problem });
  } catch (error) {
    console.error('[ProblemsController] getProblemDetails error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

export const submitProblemSolution = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const { id: problemId } = req.params;
    const { code, language } = req.body;

    // Mock execution logic
    // In a real SaaS, this would call a Judge0 or a custom sandbox
    const status = Math.random() > 0.3 ? 'accepted' : 'wrong_answer';
    
    const submission = await prisma.problemSubmission.create({
      data: {
        userId,
        problemId,
        code,
        language: language || 'javascript',
        status,
        executionTime: Math.floor(Math.random() * 100),
        memoryUsed: Math.floor(Math.random() * 5000)
      }
    });

    if (status === 'accepted') {
      await prisma.user.update({
        where: { id: userId },
        data: {
          xp: { increment: 50 }
        }
      });
    }

    res.status(201).json({ status: 'success', data: submission });
  } catch (error) {
    console.error('[ProblemsController] submitSolution error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

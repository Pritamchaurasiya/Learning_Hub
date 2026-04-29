import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal Server Error';

  logger.error(`[Error] ${statusCode} - ${err.message}`, err, {
    path: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  res.status(statusCode).json({
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const err = new Error(`Route not found: ${req.originalUrl}`) as AppError;
  err.statusCode = 404;
  err.isOperational = true;
  next(err);
};

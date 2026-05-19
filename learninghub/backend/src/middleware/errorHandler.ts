import { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import logger from '../utils/logger'

export class AppError extends Error {
  public statusCode: number
  public isOperational: boolean

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational

    Error.captureStackTrace(this, this.constructor)
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500
  let message = 'Internal server error'
  let errors: any = undefined

  if (err instanceof AppError) {
    statusCode = err.statusCode
    // For non-operational errors (programming bugs), hide internal details in production
    message = err.isOperational ? err.message : 'Internal Server Error'
  } else if (err instanceof ZodError) {
    statusCode = 400
    message = 'Validation failed'
    errors = err.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
    }))
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaError = handlePrismaError(err)
    statusCode = prismaError.statusCode
    message = prismaError.message
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400
    message = 'Invalid request data'
  } else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    statusCode = 500
    message = 'Internal Server Error'
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401
    message = 'Invalid token'
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401
    message = 'Token expired'
  } else if (err instanceof SyntaxError && 'body' in err) {
    statusCode = 400
    message = 'Invalid JSON in request body'
  } else {
    // Generic non-operational error — hide internals in production
    message = 'Internal Server Error'
  }

  if (process.env.NODE_ENV === 'development') {
    logger.error(`[ErrorHandler] ${statusCode} - ${message}`, err)
  } else {
    logger.error(`[ErrorHandler] ${statusCode} - ${message}`, new Error(message))
  }

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}

function handlePrismaError(err: Prisma.PrismaClientKnownRequestError): {
  statusCode: number
  message: string
} {
  switch (err.code) {
    case 'P2002':
      const target = err.meta?.target as string[] | undefined
      const field = target ? target.join(', ') : 'field'
      return {
        statusCode: 409,
        message: `A record with this ${field} already exists`,
      }
    case 'P2025':
      return {
        statusCode: 404,
        message: 'Record not found',
      }
    case 'P2003':
      return {
        statusCode: 400,
        message: 'Invalid reference to related record',
      }
    case 'P2014':
      return {
        statusCode: 400,
        message: 'Invalid relation data',
      }
    case 'P2001':
      return {
        statusCode: 404,
        message: 'Record not found',
      }
    case 'P2018':
      return {
        statusCode: 404,
        message: 'Record not found',
      }
    case 'P2021':
      return {
        statusCode: 500,
        message: 'Database table not found',
      }
    case 'P2022':
      return {
        statusCode: 500,
        message: 'Database column not found',
      }
    default:
      return {
        statusCode: 500,
        message: 'Database error',
      }
  }
}

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    status: 'error',
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  })
}

export default errorHandler

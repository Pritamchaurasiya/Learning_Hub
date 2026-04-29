/**
 * Global Error Handler — Catches errors with recovery strategies
 */

import { logger } from './logger.js';
import { bus } from './event-bus.js';

const errorHandlers = new Map();

function init() {
  // Global unhandled errors
  window.addEventListener('error', (event) => {
    logger.error('Unhandled error', {
      message: event.message,
      filename: event.filename,
      line: event.lineno,
      col: event.colno
    });
    bus.emit('error:global', event.error);
    event.preventDefault();
  });

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection', {
      reason: event.reason?.message || String(event.reason)
    });
    bus.emit('error:promise', event.reason);
    event.preventDefault();
  });

  logger.info('Error handler initialized');
}

function register(errorType, handler) {
  errorHandlers.set(errorType, handler);
}

function handle(error, context = '') {
  const errorInfo = {
    message: error?.message || String(error),
    stack: error?.stack,
    context,
    timestamp: new Date().toISOString()
  };

  logger.error(`Error in ${context}: ${errorInfo.message}`);

  // Check for registered handler
  const handler = errorHandlers.get(error?.constructor?.name) || errorHandlers.get('default');
  if (handler) {
    try {
      return handler(error, context);
    } catch (handlerError) {
      logger.error('Error in error handler', { handlerError: handlerError.message });
    }
  }

  bus.emit('error:handled', errorInfo);
  return null;
}

function wrap(fn, context = 'unknown') {
  return function (...args) {
    try {
      const result = fn.apply(this, args);
      if (result instanceof Promise) {
        return result.catch(err => handle(err, context));
      }
      return result;
    } catch (err) {
      return handle(err, context);
    }
  };
}

export const errorHandler = { init, register, handle, wrap };

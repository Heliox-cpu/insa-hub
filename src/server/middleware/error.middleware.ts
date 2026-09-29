import type { Request, Response, NextFunction } from 'express';
import { sanitizeData, sanitizeUrl } from '../utils/sanitize.utils.js';

export interface HttpError extends Error {
  status?: number;
  statusCode?: number;
  details?: unknown;
}

export function errorHandler(
  err: HttpError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const statusCode = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Log error with sanitized details
  if (process.env.NODE_ENV !== 'test' || process.env.DEBUG) {
    console.error(`[ERROR] ${req.method} ${sanitizeUrl(req.originalUrl)}:`, {
      message: err.message,
      statusCode,
      stack: isProduction ? undefined : err.stack,
      details: sanitizeData(err.details),
    });
  }

  res.status(statusCode).json({
    error: statusCode >= 500 && isProduction ? 'Internal Server Error' : err.message || 'An error occurred',
    statusCode,
    timestamp: new Date().toISOString(),
    ...(isProduction ? {} : { details: sanitizeData(err.details) }),
  });
}

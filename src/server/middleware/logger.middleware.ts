import type { Request, Response, NextFunction } from 'express';
import { sanitizeUrl } from '../utils/sanitize.utils.js';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const safeUrl = sanitizeUrl(req.originalUrl || req.url);

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const color = statusCode >= 500 ? '\x1b[31m' : statusCode >= 400 ? '\x1b[33m' : '\x1b[32m';
    const reset = '\x1b[0m';
    
    // In test environment, keep stdout clean unless DEBUG is set
    if (process.env.NODE_ENV !== 'test' || process.env.DEBUG) {
      console.log(
        `[${new Date().toISOString()}] ${req.method} ${safeUrl} ${color}${statusCode}${reset} - ${duration}ms`
      );
    }
  });

  next();
}

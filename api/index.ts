import type { Request, Response } from 'express';
import { createApp } from '../src/server/app.js';

const app = createApp();

export default function handler(req: Request, res: Response) {
  // Normalize req.url so Express routes mounted at /api/* always match
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
}

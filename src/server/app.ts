import express, { type Application } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { requestLogger } from './middleware/logger.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { adeRouter } from './routes/ade.routes.js';
import { diningRouter } from './routes/dining.routes.js';
import { vaRouter } from './routes/va.routes.js';
import { mdwRouter } from './routes/mdw.routes.js';
import { sanitizeUrl } from './utils/sanitize.utils.js';

export interface AppOptions {
  clientDistPath?: string;
  corsOrigin?: boolean | string | RegExp | (string | RegExp)[];
}

export function createApp(options: AppOptions = {}): Application {
  const app = express();

  // 1. Security & CORS configuration
  app.use(
    cors({
      origin: options.corsOrigin ?? true,
      credentials: true,
    })
  );

  // 2. Request body parsers
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 3. Sanitized request logging
  app.use(requestLogger);

  // 4. Core Healthcheck Endpoint
  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'insa-campus-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // 5. Skeleton API Router Mounts
  app.use('/api/ade', adeRouter);
  app.use('/api/menus', diningRouter);
  app.use('/api/dining', diningRouter); // Alias for full contract compatibility
  app.use('/api/va', vaRouter);
  app.use('/api/mdw', mdwRouter);

  // 6. Explicit 404 for unhandled API requests (prevents SPA HTML fallthrough)
  app.use('/api', (req, res) => {
    res.status(404).json({
      error: 'Endpoint not found',
      path: sanitizeUrl(req.originalUrl),
      timestamp: new Date().toISOString(),
    });
  });

  // 7. Static Asset Serving & SPA Fallback
  const clientDist = options.clientDistPath || path.resolve(process.cwd(), 'dist/client');
  const hasClientBuild = fs.existsSync(clientDist) && fs.existsSync(path.join(clientDist, 'index.html'));

  if (hasClientBuild) {
    app.use(express.static(clientDist, { index: false }));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  } else {
    // Development / Headless Fallback
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.status(200).send(`
        <!DOCTYPE html>
        <html lang="fr">
          <head>
            <meta charset="UTF-8" />
            <title>INSA Lyon Campus Hub API</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 2rem; background: #0f172a; color: #f8fafc; }
              .card { max-width: 600px; margin: 0 auto; background: #1e293b; padding: 2rem; border-radius: 8px; border-left: 4px solid #e11d48; }
              h1 { color: #f43f5e; margin-top: 0; }
              a { color: #38bdf8; }
              code { background: #334155; padding: 0.2rem 0.4rem; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>INSA Lyon Campus Hub Server</h1>
              <p>Backend API server is operational in development / headless mode.</p>
              <p>Frontend static assets not yet compiled in <code>dist/client</code>.</p>
              <p>Healthcheck: <a href="/api/health"><code>/api/health</code></a></p>
            </div>
          </body>
        </html>
      `);
    });
  }

  // 8. Global Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}

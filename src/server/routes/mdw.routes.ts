import { Router, Request, Response, NextFunction } from 'express';
import {
  initCasMfaSession,
  initCasSessionAsync,
  verifyCasMfaChallenge,
  verifyCasMfaChallengeAsync,
  parseApogeeHtml,
  getSampleAcademicRecord,
} from '../services/mdw.service.js';

export const mdwRouter = Router();

/**
 * GET /api/mdw
 * Service metadata
 */
mdwRouter.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    service: 'mdw',
    status: 'ok',
    message: 'MonDossierWeb Apogée & CAS/MFA service operational',
    endpoints: [
      { path: '/api/mdw/auth/init', method: 'POST', description: 'Initialize CAS login and prompt MFA TOTP' },
      { path: '/api/mdw/auth/verify', method: 'POST', description: 'Submit 6-digit TOTP challenge and fetch grades' },
      { path: '/api/mdw/parse-html', method: 'POST', description: 'Parse raw Apogée HTML markup' },
      { path: '/api/mdw/grades', method: 'GET', description: 'Retrieve student academic transcript' },
    ],
  });
});

/**
 * POST /api/mdw/auth/init
 * Body: { username: string, password?: string }
 * Note: Password is NEVER saved or persisted.
 */
mdwRouter.post('/auth/init', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
    if (!username || typeof username !== 'string' || username.trim() === '') {
      res.status(400).json({
        error: 'Bad Request',
        message: "L'identifiant étudiant (username) est requis",
      });
      return;
    }

    const sessionInit = await initCasSessionAsync(username, password);
    res.status(200).json({
      success: true,
      ...sessionInit,
    });
  } catch (error: any) {
    if (error.statusCode === 401) {
      res.status(401).json({
        error: 'Unauthorized',
        message: error.message || 'Identifiant ou mot de passe incorrect',
      });
      return;
    }
    next(error);
  }
});


/**
 * POST /api/mdw/auth/verify
 * Body: { flowId: string, totpCode: string }
 */
mdwRouter.post('/auth/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { flowId, totpCode } = req.body;

    if (!flowId || typeof flowId !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Identifiant de session (flowId) manquant ou invalide',
      });
      return;
    }

    if (!totpCode || typeof totpCode !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Code TOTP à 6 chiffres manquant',
      });
      return;
    }

    const verification = await verifyCasMfaChallengeAsync(flowId, totpCode);

    if (!verification.success) {
      res.status(400).json({
        success: false,
        error: 'Authentication Failed',
        message: verification.error,
      });
      return;
    }

    res.status(200).json({
      success: true,
      step: 'COMPLETED',
      message: 'Authentification CAS + défi MFA TOTP validés avec succès',
      data: verification.record,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/mdw/parse-html
 * Body: { html: string }
 */
mdwRouter.post('/parse-html', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { html } = req.body;
    if (!html || typeof html !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Contenu HTML Apogée manquant dans le corps de la requête',
      });
      return;
    }

    const record = parseApogeeHtml(html);
    res.status(200).json({
      success: true,
      data: record,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/mdw/grades
 * Retrieve academic record (sample / cached)
 */
mdwRouter.get('/grades', (_req: Request, res: Response) => {
  const record = getSampleAcademicRecord();
  res.status(200).json({
    success: true,
    source: 'sample',
    data: record,
  });
});


import { Router, Request, Response, NextFunction } from 'express';
import {
  fetchAdeFeed,
  filterAdeEvents,
  detectFreeSlots,
  parseAdeIcal,
  toParisIsoString,
} from '../services/ade.service.js';

export const adeRouter = Router();

/**
 * GET /api/ade
 * Service metadata and status
 */
adeRouter.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    service: 'ade',
    status: 'ok',
    message: 'ADE Planning service operational',
    endpoints: [
      { path: '/api/ade', method: 'GET', description: 'Service status' },
      { path: '/api/ade/events', method: 'GET', description: 'Retrieve and filter ADE calendar events' },
      { path: '/api/ade/free-slots', method: 'GET', description: 'Detect free study/lunch slots for a given date' },
      { path: '/api/ade/parse', method: 'POST', description: 'Directly parse arbitrary ICS content' },
    ],
  });
});

/**
 * GET /api/ade/events
 * Query parameters:
 *  - url | feedUrl: URL of the ADE subscription feed
 *  - startDate: ISO or YYYY-MM-DD filter
 *  - endDate: ISO or YYYY-MM-DD filter
 *  - courseTypes: comma-separated list (CM,TD,TP,EVAL)
 *  - subjectCode: text match
 *  - department: e.g. "IF", "TC"
 */
adeRouter.get('/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const feedUrl = (req.query.url as string) || (req.query.feedUrl as string) || undefined;
    const startDate = (req.query.startDate as string) || undefined;
    const endDate = (req.query.endDate as string) || undefined;
    const subjectCode = (req.query.subjectCode as string) || undefined;
    const department = (req.query.department as string) || undefined;
    const courseTypes = req.query.courseTypes
      ? (req.query.courseTypes as string).split(',').map((s) => s.trim().toUpperCase())
      : undefined;

    const { events, source, fetchedAt } = await fetchAdeFeed(feedUrl);

    const filtered = filterAdeEvents(events, {
      startDate,
      endDate,
      courseTypes,
      subjectCode,
      department,
    });

    res.status(200).json({
      success: true,
      count: filtered.length,
      source,
      fetchedAt,
      data: filtered,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ade/free-slots
 * Query parameters:
 *  - date: YYYY-MM-DD (defaults to today in Europe/Paris)
 *  - url | feedUrl: ADE subscription feed
 *  - startHour: number (default 8)
 *  - endHour: number (default 18)
 */
adeRouter.get('/free-slots', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const feedUrl = (req.query.url as string) || (req.query.feedUrl as string) || undefined;
    const dateParam = (req.query.date as string) || toParisIsoString(new Date()).slice(0, 10);
    const startHour = req.query.startHour ? parseInt(req.query.startHour as string, 10) : 8;
    const endHour = req.query.endHour ? parseInt(req.query.endHour as string, 10) : 18;

    const { events, source } = await fetchAdeFeed(feedUrl);
    const freeSlots = detectFreeSlots(events, dateParam, startHour, endHour);

    res.status(200).json({
      success: true,
      date: dateParam,
      source,
      count: freeSlots.length,
      data: freeSlots,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ade/parse
 * Body: { icsContent: string }
 */
adeRouter.post('/parse', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { icsContent } = req.body;
    if (!icsContent || typeof icsContent !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'icsContent string is required in request body',
      });
      return;
    }

    const events = parseAdeIcal(icsContent);
    res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    next(error);
  }
});


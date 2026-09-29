import { Router, Request, Response, NextFunction } from 'express';
import {
  fetchVaEvents,
  fetchVaDirectory,
  filterVaEvents,
} from '../services/va.service.js';

export const vaRouter = Router();

/**
 * GET /api/va
 * Service metadata
 */
vaRouter.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    service: 'va',
    status: 'ok',
    message: 'Portail Vie Associative proxy operational',
    endpoints: [
      { path: '/api/va/events', method: 'GET', description: 'List student life events with filtering' },
      { path: '/api/va/directory', method: 'GET', description: 'Directory of INSA student associations' },
      { path: '/api/va/categories', method: 'GET', description: 'List available event categories' },
    ],
  });
});

/**
 * GET /api/va/events
 * Query parameters:
 *  - category: filter by category
 *  - search | q: text search in title, association, description, location
 *  - upcomingOnly: 'true' to exclude past events
 *  - refresh: 'true' to force cache bypass
 */
vaRouter.get('/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const category = req.query.category as string | undefined;
    const searchQuery = ((req.query.search || req.query.q) as string) || undefined;
    const upcomingOnly = req.query.upcomingOnly === 'true';

    const { events, source, fetchedAt } = await fetchVaEvents(forceRefresh);

    const filtered = filterVaEvents(events, {
      category,
      searchQuery,
      upcomingOnly,
    });

    res.status(200).json({
      success: true,
      service: 'va',
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
 * GET /api/va/directory
 * Query parameters:
 *  - search | q: search query for associations
 *  - category: filter by association category
 *  - refresh: 'true' to force cache bypass
 */
vaRouter.get('/directory', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const searchQuery = (((req.query.search || req.query.q) as string) || '').toLowerCase();
    const category = req.query.category as string | undefined;

    const { directory, source, fetchedAt } = await fetchVaDirectory(forceRefresh);

    let filtered = directory;
    if (category) {
      filtered = filtered.filter((a) => a.category.toLowerCase() === category.toLowerCase());
    }
    if (searchQuery) {
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(searchQuery) ||
          (a.shortName && a.shortName.toLowerCase().includes(searchQuery)) ||
          a.description.toLowerCase().includes(searchQuery)
      );
    }

    res.status(200).json({
      success: true,
      service: 'va',
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
 * GET /api/va/categories
 * List of available event categories
 */
vaRouter.get('/categories', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const standardCategories = [
      'Animation',
      'Atelier',
      'Conférence',
      'Culture',
      'Humanitaire',
      'Soirée',
      'Sport',
      'Technique & Sciences',
      'Autre',
    ];
    const { events } = await fetchVaEvents();
    const dynamic = events.map((e) => e.category).filter(Boolean);
    const categories = Array.from(new Set([...standardCategories, ...dynamic])).sort();

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
});



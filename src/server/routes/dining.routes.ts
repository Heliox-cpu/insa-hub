import { Router, Request, Response, NextFunction } from 'express';
import {
  fetchCampusRestaurants,
  filterDiningMenus,
  calculateAffluence,
} from '../services/dining.service.js';
import type { DietaryLabel, RestaurantId } from '../../shared/types/dining.types.js';

export const diningRouter = Router();

/**
 * GET /api/dining or /api/menus
 * Returns all campus restaurants, current menus, and affluence levels.
 * Query filters:
 *  - restaurantId: 'ri' | 'olivier' | 'puvis' | 'astree' | 'archimede'
 *  - labels: comma-separated list of DietaryLabel (e.g. VEG,BIO,VF)
 *  - mealType: 'lunch' | 'dinner'
 *  - refresh: 'true' to bypass cache
 */
diningRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const restaurantId = req.query.restaurantId as RestaurantId | undefined;
    const mealType = req.query.mealType as ('lunch' | 'dinner') | undefined;
    const labelsParam = req.query.labels as string | undefined;
    const labels = labelsParam
      ? (labelsParam.split(',').map((l) => l.trim().toUpperCase()) as DietaryLabel[])
      : undefined;

    const { restaurants, source, fetchedAt } = await fetchCampusRestaurants(forceRefresh);

    const filtered = filterDiningMenus(restaurants, {
      restaurantId,
      mealType,
      labels,
    });

    res.status(200).json({
      status: 'ok',
      service: 'dining',
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
 * GET /api/dining/restaurants/:id
 * Retrieve detailed menu for a specific restaurant
 */
diningRouter.get('/restaurants/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as RestaurantId;
    const { restaurants, source, fetchedAt } = await fetchCampusRestaurants();
    const restaurant = restaurants.find((r) => r.id.toLowerCase() === id.toLowerCase());

    if (!restaurant) {
      res.status(404).json({
        error: 'Not Found',
        message: `Restaurant with id '${id}' not found. Valid IDs: ri, olivier, puvis, archimede, astree`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      source,
      fetchedAt,
      data: restaurant,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dining/affluence
 * Quick check for real-time affluence and line wait times across all campus restaurants
 */
diningRouter.get('/affluence', (_req: Request, res: Response) => {
  const restaurants: RestaurantId[] = ['ri', 'olivier', 'puvis', 'archimede', 'astree'];
  const now = new Date();

  const affluenceData = restaurants.map((id) => {
    const aff = calculateAffluence(id, now);
    return {
      restaurantId: id,
      level: aff.level,
      description: aff.description,
      checkedAt: now.toISOString(),
    };
  });

  res.status(200).json({
    success: true,
    data: affluenceData,
  });
});


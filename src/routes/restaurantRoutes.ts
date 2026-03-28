import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import { validate, rateLimits, validateInputLength } from '../middleware/validation.js';
import { restaurantCacheMiddleware, browserCacheValidation, cacheInvalidationMiddleware } from '../middleware/cache.js';
import { restaurantSchemas, paramSchemas, querySchemas, reviewSchemas } from '../utils/validators.js';
import {
    getRestaurants,
    getRestaurantById,
    createRestaurant,
    updateRestaurant,
    addReviewToRestaurant,
    deleteRestaurant,
    getTopRatedRestaurants,
    getNearbyRestaurants,
    getRestaurantReviews,
    getRestaurantReviewStats,
} from '../controllers/restaurantControllers.js';
import { createReviewForRestaurant } from '../controllers/reviewControllers.js';

const router = express.Router();

// Apply browser cache validation to all GET routes
router.use(browserCacheValidation());

// Public routes with rate limiting and search validation
router.get(
    '/',
    rateLimits.search,
    validate({ query: querySchemas.geospatial }),
    restaurantCacheMiddleware(),
    getRestaurants
);

router.get(
    '/top-rated',
    rateLimits.api,
    validate({ query: querySchemas.search }),
    restaurantCacheMiddleware(),
    getTopRatedRestaurants
);

router.get(
    '/nearby',
    rateLimits.search,
    validate({ query: querySchemas.geospatial }),
    restaurantCacheMiddleware(),
    getNearbyRestaurants
);

router.get(
    '/:id',
    rateLimits.api,
    validate({ params: paramSchemas.id }),
    restaurantCacheMiddleware(),
    getRestaurantById
);

// Protected routes with validation
router.post(
    '/',
    rateLimits.api,
    validateInputLength(8192), // 8KB limit for restaurant creation
    protect,
    validate({ body: restaurantSchemas.create }),
    cacheInvalidationMiddleware(['restaurants', 'listings']),
    createRestaurant
);

// Legacy review route (kept for backward compatibility)
router.post(
    '/add-review/:id',
    rateLimits.api,
    validateInputLength(2048), // 2KB limit for reviews
    protect,
    validate({
        params: paramSchemas.id,
        body: reviewSchemas.create,
    }),
    addReviewToRestaurant
);

router.put(
    '/:id',
    rateLimits.api,
    validateInputLength(8192), // 8KB limit for restaurant updates
    protect,
    admin,
    validate({
        params: paramSchemas.id,
        body: restaurantSchemas.update,
    }),
    updateRestaurant
);

router.delete('/:id', rateLimits.api, protect, admin, validate({ params: paramSchemas.id }), deleteRestaurant);

// Review routes for restaurants
router.post(
    '/:restaurantId/reviews',
    rateLimits.api,
    validateInputLength(2048),
    protect,
    validate({
        params: paramSchemas.restaurantId,
        body: reviewSchemas.create,
    }),
    createReviewForRestaurant
);

router.get(
    '/:restaurantId/reviews',
    rateLimits.api,
    validate({ params: paramSchemas.restaurantId }),
    getRestaurantReviews
);

router.get(
    '/:restaurantId/reviews/stats',
    rateLimits.api,
    validate({ params: paramSchemas.restaurantId }),
    getRestaurantReviewStats
);

export default router;

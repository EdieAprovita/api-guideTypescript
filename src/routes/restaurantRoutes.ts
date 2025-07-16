import express from 'express';
import { protect, admin } from '../middleware/authMiddleware';
import { validate, sanitizeInput, rateLimits, securityHeaders, validateInputLength } from '../middleware/validation';
import { restaurantSchemas, paramSchemas, querySchemas, reviewSchemas } from '../utils/validators';
import {
    getRestaurants,
    getRestaurantById,
    createRestaurant,
    updateRestaurant,
    addReviewToRestaurant,
    deleteRestaurant,
    getTopRatedRestaurants,
} from '../controllers/restaurantControllers';
import { createReviewForRestaurant } from '../controllers/reviewControllers';
import { reviewService as ReviewService } from '../services/ReviewService';
import { restaurantService as RestaurantService } from '../services/RestaurantService';
import asyncHandler from '../middleware/asyncHandler';
import { HttpError, HttpStatusCode } from '../types/Errors';

const router = express.Router();

// Apply security headers and sanitization to all routes
router.use(securityHeaders);
router.use(...sanitizeInput());

// Public routes with rate limiting and search validation
router.get('/', rateLimits.search, validate({ query: querySchemas.geospatial }), getRestaurants);

router.get('/top-rated', rateLimits.api, validate({ query: querySchemas.search }), getTopRatedRestaurants);

router.get('/:id', rateLimits.api, validate({ params: paramSchemas.id }), getRestaurantById);

// Protected routes with validation
router.post(
    '/',
    rateLimits.api,
    validateInputLength(8192), // 8KB limit for restaurant creation
    protect,
    validate({ body: restaurantSchemas.create }),
    createRestaurant
);

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
        body: restaurantSchemas.create,
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
        body: reviewSchemas.create
    }),
    createReviewForRestaurant
);

router.get(
    '/:restaurantId/reviews',
    rateLimits.api,
    validate({ params: paramSchemas.restaurantId }),
    asyncHandler(async (req, res) => {
        const { restaurantId } = req.params;
        const { page = 1, limit = 10, rating, sort = '-createdAt' } = req.query;

        if (!restaurantId) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Restaurant ID is required');
        }

        // Check if restaurant exists
        const restaurant = await RestaurantService.findById(restaurantId);
        if (!restaurant) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, 'Restaurant not found');
        }

        const reviews = await ReviewService.getReviewsByRestaurant(
            restaurantId,
            {
                page: Number(page),
                limit: Number(limit),
                ...(rating && { rating: Number(rating) }),
                sort: String(sort)
            }
        );

        res.status(200).json({
            success: true,
            data: reviews.data,
            pagination: reviews.pagination
        });
    })
);

router.get(
    '/:restaurantId/reviews/stats',
    rateLimits.api,
    validate({ params: paramSchemas.restaurantId }),
    asyncHandler(async (req, res) => {
        const { restaurantId } = req.params;

        if (!restaurantId) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Restaurant ID is required');
        }

        // Check if restaurant exists
        const restaurant = await RestaurantService.findById(restaurantId);
        if (!restaurant) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, 'Restaurant not found');
        }

        const stats = await ReviewService.getReviewStats(restaurantId);

        res.status(200).json({
            success: true,
            data: stats
        });
    })
);

export default router;

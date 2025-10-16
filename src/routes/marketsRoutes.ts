import express from 'express';
import { protect, admin } from '../middleware/authMiddleware';
import { validate, rateLimits, validateInputLength } from '../middleware/validation';
import { paramSchemas, reviewSchemas } from '../utils/validators';
import {
    getMarkets,
    getMarketById,
    createMarket,
    updateMarket,
    addReviewToMarket,
    getMarketReviews,
    getMarketReviewStats,
    deleteMarket,
} from '../controllers/marketsControllers';

const router = express.Router();

router.get('/', getMarkets);
router.get('/:id', getMarketById);

router.post('/', protect, createMarket);

// Standardized review routes (new OpenAPI 3.0 compliant paths)
router.post(
    '/:id/reviews',
    rateLimits.api,
    protect,
    validateInputLength(2048),
    validate({
        params: paramSchemas.marketId,
        body: reviewSchemas.create,
    }),
    addReviewToMarket
);

// Legacy review route (kept for backward compatibility)
router.post(
    '/add-review/:id',
    rateLimits.api,
    protect,
    validateInputLength(2048),
    validate({
        params: paramSchemas.marketId,
        body: reviewSchemas.create,
    }),
    addReviewToMarket
);
router.get('/:id/reviews', rateLimits.api, validate({ params: paramSchemas.marketId }), getMarketReviews);
router.get('/:id/reviews/stats', rateLimits.api, validate({ params: paramSchemas.marketId }), getMarketReviewStats);

router.put('/:id', protect, admin, updateMarket);
router.delete('/:id', protect, admin, deleteMarket);

export default router;

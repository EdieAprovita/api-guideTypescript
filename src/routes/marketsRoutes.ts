import express from 'express';
import { protect, admin } from '../middleware/authMiddleware';
import { validate, rateLimits } from '../middleware/validation';
import { paramSchemas } from '../utils/validators';
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
import { registerLegacyRoutes } from '../utils/registerLegacyRoutes';

const router = express.Router();

router.get('/', getMarkets);
router.get('/:id', getMarketById);

// Deprecated action routes are kept for legacy clients and will be removed in
// the next major version.
registerLegacyRoutes(router, {
    create: createMarket,
    update: updateMarket,
    remove: deleteMarket,
});

router.post('/', protect, createMarket);
// Legacy route - kept for compatibility, will be removed in Phase 9
router.post('/add-review/:id', rateLimits.api, protect, addReviewToMarket);

// Review routes
router.post('/:id/reviews', rateLimits.api, protect, validate({ params: paramSchemas.marketId }), addReviewToMarket);
router.get('/:id/reviews', rateLimits.api, validate({ params: paramSchemas.marketId }), getMarketReviews);
router.get('/:id/reviews/stats', rateLimits.api, validate({ params: paramSchemas.marketId }), getMarketReviewStats);

router.put('/:id', protect, admin, updateMarket);
router.delete('/:id', protect, admin, deleteMarket);

export default router;

import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import { browserCacheValidation, businessCacheMiddleware } from '../middleware/cache.js';
import { validate, rateLimits, validateInputLength } from '../middleware/validation.js';
import { paramSchemas, reviewSchemas } from '../utils/validators.js';
import {
    getBusinesses,
    getBusinessById,
    createBusiness,
    updateBusiness,
    addReviewToBusiness,
    deleteBusiness,
    getNearbyBusinesses,
    searchBusinesses,
} from '../controllers/businessControllers.js';

const router = express.Router();

// Apply browser cache validation to all GET routes
router.use(browserCacheValidation());

// Phase 1: Geospatial + search routes (must be before /:id to avoid param collision)
router.get('/nearby', getNearbyBusinesses);
router.get('/search', searchBusinesses);

router.get('/', businessCacheMiddleware(), getBusinesses);
router.get('/:id', businessCacheMiddleware(), getBusinessById);
router.post('/', protect, createBusiness);

// Standardized review routes (new OpenAPI 3.0 compliant paths)
router.post(
    '/:id/reviews',
    rateLimits.api,
    protect,
    validateInputLength(2048),
    validate({
        params: paramSchemas.id,
        body: reviewSchemas.create,
    }),
    addReviewToBusiness
);

// Legacy review route (kept for backward compatibility)
router.post(
    '/add-review/:id',
    rateLimits.api,
    protect,
    validateInputLength(2048),
    validate({
        params: paramSchemas.id,
        body: reviewSchemas.create,
    }),
    addReviewToBusiness
);

router.put('/:id', protect, admin, updateBusiness);
router.delete('/:id', protect, admin, deleteBusiness);

export default router;

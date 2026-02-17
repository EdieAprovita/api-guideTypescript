import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import { validate, rateLimits, validateInputLength } from '../middleware/validation.js';
import { paramSchemas, reviewSchemas, querySchemas } from '../utils/validators.js';
import {
    getSanctuaries,
    getSanctuaryById,
    createSanctuary,
    updateSanctuary,
    deleteSanctuary,
    addReviewToSanctuary,
    getNearbySanctuaries,
} from '../controllers/sanctuaryControllers.js';

const router = express.Router();

router.get('/', getSanctuaries);
router.get('/nearby', rateLimits.search, validate({ query: querySchemas.geospatial }), getNearbySanctuaries);
router.get('/:id', getSanctuaryById);
router.post('/', protect, createSanctuary);

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
    addReviewToSanctuary
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
    addReviewToSanctuary
);

router.put('/:id', protect, admin, updateSanctuary);
router.delete('/:id', protect, admin, deleteSanctuary);

export default router;

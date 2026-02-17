import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import { validate, rateLimits, validateInputLength } from '../middleware/validation.js';
import { paramSchemas, reviewSchemas, querySchemas } from '../utils/validators.js';
import {
    getProfessions,
    getProfessionById,
    createProfession,
    addReviewToProfession,
    updateProfession,
    deleteProfession,
    getNearbyProfessions,
} from '../controllers/professionControllers.js';

const router = express.Router();

router.get('/', getProfessions);
router.get('/nearby', rateLimits.search, validate({ query: querySchemas.geospatial }), getNearbyProfessions);
router.get('/:id', getProfessionById);
router.post('/', protect, createProfession);

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
    addReviewToProfession
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
    addReviewToProfession
);

router.put('/:id', protect, admin, updateProfession);
router.delete('/:id', protect, admin, deleteProfession);

export default router;

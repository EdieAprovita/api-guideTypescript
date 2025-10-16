import express from 'express';
import { protect, admin } from '../middleware/authMiddleware';
import { validate, rateLimits, validateInputLength } from '../middleware/validation';
import { paramSchemas, reviewSchemas } from '../utils/validators';
import {
    getProfessions,
    getProfessionById,
    createProfession,
    addReviewToProfession,
    updateProfession,
    deleteProfession,
} from '../controllers/professionControllers';

const router = express.Router();

router.get('/', getProfessions);
router.get('/:id', getProfessionById);
router.post('/', protect, createProfession);

// Standardized review routes (new OpenAPI 3.0 compliant paths)
router.post(
    '/:id/reviews',
    rateLimits.api,
    validateInputLength(2048),
    protect,
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
    validateInputLength(2048),
    protect,
    validate({
        params: paramSchemas.id,
        body: reviewSchemas.create,
    }),
    addReviewToProfession
);

router.put('/:id', protect, admin, updateProfession);
router.delete('/:id', protect, admin, deleteProfession);

export default router;

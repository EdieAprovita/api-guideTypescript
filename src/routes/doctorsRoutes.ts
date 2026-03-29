import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import { validate, rateLimits, validateInputLength, validateObjectId } from '../middleware/validation.js';
import { paramSchemas, reviewSchemas, querySchemas } from '../utils/validators.js';
import {
    getDoctors,
    getDoctorById,
    createDoctor,
    updateDoctor,
    addReviewToDoctor,
    deleteDoctor,
    getNearbyDoctors,
} from '../controllers/doctorsControllers.js';

const router = express.Router();

router.get('/', getDoctors);
router.get('/nearby', rateLimits.search, validate({ query: querySchemas.geospatial }), getNearbyDoctors);
router.get('/:id', validateObjectId(), getDoctorById);

router.post('/', protect, createDoctor);

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
    addReviewToDoctor
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
    addReviewToDoctor
);

router.put('/:id', protect, admin, validateObjectId(), updateDoctor);
router.delete('/:id', protect, admin, validateObjectId(), deleteDoctor);

export default router;

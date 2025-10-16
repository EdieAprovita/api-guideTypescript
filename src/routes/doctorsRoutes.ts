import express from 'express';
import { protect, admin } from '../middleware/authMiddleware';
import { validate, rateLimits, validateInputLength } from '../middleware/validation';
import { paramSchemas, reviewSchemas } from '../utils/validators';
import {
    getDoctors,
    getDoctorById,
    createDoctor,
    updateDoctor,
    addReviewToDoctor,
    deleteDoctor,
} from '../controllers/doctorsControllers';

const router = express.Router();

router.get('/', getDoctors);
router.get('/:id', getDoctorById);

router.post('/', protect, createDoctor);

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
    addReviewToDoctor
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
    addReviewToDoctor
);

router.put('/:id', protect, admin, updateDoctor);
router.delete('/:id', protect, admin, deleteDoctor);

export default router;

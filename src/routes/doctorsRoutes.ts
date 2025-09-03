import express from 'express';
import { protect, admin } from '../middleware/authMiddleware';
import { rateLimits } from '../middleware/validation';
import {
    getDoctors,
    getDoctorById,
    createDoctor,
    updateDoctor,
    addReviewToDoctor,
    deleteDoctor,
} from '../controllers/doctorsControllers';
import { registerLegacyRoutes } from '../utils/registerLegacyRoutes';

const router = express.Router();

router.get('/', getDoctors);
router.get('/:id', getDoctorById);

// Deprecated action routes are kept for legacy clients and will be removed in
// the next major version.
registerLegacyRoutes(router, {
    create: createDoctor,
    update: updateDoctor,
    remove: deleteDoctor,
});

router.post('/', protect, createDoctor);
router.post('/add-review/:id', rateLimits.api, protect, addReviewToDoctor);
router.put('/:id', protect, admin, updateDoctor);
router.delete('/:id', protect, admin, deleteDoctor);

export default router;

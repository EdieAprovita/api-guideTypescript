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

const router = express.Router();

router.get('/', getDoctors);
router.get('/:id', getDoctorById);

router.post('/', protect, createDoctor);
router.post('/add-review/:id', rateLimits.api, protect, addReviewToDoctor);
router.put('/:id', protect, admin, updateDoctor);
router.delete('/:id', protect, admin, deleteDoctor);

export default router;

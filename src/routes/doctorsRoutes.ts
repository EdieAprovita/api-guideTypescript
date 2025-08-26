import express from 'express';
import { protect, admin } from '../middleware/authMiddleware';
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
router.post('/add-review/:id', protect, addReviewToDoctor);
router.put('/:id', protect, admin, updateDoctor);
router.delete('/:id', protect, admin, deleteDoctor);

export default router;

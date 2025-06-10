import express from 'express';
import { protect, professional, admin } from '../middleware/authMiddleware';
import {
    getProfessionsProfile,
    getProfessionProfileById,
    createProfessionProfile,
    updateProfessionProfile,
    deleteProfessionProfile,
} from '../controllers/professionProfileController';

const router = express.Router();

router.get('/', getProfessionsProfile);
router.get('/:id', getProfessionProfileById);
router.post('/', protect, professional, createProfessionProfile);
router.put('/:id', protect, professional, updateProfessionProfile);
router.delete('/:id', protect, professional, admin, deleteProfessionProfile);

export default router;

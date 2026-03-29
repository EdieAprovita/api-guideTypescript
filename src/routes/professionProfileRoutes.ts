import express from 'express';
import { protect, professional, admin } from '../middleware/authMiddleware.js';
import { validateObjectId } from '../middleware/validation.js';
import {
    getProfessionsProfile,
    getProfessionProfileById,
    createProfessionProfile,
    updateProfessionProfile,
    deleteProfessionProfile,
} from '../controllers/professionProfileController.js';

const router = express.Router();

router.get('/', getProfessionsProfile);
router.get('/:id', validateObjectId(), getProfessionProfileById);
router.post('/', protect, professional, createProfessionProfile);
router.put('/:id', protect, professional, validateObjectId(), updateProfessionProfile);
router.delete('/:id', protect, professional, admin, validateObjectId(), deleteProfessionProfile);

export default router;

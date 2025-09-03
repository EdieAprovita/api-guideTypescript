import express from 'express';
import { protect, admin } from '../middleware/authMiddleware';
import { rateLimits } from '../middleware/validation';
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
router.post('/add-review/:id', rateLimits.api, protect, addReviewToProfession);
router.put('/:id', protect, admin, updateProfession);
router.delete('/:id', protect, admin, deleteProfession);

export default router;

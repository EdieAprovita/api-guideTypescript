import express from 'express';
import { protect, admin } from '../middleware/authMiddleware';
import { rateLimits } from '../middleware/validation';
import {
    getSanctuaries,
    getSanctuaryById,
    createSanctuary,
    updateSanctuary,
    deleteSanctuary,
    addReviewToSanctuary,
} from '../controllers/sanctuaryControllers';

const router = express.Router();

router.get('/', getSanctuaries);
router.get('/:id', getSanctuaryById);
router.post('/', protect, createSanctuary);

// Standardized review routes (new OpenAPI 3.0 compliant paths)
router.post('/:id/reviews', rateLimits.api, protect, addReviewToSanctuary);

// Legacy review route (kept for backward compatibility)
router.post('/add-review/:id', rateLimits.api, protect, addReviewToSanctuary);

router.put('/:id', protect, admin, updateSanctuary);
router.delete('/:id', protect, admin, deleteSanctuary);

export default router;

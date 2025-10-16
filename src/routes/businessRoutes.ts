import express from 'express';
import { protect, admin } from '../middleware/authMiddleware';
import { browserCacheValidation, businessCacheMiddleware } from '../middleware/cache';
import { rateLimits } from '../middleware/validation';
import {
    getBusinesses,
    getBusinessById,
    createBusiness,
    updateBusiness,
    addReviewToBusiness,
    deleteBusiness,
} from '../controllers/businessControllers';

const router = express.Router();

// Apply browser cache validation to all GET routes
router.use(browserCacheValidation());

router.get('/', businessCacheMiddleware(), getBusinesses);
router.get('/:id', businessCacheMiddleware(), getBusinessById);
router.post('/', protect, createBusiness);

// Standardized review routes (new OpenAPI 3.0 compliant paths)
router.post('/:id/reviews', rateLimits.api, protect, addReviewToBusiness);

// Legacy review route (kept for backward compatibility)
router.post('/add-review/:id', rateLimits.api, protect, addReviewToBusiness);

router.put('/:id', protect, admin, updateBusiness);
router.delete('/:id', protect, admin, deleteBusiness);

export default router;

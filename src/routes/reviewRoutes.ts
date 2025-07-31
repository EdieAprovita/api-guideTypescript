import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { validate, sanitizeInput, rateLimits, securityHeaders, validateInputLength } from '../middleware/validation';
import { reviewSchemas, paramSchemas } from '../utils/validators';
import {
    getReviewById,
    updateReview,
    deleteReview
} from '../controllers/reviewControllers';
import { reviewService as ReviewService } from '../services/ReviewService';
// import { restaurantService as RestaurantService } from '../services/RestaurantService';
import asyncHandler from '../middleware/asyncHandler';
import { HttpError, HttpStatusCode } from '../types/Errors';

const router = express.Router();

// Apply security headers and sanitization to all routes
router.use(securityHeaders);
router.use(...sanitizeInput());

// Get review by ID
router.get('/:id', rateLimits.api, validate({ params: paramSchemas.id }), getReviewById);

// Update review (requires authentication and ownership)
router.put(
    '/:id',
    rateLimits.api,
    validateInputLength(2048),
    protect,
    validate({
        params: paramSchemas.id,
        body: reviewSchemas.update
    }),
    updateReview
);

// Delete review (requires authentication and ownership)
router.delete(
    '/:id',
    rateLimits.api,
    protect,
    validate({ params: paramSchemas.id }),
    deleteReview
);

// Mark review as helpful
router.post(
    '/:id/helpful',
    rateLimits.api,
    protect,
    validate({ params: paramSchemas.id }),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user?._id;
        
        if (!userId) {
            throw new HttpError(HttpStatusCode.UNAUTHORIZED, 'Authentication required');
        }

        if (!id) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Review ID is required');
        }

        const review = await ReviewService.markAsHelpful(id, userId);
        res.status(200).json({
            success: true,
            data: review
        });
    })
);

// Remove helpful vote
router.delete(
    '/:id/helpful',
    rateLimits.api,
    protect,
    validate({ params: paramSchemas.id }),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user?._id;
        
        if (!userId) {
            throw new HttpError(HttpStatusCode.UNAUTHORIZED, 'Authentication required');
        }

        if (!id) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Review ID is required');
        }

        const review = await ReviewService.removeHelpfulVote(id, userId);
        res.status(200).json({
            success: true,
            data: review
        });
    })
);

export default router; 
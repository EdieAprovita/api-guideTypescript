import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { validate, rateLimits, validateInputLength } from '../middleware/validation.js';
import { reviewSchemas, paramSchemas } from '../utils/validators.js';
import { getReviewById, updateReview, deleteReview } from '../controllers/reviewControllers.js';
import { reviewService as ReviewService } from '../services/ReviewService.js';

import asyncHandler from '../middleware/asyncHandler.js';
import { HttpError, HttpStatusCode } from '../types/Errors.js';

const router = express.Router();

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
        body: reviewSchemas.update,
    }),
    updateReview
);

// Delete review (requires authentication and ownership)
router.delete('/:id', rateLimits.api, protect, validate({ params: paramSchemas.id }), deleteReview);

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
            data: review,
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
            data: review,
        });
    })
);

export default router;

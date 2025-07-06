import { NextFunction, Request, Response } from 'express';
import asyncHandler from '../middleware/asyncHandler';
import { reviewService as ReviewService } from '../services/ReviewService';
import { HttpError, HttpStatusCode } from '../types/Errors';

/**
 * @description Get all reviews
 * @name listReviews
 */

export const listReviews = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { refId, refModel } = req.params;
    if (!refId || !refModel) {
        throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Reference ID and model are required');
    }
    const reviews = await ReviewService.listReviewsForModel(refId, refModel);
    res.status(200).json(reviews);
});

/**
 * @description Add a review
 * @name addReview
 */

export const addReview = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const reviewData = req.body;
    const newReview = await ReviewService.addReview(reviewData);
    res.status(201).json(newReview);
});

/**
 * @description Get a review by id
 * @name getReviewById
 */

export const getReviewById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { reviewId } = req.params;
    if (!reviewId) {
        throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Review ID is required');
    }
    const review = await ReviewService.getReviewById(reviewId);
    res.status(200).json({ success: true, data: review });
});

/**
 * @description Update a review by id
 * @name updateReview
 */

export const updateReview = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    if (!id) {
        throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Review ID is required');
    }
    const review = await ReviewService.updateReview(id, req.body);
    res.status(200).json({ success: true, data: review });
});

/**
 * @description Delete a review by id
 * @name deleteReview
 */

export const deleteReview = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { reviewId } = req.params;
    if (!reviewId) {
        throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Review ID is required');
    }
    await ReviewService.deleteReview(reviewId);
    res.status(200).json({ success: true, message: 'Review deleted successfully' });
});

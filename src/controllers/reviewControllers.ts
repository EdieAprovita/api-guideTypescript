import { NextFunction, Request, Response } from 'express';
import asyncHandler from '../middleware/asyncHandler';
import { reviewService as ReviewService } from '../services/ReviewService';
import { HttpError, HttpStatusCode } from '../types/Errors';
import { getErrorMessage } from '../types/modalTypes';

/**
 * @description Get all reviews
 * @name listReviews
 */

export const listReviews = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { refId, refModel } = req.params;
        if (!refId || !refModel) {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Reference ID and model are required'));
        }
        const reviews = await ReviewService.listReviewsForModel(refId, refModel);
        res.status(200).json(reviews);
    } catch (error) {
        next(
            new HttpError(
                HttpStatusCode.NOT_FOUND,
                getErrorMessage(error instanceof Error ? error.message : 'Unknown error')
            )
        );
    }
});

/**
 * @description Add a review
 * @name addReview
 */

export const addReview = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const reviewData = req.body;
        const newReview = await ReviewService.addReview(reviewData);
        res.status(201).json(newReview);
    } catch (error) {
        next(
            new HttpError(
                HttpStatusCode.NOT_FOUND,
                getErrorMessage(error instanceof Error ? error.message : 'Unknown error')
            )
        );
    }
});

/**
 * @description Get a review by id
 * @name getReviewById
 */

export const getReviewById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { reviewId } = req.params;
        if (!reviewId) {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Review ID is required'));
        }
        const review = await ReviewService.getReviewById(reviewId);
        res.status(200).json({ success: true, data: review });
    } catch (error) {
        next(
            new HttpError(
                HttpStatusCode.INTERNAL_SERVER_ERROR,
                getErrorMessage(error instanceof Error ? error.message : 'Unknown error')
            )
        );
    }
});

/**
 * @description Update a review by id
 * @name updateReview
 */

export const updateReview = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        if (!id) {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Review ID is required'));
        }
        const review = await ReviewService.updateReview(id, req.body);
        res.status(200).json({ success: true, data: review });
    } catch (error) {
        next(
            new HttpError(
                HttpStatusCode.INTERNAL_SERVER_ERROR,
                getErrorMessage(error instanceof Error ? error.message : 'Unknown error')
            )
        );
    }
});

/**
 * @description Delete a review by id
 * @name deleteReview
 */

export const deleteReview = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { reviewId } = req.params;
        if (!reviewId) {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Review ID is required'));
        }
        await ReviewService.deleteReview(reviewId);
        res.status(200).json({ success: true, message: 'Review deleted successfully' });
    } catch (error) {
        next(
            new HttpError(
                HttpStatusCode.INTERNAL_SERVER_ERROR,
                getErrorMessage(error instanceof Error ? error.message : 'Unknown error')
            )
        );
    }
});

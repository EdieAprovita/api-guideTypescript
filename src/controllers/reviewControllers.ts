import { Request, Response } from 'express';
import asyncHandler from '../middleware/asyncHandler';
import { reviewService as ReviewService } from '../services/ReviewService';
import { restaurantService as RestaurantService } from '../services/RestaurantService';
import { HttpError, HttpStatusCode } from '../types/Errors';
import logger from '../utils/logger';

/**
 * @description Get all reviews
 * @name listReviews
 */

export const listReviews = asyncHandler(async (req: Request, res: Response) => {
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

export const addReview = asyncHandler(async (req: Request, res: Response) => {
    const reviewData = req.body;
    const newReview = await ReviewService.addReview(reviewData);
    res.status(201).json(newReview);
});

/**
 * @description Create a review for a restaurant
 * @name createReviewForRestaurant
 */
export const createReviewForRestaurant = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { restaurantId } = req.params;
        const userId = req.user?._id;
        
        logger.info('Creating review for restaurant', {
            restaurantId,
            userId: userId?.toString(),
            body: req.body
        });

        if (!userId) {
            throw new HttpError(HttpStatusCode.UNAUTHORIZED, 'Authentication required');
        }

        if (!restaurantId) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Restaurant ID is required');
        }

        // Check if restaurant exists
        const restaurant = await RestaurantService.findById(restaurantId);
        if (!restaurant) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, 'Restaurant not found');
        }

        // Check if user already reviewed this restaurant
        const existingReview = await ReviewService.findByUserAndRestaurant(userId.toString(), restaurantId);
        if (existingReview) {
            throw new HttpError(HttpStatusCode.CONFLICT, 'User has already reviewed this restaurant');
        }

        const reviewData = {
            ...req.body,
            author: userId,
            restaurant: restaurantId
        };

        logger.info('Creating review with data', { reviewData });

        const review = await ReviewService.addReview(reviewData);
        
        res.status(201).json({
            success: true,
            data: review
        });
    } catch (error) {
        logger.error('Error creating review', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            restaurantId: req.params.restaurantId,
            userId: req.user?._id?.toString(),
            body: req.body
        });
        throw error;
    }
});

/**
 * @description Get a review by id
 * @name getReviewById
 */

export const getReviewById = asyncHandler(async (req: Request, res: Response) => {
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

export const updateReview = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Review ID is required');
    }
    
    // Check if user is the author of the review
    const review = await ReviewService.getReviewById(id);
    const userId = (req as any).user?._id;
    
    if (!userId) {
        throw new HttpError(HttpStatusCode.UNAUTHORIZED, 'Authentication required');
    }
    
    // Handle both populated and non-populated author field
    const authorId = typeof review.author === 'object' && review.author._id 
        ? review.author._id.toString() 
        : review.author.toString();
    
    if (authorId !== userId.toString()) {
        throw new HttpError(HttpStatusCode.FORBIDDEN, 'You can only update your own reviews');
    }
    
    const updatedReview = await ReviewService.updateReview(id, req.body);
    res.status(200).json({ success: true, data: updatedReview });
});

/**
 * @description Delete a review by id
 * @name deleteReview
 */

export const deleteReview = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Review ID is required');
    }
    
    // Check if user is the author of the review
    const review = await ReviewService.getReviewById(id);
    const userId = (req as any).user?._id;
    
    if (!userId) {
        throw new HttpError(HttpStatusCode.UNAUTHORIZED, 'Authentication required');
    }
    
    // Handle both populated and non-populated author field
    const authorId = typeof review.author === 'object' && review.author._id 
        ? review.author._id.toString() 
        : review.author.toString();
    
    if (authorId !== userId.toString()) {
        throw new HttpError(HttpStatusCode.FORBIDDEN, 'You can only delete your own reviews');
    }
    
    await ReviewService.deleteReview(id);
    res.status(200).json({ success: true, message: 'Review deleted successfully' });
});

import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import { HttpError, HttpStatusCode } from '../types/Errors.js';
import { getErrorMessage } from '../types/modalTypes.js';
import { sanctuaryService as SanctuaryService } from '../services/SanctuaryService.js';
import { sanitizeNoSQLInput } from '../utils/sanitizer.js';
import { reviewService as ReviewService } from '../services/ReviewService.js';
import geocodeAndAssignLocation from '../utils/geocodeLocation.js';
import {
    createGetAllHandler,
    createGetByIdHandler,
    createCreateHandler,
    createUpdateHandler,
    createDeleteHandler,
    createGetNearbyHandler,
} from './factories/entityControllerFactory.js';

/**
 * @description Get all sanctuaries
 * @name getSanctuaries
 * @route GET /api/sanctuaries
 * @access Public
 * @returns {Promise<Response>}
 */
export const getSanctuaries = createGetAllHandler(SanctuaryService, 'Sanctuary');

/**
 * @description Get a sanctuary by id
 * @name getSanctuaryById
 * @route GET /api/sanctuaries/:id
 * @access Public
 * @returns {Promise<Response>}
 */
export const getSanctuaryById = createGetByIdHandler(SanctuaryService, 'Sanctuary');

const preProcessSanctuary = async (data: any) => {
    const sanitized = sanitizeNoSQLInput(data);
    await geocodeAndAssignLocation(sanitized);
};

/**
 * @description Create a new sanctuary
 * @name createSanctuary
 * @route POST /api/sanctuaries
 * @access Private
 */
export const createSanctuary = createCreateHandler(SanctuaryService, 'Sanctuary', {
    preCreate: preProcessSanctuary,
});

/**
 * @description Update a sanctuary
 * @name updateSanctuary
 * @route PUT /api/sanctuaries/:id
 * @access Private
 */
export const updateSanctuary = createUpdateHandler(SanctuaryService, 'Sanctuary', {
    preUpdate: preProcessSanctuary,
});

/**
 * @description Delete a sanctuary
 * @name deleteSanctuary
 * @route DELETE /api/sanctuaries/:id
 * @access Private
 */
export const deleteSanctuary = createDeleteHandler(SanctuaryService, 'Sanctuary');

/**
 * @description Create a review for a sanctuary
 * @name addReviewToSanctuary
 * @route POST /api/sanctuaries/:id/reviews
 * @access Private
 * @returns {Promise<Response>}
 */
export const addReviewToSanctuary = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const reviewData = {
            ...req.body,
            entityType: 'Sanctuary' as any,
            entity: req.params.id,
            sanctuaryId: req.params.id, // Keep for backward compatibility
        };
        const newReview = await ReviewService.addReview(reviewData);

        res.status(200).json({
            success: true,
            message: 'Review added successfully',
            data: newReview,
        });
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
 * @description Get Top rated sanctuaries
 * @name getTopRatedSanctuaries
 * @route GET /api/sanctuaries/top
 * @access Public
 * @returns {Promise<Response>}
 */
export const getTopRatedSanctuaries = asyncHandler(async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const topRatedSanctuary = await ReviewService.getTopRatedReviews('sanctuary');
        res.status(200).json({
            success: true,
            message: 'Top rated sanctuaries fetched successfully',
            data: topRatedSanctuary,
        });
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
 * @description Get nearby sanctuaries
 * @name getNearbySanctuaries
 * @route GET /api/v1/sanctuaries/nearby
 * @access Public
 * @returns {Promise<Response>}
 */
export const getNearbySanctuaries = createGetNearbyHandler(SanctuaryService, 'Sanctuary');

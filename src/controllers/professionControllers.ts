import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import { HttpError, HttpStatusCode } from '../types/Errors.js';
import { getErrorMessage } from '../types/modalTypes.js';
import { professionService as ProfessionService } from '../services/ProfessionService.js';
import { sanitizeNoSQLInput } from '../utils/sanitizer.js';
import { reviewService as ReviewService } from '../services/ReviewService.js';
import {
    createGetAllHandler,
    createGetByIdHandler,
    createCreateHandler,
    createUpdateHandler,
    createDeleteHandler,
    createGetNearbyHandler,
} from './factories/entityControllerFactory.js';

/**
 * @description Get all professions
 * @name getProfessions
 * @route GET /api/professions
 * @access Public
 * @returns {Promise<Response>}
 */
export const getProfessions = createGetAllHandler(ProfessionService, 'Profession');

/**
 * @description Get a profession by id
 * @name getProfessionById
 * @route GET /api/professions/:id
 * @access Public
 * @returns {Promise<Response>}
 */
export const getProfessionById = createGetByIdHandler(ProfessionService, 'Profession');

const preProcessProfession = async (data: any) => {
    return sanitizeNoSQLInput(data);
};

/**
 * @description Create a new profession
 * @name createProfession
 * @route POST /api/professions
 * @access Private
 * @returns {Promise<Response>}
 */
export const createProfession = createCreateHandler(ProfessionService, 'Profession', {
    preCreate: preProcessProfession,
});

/**
 * @description Update a profession
 * @name updateProfession
 * @route PUT /api/professions/:id
 * @access Private
 * @returns {Promise<Response>}
 */
export const updateProfession = createUpdateHandler(ProfessionService, 'Profession', {
    preUpdate: preProcessProfession,
});

/**
 * @description Delete a profession
 * @name deleteProfession
 * @route DELETE /api/professions/:id
 * @access Private
 * @returns {Promise<Response>}
 */
export const deleteProfession = createDeleteHandler(ProfessionService, 'Profession');

/**
 * @description Add a review to a profession
 * @name addReviewToProfession
 * @route POST /api/professions/:id/reviews
 * @access Private
 * @returns {Promise<Response>}
 */
export const addReviewToProfession = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const reviewData = {
            ...req.body,
            entityType: 'Business' as any, // Map Profession to Business for now
            entity: req.params.id,
            professionId: req.params.id, // Keep for backward compatibility
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
 * @description Get Top rated professions
 * @name getTopRatedProfessions
 * @route GET /api/professions/top
 * @access Public
 * @returns {Promise<Response>}
 */
export const getTopRatedProfessions = asyncHandler(async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const topRatedProfessions = await ReviewService.getTopRatedReviews('profession');

        res.status(200).json({
            success: true,
            message: 'Top rated professions fetched successfully',
            data: topRatedProfessions,
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
 * @description Get nearby professions
 * @name getNearbyProfessions
 * @route GET /api/v1/professions/nearby
 * @access Public
 * @returns {Promise<Response>}
 */
export const getNearbyProfessions = createGetNearbyHandler(ProfessionService, 'Profession');

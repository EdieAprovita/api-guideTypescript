import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import pkg from 'express-validator';
const { validationResult } = pkg;
import { HttpError, HttpStatusCode } from '../types/Errors.js';
import { getErrorMessage } from '../types/modalTypes.js';
import { professionService as ProfessionService } from '../services/ProfessionService.js';
import { sanitizeNoSQLInput } from '../utils/sanitizer.js';
import { reviewService as ReviewService } from '../services/ReviewService.js';

/**
 * @description Get all professions
 * @name getProfessions
 * @route GET /api/professions
 * @access Public
 * @returns {Promise<Response>}
 */

export const getProfessions = asyncHandler(async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const professions = await ProfessionService.getAll();
        res.status(200).json({
            success: true,
            message: 'Professions fetched successfully',
            data: professions,
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
 * @description Get a profession by id
 * @name getProfessionById
 * @route GET /api/professions/:id
 * @access Public
 * @returns {Promise<Response>}
 */

export const getProfessionById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        if (!id) {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Profession ID is required'));
        }
        const profession = await ProfessionService.findById(id);

        res.status(200).json({
            success: true,
            message: 'Profession fetched successfully',
            data: profession,
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
 * @description Create a new profession
 * @name createProfession
 * @route POST /api/professions
 * @access Private
 * @returns {Promise<Response>}
 */

export const createProfession = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return next(new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(firstError?.msg ?? 'Validation error')));
    }

    try {
        const sanitizedData = sanitizeNoSQLInput(req.body);
        const profession = await ProfessionService.create(sanitizedData);
        res.status(201).json({
            success: true,
            message: 'Profession created successfully',
            data: profession,
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
 * @description Update a profession
 * @name updateProfession
 * @route PUT /api/professions/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const updateProfession = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return next(new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(firstError?.msg ?? 'Validation error')));
    }

    try {
        const { id } = req.params;
        if (!id) {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Profession ID is required'));
        }
        const sanitizedData = sanitizeNoSQLInput(req.body);
        const profession = await ProfessionService.updateById(id, sanitizedData);
        res.status(200).json({
            success: true,
            message: 'Profession updated successfully',
            data: profession,
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
 * @description Delete a profession
 * @name deleteProfession
 * @route DELETE /api/professions/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const deleteProfession = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        if (!id) {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Profession ID is required'));
        }
        await ProfessionService.deleteById(id);
        res.status(200).json({
            success: true,
            message: 'Profession deleted successfully',
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
            entityType: 'Business', // Map Profession to Business for now
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
export const getNearbyProfessions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { lat, lng, radius, page, limit } = req.query;
        if (!lat || !lng) {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Latitude and longitude are required'));
        }

        const result = await ProfessionService.findNearbyPaginated({
            latitude: Number(lat),
            longitude: Number(lng),
            radius: Number(radius) || 5000,
            page: page as string,
            limit: limit as string,
        });

        res.status(HttpStatusCode.OK).json({
            success: true,
            message: 'Nearby professions fetched successfully',
            data: result.data,
            meta: result.meta,
        });
    } catch (error: any) {
        next(new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, getErrorMessage(error)));
    }
});

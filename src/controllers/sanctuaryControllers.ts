import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../middleware/asyncHandler';
import { validationResult } from 'express-validator';
import { HttpError, HttpStatusCode } from '../types/Errors';
import { getErrorMessage } from '../types/modalTypes';
import { sanctuaryService as SanctuaryService } from '../services/SanctuaryService';
import { sanitizeNoSQLInput } from '../utils/sanitizer';
import { reviewService as ReviewService } from '../services/ReviewService';
import geocodeAndAssignLocation from '../utils/geocodeLocation';

/**
 * @description Get all sanctuaries
 * @name getSanctuaries
 * @route GET /api/sanctuaries
 * @access Public
 * @returns {Promise<Response>}
 */

export const getSanctuaries = asyncHandler(async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const sanctuaries = await SanctuaryService.getAll();
        res.status(200).json({
            success: true,
            message: 'Sanctuaries fetched successfully',
            data: sanctuaries,
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
 * @description Get a sanctuary by id
 * @name getSanctuaryById
 * @route GET /api/sanctuaries/:id
 * @access Public
 * @returns {Promise<Response>}
 */

export const getSanctuaryById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        if (!id) {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Sanctuary ID is required'));
        }
        const sanctuary = await SanctuaryService.findById(id);
        res.status(200).json({
            success: true,
            message: 'sanctuary fetched successfully',
            data: sanctuary,
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
 * @description Create a new sanctuary
 * @name createSanctuary
 * @route POST /api/sanctuaries
 * @access Private
 */

export const createSanctuary = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return next(new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(firstError?.msg ?? 'Validation error')));
    }

    try {
        const sanitizedData = sanitizeNoSQLInput(req.body);
        await geocodeAndAssignLocation(sanitizedData);
        const sanctuary = await SanctuaryService.create(sanitizedData);
        res.status(201).json({
            success: true,
            message: 'sanctuary created successfully',
            data: sanctuary,
        });
    } catch (error) {
        next(
            new HttpError(
                HttpStatusCode.BAD_REQUEST,
                getErrorMessage(error instanceof Error ? error.message : 'Unknown error')
            )
        );
    }
});

/**
 * @description Update a sanctuary
 * @name updateSanctuary
 * @route PUT /api/sanctuaries/:id
 * @access Private
 */

export const updateSanctuary = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return next(new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(firstError?.msg ?? 'Validation error')));
    }

    try {
        const { id } = req.params;
        if (!id) {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Sanctuary ID is required'));
        }
        const sanitizedData = sanitizeNoSQLInput(req.body);
        await geocodeAndAssignLocation(sanitizedData);
        const sanctuary = await SanctuaryService.updateById(id, sanitizedData);
        res.status(200).json({
            success: true,
            message: 'sanctuary updated successfully',
            data: sanctuary,
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
 * @description Delete a sanctuary
 * @name deleteSanctuary
 * @route DELETE /api/sanctuaries/:id
 * @access Private
 */

export const deleteSanctuary = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        if (!id) {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Sanctuary ID is required'));
        }
        await SanctuaryService.deleteById(id);
        res.status(200).json({
            success: true,
            message: 'sanctuary deleted successfully',
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
            entityType: 'Sanctuary',
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

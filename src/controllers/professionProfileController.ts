import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../middleware/asyncHandler';
import { validationResult } from 'express-validator';
import { HttpError, HttpStatusCode } from '../types/Errors';
import { getErrorMessage } from '../types/modalTypes';
import { professionProfileService as ProfessionProfileService } from '../services/ProfessionProfileService';
import { reviewService as ReviewService } from '../services/ReviewService';

/**
 * @description Get all professionsProfile
 * @name getProfessions
 * @route GET /api/professionsProfile
 * @access Public
 * @returns {Promise<Response>}
 */

export const getProfessionsProfile = asyncHandler(async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const professions = await ProfessionProfileService.getAll();
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
 * @description Get a professionProfile by id
 * @name getProfessionProfileById
 * @route GET /api/professions/:id
 * @access Public
 * @returns {Promise<Response>}
 */

export const getProfessionProfileById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        if (!id) {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Profession Profile ID is required'));
        }
        const profession = await ProfessionProfileService.findById(id);
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
 * @description Create a new professionProfile
 * @name createProfessionProfile
 * @route POST /api/professions
 * @access Private
 * @returns {Promise<Response>}
 */

export const createProfessionProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return next(new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(firstError?.msg || 'Validation error')));
    }
    try {
        const profession = await ProfessionProfileService.create(req.body);
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
 * @description Update a professionProfile
 * @name updateProfession
 * @route PUT /api/professionsProfile/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const updateProfessionProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return next(new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(firstError?.msg || 'Validation error')));
    }
    try {
        const { id } = req.params;
        if (!id) {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Profession Profile ID is required'));
        }
        const profession = await ProfessionProfileService.updateById(id, req.body);
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
 * @description Delete a professionProfile
 * @name deleteProfession
 * @route DELETE /api/professionsProfile/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const deleteProfessionProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        if (!id) {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Profession Profile ID is required'));
        }
        await ProfessionProfileService.deleteById(id);
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
 * @description Add a review to a professionProfile
 * @name addReviewToProfession
 * @route POST /api/professionsProfile/add-review/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const addReviewToProfessionProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const reviewData = { ...req.body, professionProfileId: req.params.id };
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
 * @description Get Top rated professionsProfile
 * @name getTopRatedProfessionsProfile
 * @route GET /api/professionsProfile/top-rated
 * @access Public
 * @returns {Promise<Response>}
 */

export const getTopRatedProfessionsProfile = asyncHandler(async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const topRatedProfesionalProfile = await ReviewService.getTopRatedReviews('professionProfile');
        res.status(200).json({
            success: true,
            message: 'Top rated professions fetched successfully',
            data: topRatedProfesionalProfile,
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

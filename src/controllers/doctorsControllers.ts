import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import { HttpError, HttpStatusCode } from '../types/Errors.js';
import { getErrorMessage } from '../types/modalTypes.js';
import { doctorService as DoctorService } from '../services/DoctorService.js';
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
 * @description Get all doctors
 * @name getDoctors
 * @route GET /api/doctors
 * @access Public
 * @returns {Promise<Response>}
 */
export const getDoctors = createGetAllHandler(DoctorService, 'Doctor');

/**
 * @description Get a doctor by id
 * @name getDoctorById
 * @route GET /api/doctors/:id
 * @access Public
 * @returns {Promise<Response>}
 */
export const getDoctorById = createGetByIdHandler(DoctorService, 'Doctor');

const preProcessDoctor = async (data: any) => {
    const sanitized = sanitizeNoSQLInput(data);
    await geocodeAndAssignLocation(sanitized);
};

/**
 * @description Create a new doctor
 * @name createDoctor
 * @route POST /api/doctors
 * @access Private
 * @returns {Promise<Response>}
 */
export const createDoctor = createCreateHandler(DoctorService, 'Doctor', {
    preCreate: preProcessDoctor,
});

/**
 * @description Update a doctor
 * @name updateDoctor
 * @route PUT /api/doctors/:id
 * @access Private
 * @returns {Promise<Response>}
 */
export const updateDoctor = createUpdateHandler(DoctorService, 'Doctor', {
    preUpdate: preProcessDoctor,
});

/**
 * @description Delete a doctor
 * @name deleteDoctor
 * @route DELETE /api/doctors/:id
 * @access Private
 * @returns {Promise<Response>}
 */
export const deleteDoctor = createDeleteHandler(DoctorService, 'Doctor');

/**
 * @description Add a review to a doctor
 * @name addReviewToDoctor
 * @route POST /api/doctors/:id/reviews
 * @access Private
 * @returns {Promise<Response>}
 */

export const addReviewToDoctor = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const sanitizedBody = sanitizeNoSQLInput(req.body);
        const reviewData = {
            ...sanitizedBody,
            entityType: 'Doctor' as any,
            entity: req.params.id,
            doctorId: req.params.id, // Keep for backward compatibility
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
 * @description Get Top rated doctors
 * @name getTopRatedDoctors
 * @route GET /api/doctors/top
 * @access Public
 * @returns {Promise<Response>}
 */

export const getTopRatedDoctors = asyncHandler(async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const topRatedDoctors = await ReviewService.getTopRatedReviews('doctor');
        res.status(200).json({
            success: true,
            message: 'Top rated doctors fetched successfully',
            data: topRatedDoctors,
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
 * @description Get nearby doctors
 * @name getNearbyDoctors
 * @route GET /api/v1/doctors/nearby
 * @access Public
 * @returns {Promise<Response>}
 */
export const getNearbyDoctors = createGetNearbyHandler(DoctorService, 'Doctor');

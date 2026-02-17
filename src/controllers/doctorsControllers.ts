import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import pkg from 'express-validator';
const { validationResult } = pkg;
import { HttpError, HttpStatusCode } from '../types/Errors.js';
import { getErrorMessage } from '../types/modalTypes.js';
import { doctorService as DoctorService } from '../services/DoctorService.js';
import { sanitizeNoSQLInput } from '../utils/sanitizer.js';
import { reviewService as ReviewService } from '../services/ReviewService.js';
import geocodeAndAssignLocation from '../utils/geocodeLocation.js';

/**
 * @description Get all doctors
 * @name getDoctors
 * @route GET /api/doctors
 * @access Public
 * @returns {Promise<Response>}
 */

export const getDoctors = asyncHandler(async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const doctors = await DoctorService.getAll();
        res.status(200).json({
            success: true,
            message: 'Doctors fetched successfully',
            data: doctors,
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
 * @description Get a doctor by id
 * @name getDoctorById
 * @route GET /api/doctors/:id
 * @access Public
 * @returns {Promise<Response>}
 */

export const getDoctorById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        if (!id) {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Doctor ID is required'));
        }
        const doctor = await DoctorService.findById(id);
        res.status(200).json({
            success: true,
            message: 'Doctor fetched successfully',
            data: doctor,
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
 * @description Create a new doctor
 * @name createDoctor
 * @route POST /api/doctors
 * @access Private
 * @returns {Promise<Response>}
 */

export const createDoctor = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return next(new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(firstError?.msg ?? 'Validation error')));
    }
    try {
        const sanitizedData = sanitizeNoSQLInput(req.body);
        await geocodeAndAssignLocation(sanitizedData);
        const doctor = await DoctorService.create(sanitizedData);
        res.status(201).json({
            success: true,
            message: 'Doctor created successfully',
            data: doctor,
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
 * @description Update a doctor
 * @name updateDoctor
 * @route PUT /api/doctors/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const updateDoctor = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return next(new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(firstError?.msg ?? 'Validation error')));
    }
    try {
        const { id } = req.params;
        if (!id) {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Doctor ID is required'));
        }
        const sanitizedData = sanitizeNoSQLInput(req.body);
        await geocodeAndAssignLocation(sanitizedData);
        const doctor = await DoctorService.updateById(id, sanitizedData);
        res.status(200).json({
            success: true,
            message: 'Doctor updated successfully',
            data: doctor,
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
 * @description Delete a doctor
 * @name deleteDoctor
 * @route DELETE /api/doctors/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const deleteDoctor = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        if (!id) {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Doctor ID is required'));
        }
        await DoctorService.deleteById(id);
        res.status(200).json({
            success: true,
            message: 'Doctor deleted successfully',
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
            entityType: 'Doctor',
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
export const getNearbyDoctors = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { lat, lng, radius, page, limit } = req.query;
        if (!lat || !lng) {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Latitude and longitude are required'));
        }

        const result = await DoctorService.findNearbyPaginated({
            latitude: Number(lat),
            longitude: Number(lng),
            radius: Number(radius) || 5000,
            page: page as string,
            limit: limit as string,
        });

        res.status(HttpStatusCode.OK).json({
            success: true,
            message: 'Nearby doctors fetched successfully',
            data: result.data,
            meta: result.meta,
        });
    } catch (error: any) {
        next(new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, getErrorMessage(error)));
    }
});

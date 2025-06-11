import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../middleware/asyncHandler';
import { validationResult } from 'express-validator';
import { HttpError, HttpStatusCode } from '../types/Errors';
import { getErrorMessage } from '../types/modalTypes';
import { businessService as BusinessService } from '../services/BusinessService';
import { reviewService as ReviewService } from '../services/ReviewService';
import geocodeAndAssignLocation from '../utils/geocodeLocation';

/**
 * @description Get all businesses
 * @name getBusinesses
 * @route GET /api/businesses
 * @access Public
 * @returns {Promise<Response>}
 */

export const getBusinesses = asyncHandler(async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const businesses = await BusinessService.getAll();
        res.status(200).json({
            success: true,
            message: 'Businesses fetched successfully',
            data: businesses,
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
 * @description Get a business by id
 * @name getBusinessById
 * @route GET /api/businesses/:id
 * @access Public
 * @returns {Promise<Response>}
 */

export const getBusinessById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        if (!id) {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Business ID is required'));
        }
        const business = await BusinessService.findById(id);

        res.status(200).json({
            success: true,
            message: 'Business fetched successfully',
            data: business,
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
 * @description Create a new business
 * @name createBusiness
 * @route POST /api/businesses
 * @access Private
 * @returns {Promise<Response>}
 */

export const createBusiness = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return next(new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(firstError?.msg || 'Validation error')));
    }

    try {
        await geocodeAndAssignLocation(req.body);
        const business = await BusinessService.create(req.body);
        res.status(201).json({
            success: true,
            message: 'Business created successfully',
            data: business,
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
 * @description Update a business
 * @name updateBusiness
 * @route PUT /api/businesses/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const updateBusiness = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return next(new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(firstError?.msg || 'Validation error')));
    }
    try {
        const { id } = req.params;
        if (!id) {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Business ID is required'));
        }
        await geocodeAndAssignLocation(req.body);
        const updatedBusiness = await BusinessService.updateById(id, req.body);
        res.status(200).json({
            success: true,
            message: 'Business updated successfully',
            data: updatedBusiness,
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
 * @description Delete a business
 * @name deleteBusiness
 * @route DELETE /api/businesses/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const deleteBusiness = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        if (!id) {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Business ID is required'));
        }
        await BusinessService.deleteById(id);
        res.status(200).json({
            success: true,
            message: 'Business deleted successfully',
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
 * @description Create a new review for a business
 * @name addReviewToBusiness
 * @route POST /api/businesses/:id/reviews
 * @access Public
 * @returns {Promise<Response>}
 */

export const addReviewToBusiness = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const reviewData = { ...req.body, businessId: req.params.id };
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
 * @description Get Top rated businesses
 * @name getTopRatedBusinesses
 * @route GET /api/businesses/top-rated
 * @access Public
 * @returns {Promise<Response>}
 */

export const getTopRatedBusinesses = asyncHandler(async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const topRatedBusinesses = await ReviewService.getTopRatedReviews('business');

        res.status(200).json({
            success: true,
            message: 'Top rated businesses fetched successfully',
            data: topRatedBusinesses,
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

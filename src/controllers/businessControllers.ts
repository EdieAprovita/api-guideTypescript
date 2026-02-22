import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import pkg from 'express-validator';
const { validationResult } = pkg;
import { HttpError, HttpStatusCode } from '../types/Errors.js';
import { getErrorMessage } from '../types/modalTypes.js';
import { businessService as BusinessService } from '../services/BusinessService.js';
import { sanitizeNoSQLInput } from '../utils/sanitizer.js';
import { reviewService as ReviewService } from '../services/ReviewService.js';
import { sendSuccessResponse, sendCreatedResponse, sendPaginatedResponse } from '../utils/responseHelpers.js';
import geocodeAndAssignLocation from '../utils/geocodeLocation.js';
import { resolveCoords, parseFiniteNumber } from '../utils/geoHelpers.js';

/**
 * @description Get all businesses
 * @name getBusinesses
 * @route GET /api/businesses
 * @access Public
 * @returns {Promise<Response>}
 */

export const getBusinesses = asyncHandler(async (_req: Request, res: Response, next: NextFunction) => {
    try {
        // Usar método con cache para mejor rendimiento
        const businesses = await BusinessService.getAllCached();
        sendSuccessResponse(res, businesses, 'Businesses fetched successfully');
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
        // Usar método con cache para mejor rendimiento
        const business = await BusinessService.findByIdCached(id);
        sendSuccessResponse(res, business, 'Business fetched successfully');
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
        return next(new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(firstError?.msg ?? 'Validation error')));
    }

    try {
        const sanitizedData = sanitizeNoSQLInput(req.body);
        await geocodeAndAssignLocation(sanitizedData);
        const business = await BusinessService.create(sanitizedData);
        sendCreatedResponse(res, business, 'Business created successfully');
    } catch (error) {
        // Check if it's a validation error from mongoose
        if (error instanceof Error && error.name === 'ValidationError') {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(error.message)));
        }

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
        return next(new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(firstError?.msg ?? 'Validation error')));
    }
    try {
        const { id } = req.params;
        if (!id) {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Business ID is required'));
        }
        const sanitizedData = sanitizeNoSQLInput(req.body);
        await geocodeAndAssignLocation(sanitizedData);
        const updatedBusiness = await BusinessService.updateById(id, sanitizedData);
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
        const sanitizedBody = sanitizeNoSQLInput(req.body);
        const reviewData = {
            ...sanitizedBody,
            entityType: 'Business',
            entity: req.params.id,
            businessId: req.params.id, // Keep for backward compatibility
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

/**
 * @description Get nearby businesses using geospatial query
 * @name getNearbyBusinesses
 * @route GET /api/businesses/nearby?latitude=X&longitude=Y&radius=R&page=P&limit=L
 * @access Public
 * @returns {Promise<Response>}
 */

export const getNearbyBusinesses = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Use shared geoHelper to reliably resolve coordinate pairs (either lat/lng or latitude/longitude)
        // This also handles finite number enforcement.
        const { latitude, longitude, lat: latShort, lng: lngShort, radius, page, limit } = req.query;
        let lat: number | undefined;
        let lng: number | undefined;

        try {
            [lat, lng] = resolveCoords(latitude, longitude, latShort, lngShort);
        } catch (e) {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, (e as Error).message));
        }

        if (lat === undefined || lng === undefined) {
            return next(
                new HttpError(
                    HttpStatusCode.BAD_REQUEST,
                    'latitude and longitude (or lat and lng) query parameters are required'
                )
            );
        }

        if (lat < -90 || lat > 90) {
            return next(
                new HttpError(HttpStatusCode.BAD_REQUEST, 'latitude must be a finite number between -90 and 90')
            );
        }
        if (lng < -180 || lng > 180) {
            return next(
                new HttpError(HttpStatusCode.BAD_REQUEST, 'longitude must be a finite number between -180 and 180')
            );
        }

        const parsedRadius = parseFiniteNumber(radius) ?? 5000;
        if (parsedRadius < 1 || parsedRadius > 50000) {
            return next(
                new HttpError(HttpStatusCode.BAD_REQUEST, 'radius must be a finite number between 1 and 50000 meters')
            );
        }

        const result = await BusinessService.findNearbyPaginated({
            latitude: lat,
            longitude: lng,
            radius: parsedRadius,
            page: page as string,
            limit: limit as string,
        });

        sendPaginatedResponse(res, result.data, result.meta, 'Nearby businesses fetched successfully');
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
 * @description Search businesses by text query and/or category
 * @name searchBusinesses
 * @route GET /api/businesses/search?q=term&category=type&sortBy=name&sortOrder=asc&page=P&limit=L
 * @access Public
 * @returns {Promise<Response>}
 */

export const searchBusinesses = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { q, category, sortBy, sortOrder, page, limit } = req.query;

        const result = await BusinessService.searchPaginated({
            q: q as string,
            category: category as string,
            sortBy: sortBy as 'name' | 'rating' | 'createdAt',
            sortOrder: sortOrder as 'asc' | 'desc',
            page: page as string,
            limit: limit as string,
        });

        sendPaginatedResponse(res, result.data, result.meta, 'Business search results fetched successfully');
    } catch (error) {
        next(
            new HttpError(
                HttpStatusCode.INTERNAL_SERVER_ERROR,
                getErrorMessage(error instanceof Error ? error.message : 'Unknown error')
            )
        );
    }
});

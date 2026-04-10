import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import { HttpError, HttpStatusCode } from '../types/Errors.js';
import { getErrorMessage } from '../types/modalTypes.js';
import { businessService as BusinessService } from '../services/BusinessService.js';
import { sanitizeNoSQLInput } from '../utils/sanitizer.js';
import { reviewService as ReviewService } from '../services/ReviewService.js';
import geocodeAndAssignLocation from '../utils/geocodeLocation.js';
import { resolveCoords, parseFiniteNumber } from '../utils/geoHelpers.js';
import { sendPaginatedResponse } from '../utils/responseHelpers.js';
import {
    createGetAllHandler,
    createGetByIdHandler,
    createCreateHandler,
    createUpdateHandler,
    createDeleteHandler,
} from './factories/entityControllerFactory.js';
import { createAddReviewHandler } from './factories/reviewEndpointsFactory.js';

/**
 * @description Get all businesses
 * @name getBusinesses
 * @route GET /api/businesses
 * @access Public
 * @returns {Promise<Response>}
 */
export const getBusinesses = createGetAllHandler(BusinessService, 'Business', { useCache: true });

/**
 * @description Get a business by id
 * @name getBusinessById
 * @route GET /api/businesses/:id
 * @access Public
 * @returns {Promise<Response>}
 */
export const getBusinessById = createGetByIdHandler(BusinessService, 'Business', { useCache: true });

const preProcessBusiness = async (data: Record<string, unknown>) => {
    const sanitized = sanitizeNoSQLInput(data);
    // Mutate in-place so the factory's reference to req.body receives the sanitized content
    Object.keys(data).forEach(key => delete data[key]);
    Object.assign(data, sanitized);
    await geocodeAndAssignLocation(data);
};

/**
 * @description Create a new business
 * @name createBusiness
 * @route POST /api/businesses
 * @access Private
 * @returns {Promise<Response>}
 */
export const createBusiness = createCreateHandler(BusinessService, 'Business', {
    preCreate: preProcessBusiness,
});

/**
 * @description Update a business
 * @name updateBusiness
 * @route PUT /api/businesses/:id
 * @access Private
 * @returns {Promise<Response>}
 */
export const updateBusiness = createUpdateHandler(BusinessService, 'Business', {
    preUpdate: preProcessBusiness,
});

/**
 * @description Delete a business
 * @name deleteBusiness
 * @route DELETE /api/businesses/:id
 * @access Private
 * @returns {Promise<Response>}
 */
export const deleteBusiness = createDeleteHandler(BusinessService, 'Business');

/**
 * @description Create a new review for a business
 * @name addReviewToBusiness
 * @route POST /api/businesses/:id/reviews
 * @access Private
 * @returns {Promise<Response>}
 */
export const addReviewToBusiness = createAddReviewHandler('Business', BusinessService, 'businessId');

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
                HttpStatusCode.INTERNAL_SERVER_ERROR,
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

        sendPaginatedResponse(res, result.data, result.pagination, 'Nearby businesses fetched successfully');
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

        sendPaginatedResponse(res, result.data, result.pagination, 'Business search results fetched successfully');
    } catch (error) {
        next(
            new HttpError(
                HttpStatusCode.INTERNAL_SERVER_ERROR,
                getErrorMessage(error instanceof Error ? error.message : 'Unknown error')
            )
        );
    }
});

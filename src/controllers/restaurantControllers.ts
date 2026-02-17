import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import { HttpError, HttpStatusCode } from '../types/Errors.js';
import { getErrorMessage } from '../types/modalTypes.js';
import { restaurantService as RestaurantService } from '../services/RestaurantService.js';
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
 * @description Get all restaurants
 * @name getRestaurants
 * @route GET /api/restaurants
 * @access Public
 * @returns {Promise<Response>}
 */
export const getRestaurants = createGetAllHandler(RestaurantService, 'Restaurant', { useCache: true });

/**
 * @description Get a restaurant by id
 * @name getRestaurantById
 * @route GET /api/restaurants/:id
 * @access Public
 * @returns {Promise<Response>}
 */
export const getRestaurantById = createGetByIdHandler(RestaurantService, 'Restaurant', { useCache: true });

const preProcessRestaurant = async (data: any) => {
    const sanitized = sanitizeNoSQLInput(data);
    await geocodeAndAssignLocation(sanitized);
};

/**
 * @description Create a new restaurant
 * @name createRestaurant
 * @route POST /api/restaurants
 * @access Private
 * @returns {Promise<Response>}
 */
export const createRestaurant = createCreateHandler(RestaurantService, 'Restaurant', {
    preCreate: preProcessRestaurant,
    useCache: true,
});

/**
 * @description Update a restaurant
 * @name updateRestaurant
 * @route PUT /api/restaurants/:id
 * @access Private
 * @returns {Promise<Response>}
 */
export const updateRestaurant = createUpdateHandler(RestaurantService, 'Restaurant', {
    preUpdate: preProcessRestaurant,
    useCache: true,
});

/**
 * @description Delete a restaurant
 * @name deleteRestaurant
 * @route DELETE /api/restaurants/:id
 * @access Private
 * @returns {Promise<Response>}
 */
export const deleteRestaurant = createDeleteHandler(RestaurantService, 'Restaurant');

/**
 * @description Add a review to a restaurant
 * @name addReviewToRestaurant
 * @route GET /api/restaurants/addReview/:id
 * @access Public
 * @returns {Promise<Response>}
 */

export const addReviewToRestaurant = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const sanitizedBody = sanitizeNoSQLInput(req.body);
        const reviewData = {
            ...sanitizedBody,
            entityType: 'Restaurant' as any,
            entity: req.params.id,
            restaurantId: req.params.id, // Keep for backward compatibility
        };
        const newReview = await ReviewService.addReview(reviewData);

        // Invalidar cache del restaurante específico después de agregar review
        if (req.params.id) {
            await RestaurantService.invalidateCache(req.params.id);
        }

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
 * @description Get Top rated restaurants
 * @name getTopRatedRestaurants
 * @route GET /api/restaurants/top-rated
 * @access Public
 * @returns {Promise<Response>}
 */

export const getTopRatedRestaurants = asyncHandler(async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const topRatedRestaurants = await ReviewService.getTopRatedReviews('restaurant');
        res.status(200).json({
            success: true,
            message: 'Top rated restaurants fetched successfully',
            data: topRatedRestaurants,
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
 * @description Get nearby restaurants
 * @name getNearbyRestaurants
 * @route GET /api/v1/restaurants/nearby
 * @access Public
 * @returns {Promise<Response>}
 */
export const getNearbyRestaurants = createGetNearbyHandler(RestaurantService, 'Restaurant');

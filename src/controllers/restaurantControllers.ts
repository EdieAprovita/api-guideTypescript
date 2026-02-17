import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import pkg from 'express-validator';
const { validationResult } = pkg;
import { HttpError, HttpStatusCode } from '../types/Errors.js';
import { getErrorMessage } from '../types/modalTypes.js';
import { restaurantService as RestaurantService } from '../services/RestaurantService.js';
import { sanitizeNoSQLInput } from '../utils/sanitizer.js';
import { reviewService as ReviewService } from '../services/ReviewService.js';
import geocodeAndAssignLocation from '../utils/geocodeLocation.js';

/**
 * @description Get all restaurants
 * @name getRestaurants
 * @route GET /api/restaurants
 * @access Public
 * @returns {Promise<Response>}
 */

export const getRestaurants = asyncHandler(async (_req: Request, res: Response, next: NextFunction) => {
    try {
        // Usar método con cache para mejor rendimiento
        const restaurants = await RestaurantService.getAllCached();
        res.status(200).json({
            success: true,
            message: 'Restaurants fetched successfully',
            data: restaurants,
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
 * @description Get a restaurant by id
 * @name getRestaurantById
 * @route GET /api/restaurants/:id
 * @access Public
 * @returns {Promise<Response>}
 */

export const getRestaurantById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        if (!id) {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Restaurant ID is required'));
        }
        // Usar método con cache para mejor rendimiento
        const restaurant = await RestaurantService.findByIdCached(id);

        res.status(200).json({
            success: true,
            message: 'Restaurant fetched successfully',
            data: restaurant,
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
 * @description Create a new restaurant
 * @name createRestaurant
 * @route POST /api/restaurants
 * @access Private
 * @returns {Promise<Response>}
 */

export const createRestaurant = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return next(new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(firstError?.msg ?? 'Validation error')));
    }
    try {
        const sanitizedData = sanitizeNoSQLInput(req.body);
        await geocodeAndAssignLocation(sanitizedData);
        // Usar método con invalidación automática de cache
        const restaurant = await RestaurantService.createCached(sanitizedData);
        res.status(201).json({
            success: true,
            message: 'Restaurant created successfully',
            data: restaurant,
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
 * @description Update a restaurant
 * @name updateRestaurant
 * @route PUT /api/restaurants/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const updateRestaurant = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return next(new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(firstError?.msg ?? 'Validation error')));
    }
    try {
        const { id } = req.params;
        if (!id) {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Restaurant ID is required'));
        }
        const sanitizedData = sanitizeNoSQLInput(req.body);
        await geocodeAndAssignLocation(sanitizedData);
        // Usar método con invalidación automática de cache
        const restaurant = await RestaurantService.updateByIdCached(id, sanitizedData);
        res.status(200).json({
            success: true,
            message: 'Restaurant updated successfully',
            data: restaurant,
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
 * @description Delete a restaurant
 * @name deleteRestaurant
 * @route DELETE /api/restaurants/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const deleteRestaurant = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        if (!id) {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Restaurant ID is required'));
        }
        await RestaurantService.deleteById(id);
        res.status(200).json({
            success: true,
            message: 'Restaurant deleted successfully',
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
            entityType: 'Restaurant',
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

import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middleware/asyncHandler";
import { validationResult } from "express-validator";
import { HttpError, HttpStatusCode } from "../types/Errors";
import { getErrorMessage } from "../types/modalTypes";
import { restaurantService as RestaurantService } from "../services/RestaurantService";
import { reviewService as ReviewService } from "../services/ReviewService";

/**
 * @description Get all restaurants
 * @name getRestaurants
 * @route GET /api/restaurants
 * @access Public
 * @returns {Promise<Response>}
 */

export const getRestaurants = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const restaurants = await RestaurantService.getAll();
			res.status(200).json({
				success: true,
				message: "Restaurants fetched successfully",
				data: restaurants,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage(error)));
		}
	}
);

/**
 * @description Get a restaurant by id
 * @name getRestaurantById
 * @route GET /api/restaurants/:id
 * @access Public
 * @returns {Promise<Response>}
 */

export const getRestaurantById = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const restaurant = await RestaurantService.findById(id);

			res.status(200).json({
				success: true,
				message: "Restaurant fetched successfully",
				data: restaurant,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage(error)));
		}
	}
);

/**
 * @description Create a new restaurant
 * @name createRestaurant
 * @route POST /api/restaurants
 * @access Private
 * @returns {Promise<Response>}
 */

export const createRestaurant = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return next(
				new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(errors.array()[0].msg))
			);
		}
		try {
			const restaurant = await RestaurantService.create(req.body);
			res.status(201).json({
				success: true,
				message: "Restaurant created successfully",
				data: restaurant,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, getErrorMessage(error)));
		}
	}
);

/**
 * @description Update a restaurant
 * @name updateRestaurant
 * @route PUT /api/restaurants/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const updateRestaurant = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return next(
				new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(errors.array()[0].msg))
			);
		}
		try {
			const { id } = req.params;
			const restaurant = await RestaurantService.updateById(id, req.body);
			res.status(200).json({
				success: true,
				message: "Restaurant updated successfully",
				data: restaurant,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, getErrorMessage(error)));
		}
	}
);

/**
 * @description Delete a restaurant
 * @name deleteRestaurant
 * @route DELETE /api/restaurants/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const deleteRestaurant = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			await RestaurantService.deleteById(id);
			res.status(200).json({
				success: true,
				message: "Restaurant deleted successfully",
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, getErrorMessage(error)));
		}
	}
);

/**
 * @description Add a review to a restaurant
 * @name addReviewToRestaurant
 * @route GET /api/restaurants/addReview/:id
 * @access Public
 * @returns {Promise<Response>}
 */

export const addReviewToRestaurant = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const reviewData = { ...req.body, restaurantId: req.params.id };
			const newReview = await ReviewService.addReview(reviewData);

			res.status(200).json({
				success: true,
				message: "Review added successfully",
				data: newReview,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, getErrorMessage(error)));
		}
	}
);

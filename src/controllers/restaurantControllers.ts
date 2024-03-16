import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middleware/asyncHandler";
import { validationResult } from "express-validator";
import { BadRequestError, InternalServerError } from "../types/Errors";
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
			next(new InternalServerError(`${error}`));
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
			next(error);
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
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return next(new BadRequestError("Invalid data"));
			}
			const restaurant = await RestaurantService.create(req.body);
			res.status(201).json({
				success: true,
				message: "Restaurant created successfully",
				data: restaurant,
			});
		} catch (error) {
			next(new InternalServerError(`${error}`));
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
		try {
			const { id } = req.params;
			const restaurant = await RestaurantService.updateById(id, req.body);
			res.status(200).json({
				success: true,
				message: "Restaurant updated successfully",
				data: restaurant,
			});
		} catch (error) {
			next(error);
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
			next(error);
		}
	}
);

/**
 * @description Add a review to a restaurant
 * @name getRestaurantsByLocation
 * @route GET /api/restaurants/addReview/:id
 * @access Public
 * @returns {Promise<Response>}
 */

export const addReviewToRestaurant = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		const reviewData = req.body;

		const updatedRestaurant = await ReviewService.addReview(
			
			reviewData
		);

		res.status(200).json({
			success: true,
			data: updatedRestaurant,
		});
	}
);

import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middleware/asyncHandler";
import { validationResult } from "express-validator";
import { BadRequestError, InternalServerError } from "../types/Errors";
import RestaurantService from "../services/RestaurantService";

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
			const restaurants = await RestaurantService.getAllRestaurants();
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
			const restaurant = await RestaurantService.getRestaurantById(id);
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
			const restaurant = await RestaurantService.createRestaurant(req.body);
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
			const restaurant = await RestaurantService.updateRestaurant(id, req.body);
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
			await RestaurantService.deleteRestaurant(id);
			res.status(200).json({
				success: true,
				message: "Restaurant deleted successfully",
			});
		} catch (error) {
			next(error);
		}
	}
);

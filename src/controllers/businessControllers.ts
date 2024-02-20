import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middleware/asyncHandler";
import { validationResult } from "express-validator";
import { BadRequestError, InternalServerError } from "../types/Errors";
import BusinessService from "../services/BusinessService";

/**
 * @description Get all businesses
 * @name getBusinesses
 * @route GET /api/businesses
 * @access Public
 * @returns {Promise<Response>}
 */

export const getBusinesses = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const businesses = await BusinessService.getAllBusinesses();
			res.status(200).json({
				success: true,
				message: "Businesses fetched successfully",
				data: businesses,
			});
		} catch (error) {
			next(new InternalServerError(`${error}`));
		}
	}
);

/**
 * @description Get a business by id
 * @name getBusinessById
 * @route GET /api/businesses/:id
 * @access Public
 * @returns {Promise<Response>}
 */

export const getBusinessById = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const business = await BusinessService.getBusinessById(id);
			res.status(200).json({
				success: true,
				message: "Business fetched successfully",
				data: business,
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * @description Create a new business
 * @name createBusiness
 * @route POST /api/businesses
 * @access Private
 * @returns {Promise<Response>}
 */

export const createBusiness = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			next(new BadRequestError("Invalid request parameters"));
			return;
		}

		try {
			const business = await BusinessService.createBusiness(req.body);
			res.status(201).json({
				success: true,
				message: "Business created successfully",
				data: business,
			});
		} catch (error) {
			next(new InternalServerError(`${error}`));
		}
	}
);

/**
 * @description Update a business by id
 * @name updateBusiness
 * @route PUT /api/businesses/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const updateBusiness = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const business = await BusinessService.updateBusiness(id, req.body);
			res.status(200).json({
				success: true,
				message: "Business updated successfully",
				data: business,
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * @description Delete a business by id
 * @name deleteBusiness
 * @route DELETE /api/businesses/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const deleteBusiness = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			await BusinessService.deleteBusiness(id);
			res.status(200).json({ success: true, message: "Business deleted successfully" });
		} catch (error) {
			next(error);
		}
	}
);

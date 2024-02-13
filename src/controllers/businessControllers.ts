import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middleware/asyncHandler";
import { validationResult } from "express-validator";

import { BadRequestError, NotFoundError, InternalServerError } from "../types/Errors";
import { IBusiness } from "../types/modalTypes";
import Business from "../models/Business";

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
			const businesses: IBusiness[] = await Business.find({});
			return res.status(200).json({
				success: true,
				businesses,
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
			const business = await Business.findById(id);
			if (!business) {
				throw new NotFoundError();
			}
			res.status(200).json({ success: true, business });
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
			const business: IBusiness = await Business.create(req.body);
			return res.status(201).json({
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
			const business = await Business.findByIdAndUpdate(id, req.body, {
				new: true,
				runValidators: true,
			});
			if (!updateBusiness) {
				throw new NotFoundError();
			}
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
			const business = await Business.findById(id);
			if (!business) {
				throw new NotFoundError();
			}
			await business.deleteOne();
			res.status(200).json({ success: true, message: "Business deleted successfully" });
		} catch (error) {
			next(error);
		}
	}
);

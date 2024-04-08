import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middleware/asyncHandler";
import { validationResult } from "express-validator";
import { HttpError, HttpStatusCode } from "../types/Errors";
import { businessService as BusinessService } from "../services/BusinessService";
import { reviewService as ReviewService } from "../services/ReviewService";

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
			const businesses = await BusinessService.getAll();
			res.status(200).json({
				success: true,
				message: "Businesses fetched successfully",
				data: businesses,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.NOT_FOUND, `${error}`));
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
			const business = await BusinessService.findById(id);
			res.status(200).json({
				success: true,
				message: "Business fetched successfully",
				data: business,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.NOT_FOUND, "Business not found"));
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
			next(new HttpError(HttpStatusCode.BAD_REQUEST, "Invalid data"));
			return;
		}

		try {
			const business = await BusinessService.create(req.body);
			res.status(201).json({
				success: true,
				message: "Business created successfully",
				data: business,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, `${error}`));
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
			const business = await BusinessService.updateById(id, req.body);
			res.status(200).json({
				success: true,
				message: "Business updated successfully",
				data: business,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, `${error}`));
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
			await BusinessService.deleteById(id);
			res.status(200).json({ success: true, message: "Business deleted successfully" });
		} catch (error) {
			next(new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, `${error}`));
		}
	}
);

/**
 * @description Add a review to a business
 * @name addReviewToBusiness
 * @route POST /api/businesses/:id/reviews
 * @access Private
 * @returns {Promise<Response>}
 */

export const addReviewToBusiness = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const reviewData = req.body;

			const updateBusiness = await ReviewService.addReview(reviewData);

			res.status(200).json({
				success: true,
				message: "Review added successfully",
				data: updateBusiness,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, `${error}`));
		}
	}
);

import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middleware/asyncHandler";
import { validationResult } from "express-validator";
import { HttpError, HttpStatusCode } from "../types/Errors";
import { getErrorMessage } from "../types/modalTypes";
import { santuaryService as SantuaryService } from "../services/SantuaryService";
import { reviewService as ReviewService } from "../services/ReviewService";

/**
 * @description Get all santuaries
 * @name getSantuaries
 * @route GET /api/santuaries
 * @access Public
 * @returns {Promise<Response>}
 */

export const getSantuaries = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const santuaries = await SantuaryService.getAll();
			res.status(200).json({
				success: true,
				message: "Santuaries fetched successfully",
				data: santuaries,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage(error)));
		}
	}
);

/**
 * @description Get a santuary by id
 * @name getSantuaryById
 * @route GET /api/santuaries/:id
 * @access Public
 * @returns {Promise<Response>}
 */

export const getSantuaryById = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const santuary = await SantuaryService.findById(id);
			res.status(200).json({
				success: true,
				message: "Santuary fetched successfully",
				data: santuary,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage(error)));
		}
	}
);

/**
 * @description Create a new santuary
 * @name createSantuary
 * @route POST /api/santuaries
 * @access Private
 */

export const createSantuary = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return next(
				new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(errors.array()[0].msg))
			);
		}

		try {
			const santuary = await SantuaryService.create(req.body);
			res.status(201).json({
				success: true,
				message: "Santuary created successfully",
				data: santuary,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(error)));
		}
	}
);

/**
 * @description Update a santuary
 * @name updateSantuary
 * @route PUT /api/santuaries/:id
 * @access Private
 */

export const updateSantuary = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return next(
				new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(errors.array()[0].msg))
			);
		}

		try {
			const { id } = req.params;
			const santuary = await SantuaryService.updateById(id, req.body);
			res.status(200).json({
				success: true,
				message: "Santuary updated successfully",
				data: santuary,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage(error)));
		}
	}
);

/**
 * @description Delete a santuary
 * @name deleteSantuary
 * @route DELETE /api/santuaries/:id
 * @access Private
 */

export const deleteSantuary = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			await SantuaryService.deleteById(id);
			res.status(200).json({
				success: true,
				message: "Santuary deleted successfully",
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage(error)));
		}
	}
);

/**
 * @description Create a review for a santuary
 * @name addReviewToSantuary
 * @route POST /api/santuaries/:id/reviews
 * @access Private
 * @returns {Promise<Response>}
 */

export const addReviewToSantuary = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const reviewData = { ...req.body, santuaryId: req.params.id };
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

/**
 * @description Get Top rated santuaries
 * @name getTopRatedSantuaries
 * @route GET /api/santuaries/top
 * @access Public
 * @returns {Promise<Response>}
 */

export const getTopRatedSantuaries = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const topRatedSantuary = await ReviewService.getTopRatedReviews("santuary");
			res.status(200).json({
				success: true,
				message: "Top rated santuaries fetched successfully",
				data: topRatedSantuary,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage(error)));
		}
	}
);

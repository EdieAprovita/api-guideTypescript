import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middleware/asyncHandler";
import { validationResult } from "express-validator";
import { HttpError, HttpStatusCode } from "../types/Errors";
import { professionService as ProfessionService } from "../services/ProfessionService";
import { reviewService as ReviewService } from "../services/ReviewService";

/**
 * @description Get all professions
 * @name getProfessions
 * @route GET /api/professions
 * @access Public
 * @returns {Promise<Response>}
 */

export const getProfessions = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const professions = await ProfessionService.getAll();
			res.status(200).json({
				success: true,
				message: "Professions fetched successfully",
				data: professions,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.NOT_FOUND, `${error}`));
		}
	}
);

/**
 * @description Get a profession by id
 * @name getProfessionById
 * @route GET /api/professions/:id
 * @access Public
 * @returns {Promise<Response>}
 */

export const getProfessionById = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const profession = await ProfessionService.findById(id);
			res.status(200).json({
				success: true,
				message: "Profession fetched successfully",
				data: profession,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.NOT_FOUND, "Profession not found"));
		}
	}
);

/**
 * @description Create a new profession
 * @name createProfession
 * @route POST /api/professions
 * @access Private
 * @returns {Promise<Response>}
 */

export const createProfession = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return next(new HttpError(HttpStatusCode.BAD_REQUEST, "Invalid data"));
		}

		try {
			const profession = await ProfessionService.create(req.body);
			res.status(201).json({
				success: true,
				message: "Profession created successfully",
				data: profession,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, `${error}`));
		}
	}
);

/**
 * @description Update a profession
 * @name updateProfession
 * @route PUT /api/professions/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const updateProfession = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return next(new HttpError(HttpStatusCode.BAD_REQUEST, "Invalid data"));
		}

		try {
			const { id } = req.params;
			const profession = await ProfessionService.updateById(id, req.body);
			res.status(200).json({
				success: true,
				message: "Profession updated successfully",
				data: profession,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, `${error}`));
		}
	}
);

/**
 * @description Delete a profession
 * @name deleteProfession
 * @route DELETE /api/professions/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const deleteProfession = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			await ProfessionService.deleteById(id);
			res.status(200).json({
				success: true,
				message: "Profession deleted successfully",
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, `${error}`));
		}
	}
);

/**
 * @description Add a review to a profession
 * @name addReviewToProfession
 * @route POST /api/professions/:id/reviews
 * @access Private
 * @returns {Promise<Response>}
 */

export const addReviewToProfession = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const reviewData = req.body;

			const updatedProfession = await ReviewService.addReview(reviewData);

			res.status(200).json({
				success: true,
				message: "Review added successfully",
				data: updatedProfession,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, `${error}`));
		}
	}
);

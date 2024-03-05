import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middleware/asyncHandler";
import { validationResult } from "express-validator";
import { BadRequestError, InternalServerError } from "../types/Errors";
import { professionProfileService as ProfessionProfileService } from "../services/ProfessionProfileService";

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
			const professions = await ProfessionProfileService.getAll();
			res.status(200).json({
				success: true,
				message: "Professions fetched successfully",
				data: professions,
			});
		} catch (error) {
			next(new InternalServerError(`${error}`));
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
			const profession = await ProfessionProfileService.findById(id);
			res.status(200).json({
				success: true,
				message: "Profession fetched successfully",
				data: profession,
			});
		} catch (error) {
			next(error);
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
			return next(new BadRequestError("Validation failed"));
		}
		try {
			const profession = await ProfessionProfileService.create(req.body);
			res.status(201).json({
				success: true,
				message: "Profession created successfully",
				data: profession,
			});
		} catch (error) {
			next(new InternalServerError(`${error}`));
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
			return next(new BadRequestError("Validation failed"));
		}
		try {
			const { id } = req.params;
			const profession = await ProfessionProfileService.updateById(id, req.body);
			res.status(200).json({
				success: true,
				message: "Profession updated successfully",
				data: profession,
			});
		} catch (error) {
			next(new InternalServerError(`${error}`));
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
			await ProfessionProfileService.deleteById(id);
			res.status(200).json({
				success: true,
				message: "Profession deleted successfully",
			});
		} catch (error) {
			next(new InternalServerError(`${error}`));
		}
	}
);

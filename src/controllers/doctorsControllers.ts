import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middleware/asyncHandler";
import { validationResult } from "express-validator";
import { BadRequestError, InternalServerError } from "../types/Errors";
import DoctorService from "../services/DoctorService";

/**
 * @description Get all doctors
 * @name getDoctors
 * @route GET /api/doctors
 * @access Public
 * @returns {Promise<Response>}
 */

export const getDoctors = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const doctors = await DoctorService.getAllDoctors();
			res.status(200).json({
				success: true,
				message: "Doctors fetched successfully",
				data: doctors,
			});
		} catch (error) {
			next(new InternalServerError(`${error}`));
		}
	}
);

/**
 * @description Get a doctor by id
 * @name getDoctorById
 * @route GET /api/doctors/:id
 * @access Public
 * @returns {Promise<Response>}
 */

export const getDoctorById = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const doctor = await DoctorService.getDoctorById(id);
			res.status(200).json({
				success: true,
				message: "Doctor fetched successfully",
				data: doctor,
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * @description Create a new doctor
 * @name createDoctor
 * @route POST /api/doctors
 * @access Private
 * @returns {Promise<Response>}
 */

export const createDoctor = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return next(new BadRequestError("Invalid data"));
		}
		try {
			const doctor = await DoctorService.createDoctor(req.body);
			res.status(201).json({
				success: true,
				message: "Doctor created successfully",
				data: doctor,
			});
		} catch (error) {
			next(new InternalServerError(`${error}`));
		}
	}
);

/**
 * @description Update a doctor
 * @name updateDoctor
 * @route PUT /api/doctors/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const updateDoctor = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return next(new BadRequestError("Invalid data"));
		}
		try {
			const { id } = req.params;
			const doctor = await DoctorService.updateDoctor(id, req.body);
			res.status(200).json({
				success: true,
				message: "Doctor updated successfully",
				data: doctor,
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * @description Delete a doctor
 * @name deleteDoctor
 * @route DELETE /api/doctors/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const deleteDoctor = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			await DoctorService.deleteDoctor(id);
			res.status(200).json({
				success: true,
				message: "Doctor deleted successfully",
			});
		} catch (error) {
			next(error);
		}
	}
);

import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middleware/asyncHandler";
import { validationResult } from "express-validator";
import { HttpError, HttpStatusCode } from "../types/Errors";
import { getErrorMessage } from "../types/modalTypes";
import { doctorService as DoctorService } from "../services/DoctorService";
import { reviewService as ReviewService } from "../services/ReviewService";
import geocodeAndAssignLocation from "../utils/geocodeLocation";

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
			const doctors = await DoctorService.getAll();
			res.status(200).json({
				success: true,
				message: "Doctors fetched successfully",
				data: doctors,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage(error)));
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
			const doctor = await DoctorService.findById(id);
			res.status(200).json({
				success: true,
				message: "Doctor fetched successfully",
				data: doctor,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage(error)));
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
			return next(
				new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(errors.array()[0].msg))
			);
		}
                try {
                        await geocodeAndAssignLocation(req.body);
                        const doctor = await DoctorService.create(req.body);
			res.status(201).json({
				success: true,
				message: "Doctor created successfully",
				data: doctor,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage(error)));
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
			return next(
				new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(errors.array()[0].msg))
			);
		}
                try {
                        const { id } = req.params;
                        await geocodeAndAssignLocation(req.body);
                        const doctor = await DoctorService.updateById(id, req.body);
			res.status(200).json({
				success: true,
				message: "Doctor updated successfully",
				data: doctor,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage(error)));
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
			await DoctorService.deleteById(id);
			res.status(200).json({
				success: true,
				message: "Doctor deleted successfully",
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage(error)));
		}
	}
);

/**
 * @description Add a review to a doctor
 * @name addReviewToDoctor
 * @route POST /api/doctors/:id/reviews
 * @access Private
 * @returns {Promise<Response>}
 */

export const addReviewToDoctor = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
                        const reviewData = { ...req.body, doctorId: req.params.id };
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
 * @description Get Top rated doctors
 * @name getTopRatedDoctors
 * @route GET /api/doctors/top
 * @access Public
 * @returns {Promise<Response>}
 */

export const getTopRatedDoctors = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const topRatedDoctors = await ReviewService.getTopRatedReviews("doctor");
			res.status(200).json({
				success: true,
				message: "Top rated doctors fetched successfully",
				data: topRatedDoctors,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, getErrorMessage(error)));
		}
	}
);

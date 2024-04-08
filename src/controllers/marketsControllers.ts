import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middleware/asyncHandler";
import { validationResult } from "express-validator";
import { HttpError, HttpStatusCode } from "../types/Errors";
import { marketsService as MarketsService } from "../services/MarketsService";
import { reviewService as ReviewService } from "../services/ReviewService";

/**
 * @description Get all markets
 * @route GET /api/markets
 * @access Public
 * @returns {Promise<Response>}
 */

export const getMarkets = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const markets = await MarketsService.getAll();
			res.status(200).json({
				success: true,
				message: "Markets fetched successfully",
				data: markets,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.NOT_FOUND, `${error}`));
		}
	}
);

/**
 * @description Get a market by id
 * @route GET /api/markets/:id
 * @access Public
 * @returns {Promise<Response>}
 */

export const getMarketById = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const market = await MarketsService.findById(id);
			res.status(200).json({
				success: true,
				message: "Market fetched successfully",
				data: market,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.NOT_FOUND, "Market not found"));
		}
	}
);

/**
 * @description Create a new market
 * @route POST /api/markets
 * @access Private
 * @returns {Promise<Response>}
 */

export const createMarket = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return next(new HttpError(HttpStatusCode.BAD_REQUEST, "Invalid data"));
		}
		try {
			const market = await MarketsService.create(req.body);
			res.status(201).json({
				success: true,
				message: "Market created successfully",
				data: market,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, `${error}`));
		}
	}
);

/**
 * @description Update a market
 * @route PUT /api/markets/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const updateMarket = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return next(new HttpError(HttpStatusCode.BAD_REQUEST, "Invalid data"));
		}
		try {
			const { id } = req.params;
			const market = await MarketsService.updateById(id, req.body);
			res.status(200).json({
				success: true,
				message: "Market updated successfully",
				data: market,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, `${error}`));
		}
	}
);

/**
 * @description Delete a market
 * @route DELETE /api/markets/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const deleteMarket = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			if (!id) throw new HttpError(HttpStatusCode.NOT_FOUND, "Market not found");
			await MarketsService.deleteById(id);
			res.status(200).json({
				success: true,
				message: "Market deleted successfully",
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, `${error}`));
		}
	}
);

/**
 * @description Add review to a market
 * @route POST /api/markets/:id/reviews
 * @access Private
 * @returns {Promise<Response>}
 */

export const addReviewToMarket = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		const reviewData = req.body;
		if (!reviewData.market)
			throw new HttpError(HttpStatusCode.NOT_FOUND, "Market not found");
		const updatedMarket = await ReviewService.addReview(reviewData);

		res.status(200).json({
			success: true,
			message: "Review added successfully",
			data: updatedMarket,
		});
	}
);

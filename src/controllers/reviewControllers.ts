import { Request, Response } from "express";
import asyncHandler from "../middleware/asyncHandler";
import { reviewService as ReviewService } from "../services/ReviewService";
import { BadRequestError, DataNotFoundError, InternalServerError } from "../types/Errors";

/**
 * @description Get all reviews
 * @name listReviews
 */

export const listReviews = asyncHandler(async (req: Request, res: Response) => {
	try {
		const { refId, refModel } = req.params;
		const reviews = await ReviewService.listReviewsForModel(refId, refModel);
		res.status(200).json(reviews);
	} catch (error) {
		throw new InternalServerError("Unable to fetch reviews");
	}
});

/**
 * @description Add a review
 * @name addReview
 */

export const addReview = asyncHandler(async (req: Request, res: Response) => {
	try {
		const reviewData = req.body;
		const newReview = await ReviewService.addReview(reviewData);
		res.status(201).json(newReview);
	} catch (error) {
		throw new BadRequestError("Unable to add review");
	}
});

/**
 * @description Get a review by id
 * @name getReviewById
 */

export const getReviewById = asyncHandler(async (req: Request, res: Response) => {
	try {
		const { reviewId } = req.params;
		const review = await ReviewService.getReviewById(reviewId);
		res.status(200).json({ success: true, data: review });
	} catch (error) {
		throw new DataNotFoundError("Review not found");
	}
});

/**
 * @description Update a review by id
 * @name updateReview
 */

export const updateReview = asyncHandler(async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const review = await ReviewService.updateReview(id, req.body);
		res.status(200).json({ success: true, data: review });
	} catch (error) {
		throw new BadRequestError("Unable to update review");
	}
});

/**
 * @description Delete a review by id
 * @name deleteReview
 */

export const deleteReview = asyncHandler(async (req: Request, res: Response) => {
	try {
		const { reviewId } = req.params;
		await ReviewService.deleteReview(reviewId);
		res.status(200).json({ success: true, message: "Review deleted successfully" });
	} catch (error) {
		throw new BadRequestError("Unable to delete review");
	}
});

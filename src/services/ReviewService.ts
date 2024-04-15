import { Review, IReview } from "../models/Review";
import { HttpError, HttpStatusCode } from "../types/Errors";
import { getErrorMessage } from "../types/modalTypes";

export interface IReviewService {
	addReview(reviewData: Partial<IReview>): Promise<IReview>;
	getReviewById(reviewId: string): Promise<IReview>;
	updateReview(reviewId: string, updateData: Partial<IReview>): Promise<IReview>;
	deleteReview(reviewId: string): Promise<void>;
	listReviewsForModel(refId: string, refModel: string): Promise<IReview[]>;
	getTopRatedReviews(refModel: string): Promise<IReview[]>;
}

/**
 * @description Review service class
 * @name ReviewService
 * @class
 * @returns
 * */

class ReviewService implements IReviewService {
	async addReview(reviewData: Partial<IReview>): Promise<IReview> {
		const review = await Review.create(reviewData);
		return review;
	}

	async getReviewById(reviewId: string): Promise<IReview> {
		const review = await Review.findById(reviewId);
		if (!review) {
			throw new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage("Review not found"));
		}
		return review;
	}

	async updateReview(reviewId: string, updateData: Partial<IReview>): Promise<IReview> {
		const review = await Review.findByIdAndUpdate(reviewId, updateData, { new: true });
		if (!review) {
			throw new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage("Review not found"));
		}
		return review;
	}

	async deleteReview(reviewId: string): Promise<void> {
		const review = await Review.findById(reviewId);
		if (!review) {
			throw new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage("Review not found"));
		}
		await Review.deleteOne({ _id: reviewId });
	}

	async listReviewsForModel(refId: string, refModel: string): Promise<IReview[]> {
		const reviews = await Review.find({ refId, refModel });
		return reviews;
	}

	async getTopRatedReviews(refModel: string): Promise<IReview[]> {
		const reviews = await Review.aggregate([
			{ $match: { refModel } },
			{
				$group: {
					_id: "$refId",
					avgRating: { $avg: "$rating" },
				},
			},
			{ $sort: { avgRating: -1 } },
		]);
		return reviews;
	}
}

export const reviewService = new ReviewService();

import { Review, IReview } from "../models/Review";
import { NotFoundError } from "../types/Errors";

export interface IReviewService {
	addReview(reviewData: Partial<IReview>): Promise<IReview>;
	getReviewById(reviewId: string): Promise<IReview>;
	updateReview(reviewId: string, updateData: Partial<IReview>): Promise<IReview>;
	deleteReview(reviewId: string): Promise<void>;
	listReviewsForModel(refId: string, refModel: string): Promise<IReview[]>;
	getTopRatedModel(refModel: string): Promise<IReview[]>;
}

class ReviewService implements IReviewService {
	async addReview(reviewData: Partial<IReview>): Promise<IReview> {
		const review = await Review.create(reviewData);
		return review;
	}

	async getReviewById(reviewId: string): Promise<IReview> {
		const review = await Review.findById(reviewId);
		if (!review) {
			throw new NotFoundError();
		}
		return review;
	}

	async updateReview(reviewId: string, updateData: Partial<IReview>): Promise<IReview> {
		const review = await Review.findByIdAndUpdate(reviewId, updateData, { new: true });
		if (!review) {
			throw new NotFoundError();
		}
		return review;
	}

	async deleteReview(reviewId: string): Promise<void> {
		const review = await Review.findById(reviewId);
		if (!review) {
			throw new NotFoundError();
		}
		await Review.deleteOne({ _id: reviewId });
	}

	async listReviewsForModel(refId: string, refModel: string): Promise<IReview[]> {
		const reviews = await Review.find({ refId, refModel });
		return reviews;
	}

	async getTopRatedModel(refModel: string): Promise<IReview[]> {
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

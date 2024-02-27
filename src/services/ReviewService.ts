import Review from "../models/Review";
import { IReview } from "../types/modalTypes";
import { NotFoundError } from "../types/Errors";

class ReviewService {
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
}

export const reviewService = new ReviewService();

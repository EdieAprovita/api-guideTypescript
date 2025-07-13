import { Review, IReview } from '../models/Review';
import { HttpError, HttpStatusCode } from '../types/Errors';
import { getErrorMessage } from '../types/modalTypes';
import { Types } from 'mongoose';

export interface IReviewService {
    addReview(reviewData: Partial<IReview>): Promise<IReview>;
    getReviewById(reviewId: string): Promise<IReview>;
    updateReview(reviewId: string, updateData: Partial<IReview>): Promise<IReview>;
    deleteReview(reviewId: string): Promise<void>;
    findByUserAndRestaurant(userId: string, restaurantId: string): Promise<IReview | null>;
    getReviewsByRestaurant(restaurantId: string, options: {
        page: number;
        limit: number;
        rating?: number;
        sort: string;
    }): Promise<{ data: IReview[]; pagination: any }>;
    getReviewStats(restaurantId: string): Promise<any>;
    markAsHelpful(reviewId: string, userId: string): Promise<IReview>;
    removeHelpfulVote(reviewId: string, userId: string): Promise<IReview>;
}

/**
 * @description Review service class
 * @name ReviewService
 * @class
 * @returns {Object}
 * */

class ReviewService implements IReviewService {
    async addReview(reviewData: Partial<IReview>): Promise<IReview> {
        const review = await Review.create(reviewData);
        return review;
    }

    async getReviewById(reviewId: string): Promise<IReview> {
        const review = await Review.findById(reviewId)
            .populate('author', 'firstName lastName')
            .populate('restaurant', 'restaurantName');
        
        if (!review) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage('Review not found'));
        }
        return review;
    }

    async updateReview(reviewId: string, updateData: Partial<IReview>): Promise<IReview> {
        const review = await Review.findByIdAndUpdate(reviewId, updateData, { new: true })
            .populate('author', 'firstName lastName')
            .populate('restaurant', 'restaurantName');
        
        if (!review) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage('Review not found'));
        }
        return review;
    }

    async deleteReview(reviewId: string): Promise<void> {
        const review = await Review.findById(reviewId);
        if (!review) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage('Review not found'));
        }
        await Review.deleteOne({ _id: reviewId });
    }

    async findByUserAndRestaurant(userId: string, restaurantId: string): Promise<IReview | null> {
        return await Review.findOne({ author: userId, restaurant: restaurantId });
    }

    async getReviewsByRestaurant(restaurantId: string, options: {
        page: number;
        limit: number;
        rating?: number;
        sort: string;
    }): Promise<{ data: IReview[]; pagination: any }> {
        const { page, limit, rating, sort } = options;
        const skip = (page - 1) * limit;

        let query: any = { restaurant: restaurantId };
        if (rating) {
            query.rating = rating;
        }

        const [reviews, total] = await Promise.all([
            Review.find(query)
                .populate('author', 'firstName lastName')
                .sort(sort)
                .skip(skip)
                .limit(limit),
            Review.countDocuments(query)
        ]);

        const pages = Math.ceil(total / limit);

        return {
            data: reviews,
            pagination: {
                page,
                limit,
                total,
                pages
            }
        };
    }

    async getReviewStats(restaurantId: string): Promise<any> {
        const stats = await Review.aggregate([
            { $match: { restaurant: new Types.ObjectId(restaurantId) } },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: '$rating' },
                    totalReviews: { $sum: 1 },
                    ratingDistribution: {
                        $push: '$rating'
                    }
                }
            }
        ]);

        if (stats.length === 0) {
            return {
                averageRating: 0,
                totalReviews: 0,
                ratingDistribution: {}
            };
        }

        const ratingDistribution: { [key: number]: number } = {};
        stats[0].ratingDistribution.forEach((rating: number) => {
            ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
        });

        return {
            averageRating: Math.round(stats[0].averageRating * 10) / 10,
            totalReviews: stats[0].totalReviews,
            ratingDistribution
        };
    }

    async markAsHelpful(reviewId: string, userId: string): Promise<IReview> {
        const review = await Review.findById(reviewId);
        if (!review) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage('Review not found'));
        }

        if (review.helpfulVotes.includes(new Types.ObjectId(userId))) {
            throw new HttpError(HttpStatusCode.CONFLICT, getErrorMessage('User has already voted'));
        }

        review.helpfulVotes.push(new Types.ObjectId(userId));
        review.helpfulCount = review.helpfulVotes.length;
        await review.save();

        return review;
    }

    async removeHelpfulVote(reviewId: string, userId: string): Promise<IReview> {
        const review = await Review.findById(reviewId);
        if (!review) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage('Review not found'));
        }

        const userObjectId = new Types.ObjectId(userId);
        const voteIndex = review.helpfulVotes.indexOf(userObjectId);
        
        if (voteIndex === -1) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage('Vote not found'));
        }

        review.helpfulVotes.splice(voteIndex, 1);
        review.helpfulCount = review.helpfulVotes.length;
        await review.save();

        return review;
    }

    // Legacy methods for backward compatibility
    async listReviewsForModel(refId: string, refModel: string): Promise<IReview[]> {
        const reviews = await Review.find({ restaurant: refId });
        return reviews;
    }

    async getTopRatedReviews(refModel: string): Promise<IReview[]> {
        const reviews = await Review.aggregate([
            {
                $group: {
                    _id: '$restaurant',
                    avgRating: { $avg: '$rating' },
                },
            },
            { $sort: { avgRating: -1 } },
        ]);
        return reviews;
    }
}

export const reviewService = new ReviewService();

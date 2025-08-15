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
    getReviewsByRestaurant(
        restaurantId: string,
        options: {
            page: number;
            limit: number;
            rating?: number;
            sort: string;
        }
    ): Promise<{ data: IReview[]; pagination: any }>;
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
        // Validate ObjectId format to prevent injection
        if (!Types.ObjectId.isValid(reviewId)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid review ID format'));
        }

        const review = await Review.findById(reviewId)
            .populate('author', 'firstName lastName')
            .populate('restaurant', 'restaurantName');

        if (!review) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage('Review not found'));
        }
        return review;
    }

    async updateReview(reviewId: string, updateData: Partial<IReview>): Promise<IReview> {
        // Validate ObjectId format to prevent injection
        if (!Types.ObjectId.isValid(reviewId)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid review ID format'));
        }

        const review = await Review.findByIdAndUpdate(reviewId, updateData, { new: true })
            .populate('author', 'firstName lastName')
            .populate('restaurant', 'restaurantName');

        if (!review) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage('Review not found'));
        }
        return review;
    }

    async deleteReview(reviewId: string): Promise<void> {
        // Validate ObjectId format to prevent injection
        if (!Types.ObjectId.isValid(reviewId)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid review ID format'));
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage('Review not found'));
        }
        await Review.deleteOne({ _id: reviewId });
    }

    async findByUserAndRestaurant(userId: string, restaurantId: string): Promise<IReview | null> {
        // Validate ObjectId formats to prevent injection
        if (!Types.ObjectId.isValid(userId)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid user ID format'));
        }
        if (!Types.ObjectId.isValid(restaurantId)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid restaurant ID format'));
        }

        return await Review.findOne({
            author: new Types.ObjectId(userId),
            restaurant: new Types.ObjectId(restaurantId),
        });
    }

    async getReviewsByRestaurant(
        restaurantId: string,
        options: {
            page: number;
            limit: number;
            rating?: number;
            sort: string;
        }
    ): Promise<{ data: IReview[]; pagination: any }> {
        const { page, limit, rating, sort } = options;

        // Validate ObjectId format to prevent injection
        if (!Types.ObjectId.isValid(restaurantId)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid restaurant ID format'));
        }

        // Validate and sanitize pagination parameters
        const sanitizedPage = Math.max(1, Math.floor(Number(page)) || 1);
        const sanitizedLimit = Math.min(100, Math.max(1, Math.floor(Number(limit)) || 10));
        const skip = (sanitizedPage - 1) * sanitizedLimit;

        // Validate and sanitize rating filter
        let query: any = { restaurant: new Types.ObjectId(restaurantId) };
        if (rating !== undefined && rating !== null) {
            const sanitizedRating = Math.floor(Number(rating));
            if (sanitizedRating >= 1 && sanitizedRating <= 5) {
                query.rating = sanitizedRating;
            }
        }

        // Validate and sanitize sort parameter to prevent injection
        const allowedSortFields = ['rating', 'createdAt', 'helpfulCount', 'visitDate'];
        let sanitizedSort: Record<string, 1 | -1> = { createdAt: -1 }; // default sort

        if (sort && typeof sort === 'string') {
            // Handle formats like '-createdAt', 'rating', 'rating:desc'
            let field: string;
            let direction: number = 1;

            if (sort.startsWith('-')) {
                field = sort.substring(1);
                direction = -1;
            } else if (sort.includes(':')) {
                const [sortField, sortDirection] = sort.split(':');
                field = sortField || '';
                direction = sortDirection === 'desc' || sortDirection === '-1' ? -1 : 1;
            } else {
                field = sort;
                direction = 1;
            }

            // Only allow whitelisted fields
            if (allowedSortFields.includes(field)) {
                sanitizedSort = { [field]: direction as 1 | -1 };
            }
        }

        const [reviews, total] = await Promise.all([
            Review.find(query)
                .populate('author', 'firstName lastName')
                .sort(sanitizedSort)
                .skip(skip)
                .limit(sanitizedLimit),
            Review.countDocuments(query),
        ]);

        const pages = Math.ceil(total / sanitizedLimit);

        return {
            data: reviews,
            pagination: {
                page: sanitizedPage,
                limit: sanitizedLimit,
                total,
                pages,
            },
        };
    }

    async getReviewStats(restaurantId: string): Promise<any> {
        // Validate ObjectId format to prevent injection
        if (!Types.ObjectId.isValid(restaurantId)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid restaurant ID format'));
        }

        const stats = await Review.aggregate([
            { $match: { restaurant: new Types.ObjectId(restaurantId) } },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: '$rating' },
                    totalReviews: { $sum: 1 },
                    ratingDistribution: {
                        $push: '$rating',
                    },
                },
            },
        ]);

        if (stats.length === 0) {
            return {
                averageRating: 0,
                totalReviews: 0,
                ratingDistribution: {},
            };
        }

        const ratingDistribution: { [key: number]: number } = {};
        stats[0].ratingDistribution.forEach((rating: number) => {
            ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
        });

        return {
            averageRating: Math.round(stats[0].averageRating * 10) / 10,
            totalReviews: stats[0].totalReviews,
            ratingDistribution,
        };
    }

    async markAsHelpful(reviewId: string, userId: string): Promise<IReview> {
        // Validate ObjectId formats to prevent injection
        if (!Types.ObjectId.isValid(reviewId)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid review ID format'));
        }
        if (!Types.ObjectId.isValid(userId)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid user ID format'));
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage('Review not found'));
        }

        const userObjectId = new Types.ObjectId(userId);
        // Use find() instead of includes() for ObjectId comparison
        const existingVote = review.helpfulVotes.find(vote => vote.toString() === userId);
        if (existingVote) {
            throw new HttpError(HttpStatusCode.CONFLICT, getErrorMessage('User has already voted'));
        }

        review.helpfulVotes.push(userObjectId);
        review.helpfulCount = review.helpfulVotes.length;
        await review.save();

        return review;
    }

    async removeHelpfulVote(reviewId: string, userId: string): Promise<IReview> {
        // Validate ObjectId formats to prevent injection
        if (!Types.ObjectId.isValid(reviewId)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid review ID format'));
        }
        if (!Types.ObjectId.isValid(userId)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid user ID format'));
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage('Review not found'));
        }

        const userObjectId = new Types.ObjectId(userId);
        // Use findIndex() instead of indexOf() for ObjectId comparison
        const voteIndex = review.helpfulVotes.findIndex(vote => vote.toString() === userId);

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
        // Validate ObjectId format to prevent injection
        if (!Types.ObjectId.isValid(refId)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid reference ID format'));
        }

        const reviews = await Review.find({ restaurant: new Types.ObjectId(refId) });
        return reviews;
    }

    async getTopRatedReviews(refModel: string): Promise<IReview[]> {
        // Validate refModel parameter to prevent injection
        const allowedModels = ['restaurant', 'business'];
        if (!allowedModels.includes(refModel)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid model type'));
        }

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

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
        // Sanitize and validate review data to prevent NoSQL injection
        const sanitizedData = this.sanitizeReviewData(reviewData);
        const review = await Review.create(sanitizedData);
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
        await Review.deleteOne({ _id: new Types.ObjectId(reviewId) });
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

    private validateRating(rating: unknown): number {
        const ratingNum = Number(rating);
        if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Rating must be between 1 and 5'));
        }
        return Math.floor(ratingNum);
    }

    private validateTitle(title: unknown): string {
        if (typeof title !== 'string' || title.length < 5 || title.length > 100) {
            throw new HttpError(
                HttpStatusCode.BAD_REQUEST,
                getErrorMessage('Title must be between 5 and 100 characters')
            );
        }
        return title.trim();
    }

    private validateContent(content: unknown): string {
        if (typeof content !== 'string' || content.length < 10 || content.length > 1000) {
            throw new HttpError(
                HttpStatusCode.BAD_REQUEST,
                getErrorMessage('Content must be between 10 and 1000 characters')
            );
        }
        return content.trim();
    }

    private validateVisitDate(visitDate: unknown): Date {
        const date = new Date(visitDate as string);
        if (isNaN(date.getTime())) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid visit date'));
        }
        return date;
    }

    private validateStringArray(items: unknown, maxLength: number, maxItems: number): string[] {
        if (!Array.isArray(items)) {
            return [];
        }
        return items
            .filter(item => typeof item === 'string' && item.trim().length > 0 && item.length <= maxLength)
            .map(item => (item as string).trim())
            .slice(0, maxItems);
    }

    private validateObjectId(id: unknown, fieldName: string): Types.ObjectId {
        if (!Types.ObjectId.isValid(id as string)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(`Invalid ${fieldName} ID`));
        }
        return new Types.ObjectId(id as string);
    }

    private validateAndSanitizeSort(sort: string): Record<string, 1 | -1> {
        const allowedSortFields = ['rating', 'createdAt', 'helpfulCount', 'visitDate'];
        const defaultSort: Record<string, 1 | -1> = { createdAt: -1 };

        if (!sort || typeof sort !== 'string') {
            return defaultSort;
        }

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
            // direction is already 1 by default, no need to reassign
        }

        // Only allow whitelisted fields
        if (allowedSortFields.includes(field)) {
            return { [field]: direction as 1 | -1 };
        }

        return defaultSort;
    }

    private sanitizeReviewData(reviewData: Partial<IReview>): Partial<IReview> {
        const sanitized: Partial<IReview> = {};

        // Validate and sanitize rating
        if (reviewData.rating !== undefined) {
            sanitized.rating = this.validateRating(reviewData.rating);
        }

        // Validate and sanitize title
        if (reviewData.title) {
            sanitized.title = this.validateTitle(reviewData.title);
        }

        // Validate and sanitize content
        if (reviewData.content) {
            sanitized.content = this.validateContent(reviewData.content);
        }

        // Validate and sanitize visit date
        if (reviewData.visitDate) {
            sanitized.visitDate = this.validateVisitDate(reviewData.visitDate);
        }

        // Validate and sanitize recommended dishes
        if (reviewData.recommendedDishes) {
            sanitized.recommendedDishes = this.validateStringArray(reviewData.recommendedDishes, 50, 10);
        }

        // Validate and sanitize tags
        if (reviewData.tags) {
            sanitized.tags = this.validateStringArray(reviewData.tags, 30, 5);
        }

        // Validate and sanitize author ID
        if (reviewData.author) {
            sanitized.author = this.validateObjectId(reviewData.author, 'author');
        }

        // Validate and sanitize restaurant ID
        if (reviewData.restaurant) {
            sanitized.restaurant = this.validateObjectId(reviewData.restaurant, 'restaurant');
        }

        return sanitized;
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

        // Validate and sanitize sort parameter
        const sanitizedSort = this.validateAndSanitizeSort(sort);

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
    async listReviewsForModel(refId: string): Promise<IReview[]> {
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

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

    private sanitizeReviewData(reviewData: Partial<IReview>): Partial<IReview> {
        const sanitized: Partial<IReview> = {};

        // Only allow specific fields and sanitize them
        if (reviewData.rating !== undefined) {
            const rating = Number(reviewData.rating);
            if (isNaN(rating) || rating < 1 || rating > 5) {
                throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Rating must be between 1 and 5'));
            }
            sanitized.rating = Math.floor(rating);
        }

        if (reviewData.title) {
            if (typeof reviewData.title !== 'string' || reviewData.title.length < 5 || reviewData.title.length > 100) {
                throw new HttpError(
                    HttpStatusCode.BAD_REQUEST,
                    getErrorMessage('Title must be between 5 and 100 characters')
                );
            }
            sanitized.title = reviewData.title.trim();
        }

        if (reviewData.content) {
            if (
                typeof reviewData.content !== 'string' ||
                reviewData.content.length < 10 ||
                reviewData.content.length > 1000
            ) {
                throw new HttpError(
                    HttpStatusCode.BAD_REQUEST,
                    getErrorMessage('Content must be between 10 and 1000 characters')
                );
            }
            sanitized.content = reviewData.content.trim();
        }

        if (reviewData.visitDate) {
            const date = new Date(reviewData.visitDate);
            if (isNaN(date.getTime())) {
                throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid visit date'));
            }
            sanitized.visitDate = date;
        }

        if (reviewData.recommendedDishes) {
            if (Array.isArray(reviewData.recommendedDishes)) {
                sanitized.recommendedDishes = reviewData.recommendedDishes
                    .filter(dish => typeof dish === 'string' && dish.trim().length > 0 && dish.length <= 50)
                    .map(dish => dish.trim())
                    .slice(0, 10); // Limit to 10 dishes
            }
        }

        if (reviewData.tags) {
            if (Array.isArray(reviewData.tags)) {
                sanitized.tags = reviewData.tags
                    .filter(tag => typeof tag === 'string' && tag.trim().length > 0 && tag.length <= 30)
                    .map(tag => tag.trim())
                    .slice(0, 5); // Limit to 5 tags
            }
        }

        if (reviewData.author) {
            if (!Types.ObjectId.isValid(reviewData.author)) {
                throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid author ID'));
            }
            sanitized.author = new Types.ObjectId(reviewData.author.toString());
        }

        if (reviewData.restaurant) {
            if (!Types.ObjectId.isValid(reviewData.restaurant)) {
                throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid restaurant ID'));
            }
            sanitized.restaurant = new Types.ObjectId(reviewData.restaurant.toString());
        }

        // Handle polymorphic entity fields and alias mapping
        this.handleEntityFields(reviewData as any, sanitized);

        // Legacy: If no restaurant field set but we have entity data, backfill for compatibility
        if (!sanitized.restaurant && sanitized.entity) {
            sanitized.restaurant = sanitized.entity;
        }

        return sanitized;
    }

    private handleEntityFields(reviewData: any, sanitized: Partial<IReview>): void {
        // Priority 1: Direct polymorphic fields
        if (reviewData.entityType && reviewData.entity) {
            const validEntityTypes = ['Restaurant', 'Recipe', 'Market', 'Business', 'Doctor'];
            if (!validEntityTypes.includes(reviewData.entityType)) {
                throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid entity type'));
            }
            if (!Types.ObjectId.isValid(reviewData.entity)) {
                throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid entity ID'));
            }
            sanitized.entityType = reviewData.entityType;
            sanitized.entity = Types.ObjectId.createFromHexString(reviewData.entity.toString());
            return;
        }

        // Priority 2: Alias mapping (Phase 0 compatibility)
        const aliasMapping: { [key: string]: string } = {
            restaurantId: 'Restaurant',
            restaurant: 'Restaurant',
            recipeId: 'Recipe', 
            recipe: 'Recipe',
            marketId: 'Market',
            market: 'Market',
            businessId: 'Business',
            business: 'Business',
            doctorId: 'Doctor',
            doctor: 'Doctor'
        };

        for (const [field, entityType] of Object.entries(aliasMapping)) {
            if (reviewData[field]) {
                const idStr = reviewData[field].toString();
                if (!Types.ObjectId.isValid(idStr)) {
                    throw new HttpError(
                        HttpStatusCode.BAD_REQUEST,
                        getErrorMessage('Invalid target entity ID')
                    );
                }
                sanitized.entityType = entityType as IReview['entityType'];
                sanitized.entity = Types.ObjectId.createFromHexString(idStr);
                return;
            }
        }

        // Priority 3: Legacy restaurant field (existing behavior)
        if (sanitized.restaurant) {
            sanitized.entityType = 'Restaurant';
            sanitized.entity = sanitized.restaurant;
        }
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

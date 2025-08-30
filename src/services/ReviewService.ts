import { Review, IReview } from '../models/Review';
import { Restaurant } from '../models/Restaurant';
import { Recipe } from '../models/Recipe';
import { Market } from '../models/Market';
import { Business } from '../models/Business';
import { Doctor } from '../models/Doctor';
import { Sanctuary } from '../models/Sanctuary';
import { HttpError, HttpStatusCode } from '../types/Errors';
import { getErrorMessage } from '../types/modalTypes';
import { Types, startSession, ClientSession } from 'mongoose';

type EntityType = 'Restaurant' | 'Recipe' | 'Market' | 'Business' | 'Doctor' | 'Sanctuary';

interface ReviewQueryOptions {
    page: number;
    limit: number;
    rating?: number;
    sort: string;
}

interface PaginatedReviews {
    data: IReview[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
        hasNext: boolean;
        hasPrevious: boolean;
    };
}

interface ReviewStats {
    totalReviews: number;
    averageRating: number;
    ratingDistribution: {
        1: number;
        2: number;
        3: number;
        4: number;
        5: number;
    };
}

export interface IReviewService {
    // Generic methods (new polymorphic API)
    addReview(reviewData: Partial<IReview>): Promise<IReview>;
    getReviewsByEntity(entityType: EntityType, entityId: string, options: ReviewQueryOptions): Promise<PaginatedReviews>;
    getReviewStats(entityType: EntityType, entityId: string): Promise<ReviewStats>;
    findByUserAndEntity(userId: string, entityType: EntityType, entityId: string): Promise<IReview | null>;
    
    // Standard CRUD operations
    getReviewById(reviewId: string): Promise<IReview>;
    updateReview(reviewId: string, updateData: Partial<IReview>): Promise<IReview>;
    deleteReview(reviewId: string): Promise<void>;
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
        const session = await startSession();
        
        try {
            let createdReviewId: string = '';
            
            await session.withTransaction(async () => {
                // Sanitize and validate review data to prevent NoSQL injection
                const sanitizedData = this.sanitizeReviewData(reviewData);
                
                // Create the review
                const [review] = await Review.create([sanitizedData], { session });
                if (!review) {
                    throw new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, getErrorMessage('Failed to create review'));
                }
                createdReviewId = review._id.toString();
                
                // Update entity rating and numReviews atomically
                if (review.entityType && review.entity) {
                    await this.updateEntityRatingAtomic(review.entityType, review.entity, session);
                    
                    // Add review reference to entity
                    await this.addReviewToEntity(review.entityType, review.entity, new Types.ObjectId(review._id), session);
                }
            });
            
            // Fetch populated review outside transaction for return
            const populatedReview = await Review.findById(createdReviewId).populate('author', 'firstName lastName');
            if (!populatedReview) {
                throw new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, getErrorMessage('Review created but not found'));
            }
            return populatedReview;
        } finally {
            await session.endSession();
        }
    }

    // Generic polymorphic methods
    async getReviewsByEntity(entityType: EntityType, entityId: string, options: ReviewQueryOptions): Promise<PaginatedReviews> {
        this.validateEntityTypeAndId(entityType, entityId);

        const { page, limit, rating, sort } = options;

        // Validate and sanitize pagination parameters
        const sanitizedPage = Math.max(1, Math.floor(Number(page)) || 1);
        const sanitizedLimit = Math.min(100, Math.max(1, Math.floor(Number(limit)) || 10));
        const skip = (sanitizedPage - 1) * sanitizedLimit;

        // Build query for polymorphic entity
        const query: Record<string, unknown> = { 
            entityType, 
            entity: Types.ObjectId.createFromHexString(entityId) 
        };

        // Add rating filter if specified
        if (rating !== undefined && rating !== null) {
            const sanitizedRating = Math.floor(Number(rating));
            if (sanitizedRating >= 1 && sanitizedRating <= 5) {
                query.rating = sanitizedRating;
            }
        }

        // Validate and sanitize sort parameter
        const sanitizedSort = this.sanitizeSortOptions(sort);

        const [reviews, total] = await Promise.all([
            Review.find(query)
                .populate('author', 'firstName lastName')
                .sort(sanitizedSort)
                .skip(skip)
                .limit(sanitizedLimit),
            Review.countDocuments(query),
        ]);

        const totalPages = Math.ceil(total / sanitizedLimit);

        return {
            data: reviews,
            pagination: {
                currentPage: sanitizedPage,
                totalPages,
                totalItems: total,
                itemsPerPage: sanitizedLimit,
                hasNext: sanitizedPage < totalPages,
                hasPrevious: sanitizedPage > 1,
            },
        };
    }

    async getReviewStats(entityType: EntityType, entityId: string): Promise<ReviewStats> {
        this.validateEntityTypeAndId(entityType, entityId);

        const stats = await Review.aggregate([
            { 
                $match: { 
                    entityType, 
                    entity: Types.ObjectId.createFromHexString(entityId) 
                } 
            },
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

        if (!stats.length) {
            return {
                totalReviews: 0,
                averageRating: 0,
                ratingDistribution: {
                    1: 0,
                    2: 0,
                    3: 0,
                    4: 0,
                    5: 0,
                },
            };
        }

        const result = stats[0];
        const distribution: ReviewStats['ratingDistribution'] = {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0,
        };

        // Count rating distribution
        for (const rating of result.ratingDistribution) {
            if (rating >= 1 && rating <= 5) {
                distribution[rating as keyof typeof distribution]++;
            }
        }

        return {
            totalReviews: result.totalReviews || 0,
            averageRating: Math.round((result.averageRating || 0) * 100) / 100,
            ratingDistribution: distribution,
        };
    }

    async findByUserAndEntity(userId: string, entityType: EntityType, entityId: string): Promise<IReview | null> {
        // Validate ObjectId formats
        if (!Types.ObjectId.isValid(userId)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid user ID format'));
        }
        this.validateEntityTypeAndId(entityType, entityId);

        return await Review.findOne({
            author: Types.ObjectId.createFromHexString(userId),
            entityType,
            entity: Types.ObjectId.createFromHexString(entityId),
        });
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

        const session = await startSession();
        
        try {
            await session.withTransaction(async () => {
                const review = await Review.findById(reviewId).session(session);
                if (!review) {
                    throw new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage('Review not found'));
                }

                // Update the review
                const updatedReview = await Review.findByIdAndUpdate(reviewId, updateData, { new: true, session });
                if (!updatedReview) {
                    throw new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, getErrorMessage('Failed to update review'));
                }
                
                // If rating was updated, recalculate entity rating
                if (updateData.rating !== undefined && review.entityType && review.entity) {
                    await this.updateEntityRatingAtomic(review.entityType, review.entity, session);
                }
            });
            
            // Fetch populated review outside transaction
            const populatedReview = await Review.findById(reviewId)
                .populate('author', 'firstName lastName');
            
            if (!populatedReview) {
                throw new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage('Review not found after update'));
            }
            return populatedReview;
        } finally {
            await session.endSession();
        }
    }

    async deleteReview(reviewId: string): Promise<void> {
        // Validate ObjectId format to prevent injection
        if (!Types.ObjectId.isValid(reviewId)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid review ID format'));
        }

        const session = await startSession();
        
        try {
            await session.withTransaction(async () => {
                const review = await Review.findById(reviewId).session(session);
                if (!review) {
                    throw new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage('Review not found'));
                }

                // Delete the review
                await Review.deleteOne({ _id: new Types.ObjectId(reviewId) }, { session });
                
                // Update entity rating and remove review reference
                if (review.entityType && review.entity) {
                    await this.updateEntityRatingAtomic(review.entityType, review.entity, session);
                    await this.removeReviewFromEntity(review.entityType, review.entity, new Types.ObjectId(review._id), session);
                }
            });
        } finally {
            await session.endSession();
        }
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

        this.applyRating(reviewData, sanitized);
        this.applyTitle(reviewData, sanitized);
        this.applyContent(reviewData, sanitized);
        this.applyVisitDate(reviewData, sanitized);
        this.applyRecommendedDishes(reviewData, sanitized);
        this.applyTags(reviewData, sanitized);
        this.applyAuthor(reviewData, sanitized);
        this.applyRestaurant(reviewData, sanitized);

        // Handle polymorphic entity fields and alias mapping
        this.handleEntityFields(reviewData as Record<string, unknown>, sanitized);

        // Legacy: If no restaurant field set but we have entity data, backfill for compatibility
        if (!sanitized.restaurant && sanitized.entity) {
            sanitized.restaurant = sanitized.entity;
        }

        return sanitized;
    }

    private handleEntityFields(reviewData: Record<string, unknown>, sanitized: Partial<IReview>): void {
        // Priority 1: Direct polymorphic fields
        if (typeof reviewData.entityType === 'string' && reviewData.entity) {
            const validEntityTypes: EntityType[] = ['Restaurant', 'Recipe', 'Market', 'Business', 'Doctor', 'Sanctuary'];
            if (!validEntityTypes.includes(reviewData.entityType as EntityType)) {
                throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid entity type'));
            }
            const entityIdStr = this.tryExtractObjectIdHex(reviewData.entity);
            if (!entityIdStr) {
                throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid entity ID'));
            }
            sanitized.entityType = reviewData.entityType as EntityType;
            sanitized.entity = Types.ObjectId.createFromHexString(entityIdStr);
            return;
        }

        // Priority 2: Alias mapping (Phase 0 compatibility)
        const aliasMapping: Record<string, EntityType> = {
            restaurantId: 'Restaurant',
            restaurant: 'Restaurant',
            recipeId: 'Recipe', 
            recipe: 'Recipe',
            marketId: 'Market',
            market: 'Market',
            businessId: 'Business',
            business: 'Business',
            doctorId: 'Doctor',
            doctor: 'Doctor',
            sanctuaryId: 'Sanctuary',
            sanctuary: 'Sanctuary'
        };

        for (const [field, entityType] of Object.entries(aliasMapping)) {
            if (reviewData[field]) {
                const idStr = this.tryExtractObjectIdHex(reviewData[field]);
                if (!idStr) {
                    throw new HttpError(
                        HttpStatusCode.BAD_REQUEST,
                        getErrorMessage('Invalid target entity ID')
                    );
                }
                sanitized.entityType = entityType;
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

    // Utility methods
    private tryExtractObjectIdHex(value: unknown): string | null {
        if (typeof value === 'string') {
            return Types.ObjectId.isValid(value) ? value : null;
        }
        if (value instanceof Types.ObjectId) {
            return value.toHexString();
        }
        if (typeof value === 'object' && value !== null) {
            const obj = value as { _id?: unknown; id?: unknown };
            const candidate = obj._id ?? obj.id;
            if (typeof candidate === 'string' && Types.ObjectId.isValid(candidate)) {
                return candidate;
            }
            if (candidate instanceof Types.ObjectId) {
                return candidate.toHexString();
            }
        }
        return null;
    }

    private applyRating(input: Partial<IReview>, out: Partial<IReview>): void {
        if (input.rating !== undefined) {
            const rating = Number(input.rating);
            if (isNaN(rating) || rating < 1 || rating > 5) {
                throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Rating must be between 1 and 5'));
            }
            out.rating = Math.floor(rating);
        }
    }

    private applyTitle(input: Partial<IReview>, out: Partial<IReview>): void {
        if (input.title) {
            if (typeof input.title !== 'string' || input.title.length < 5 || input.title.length > 100) {
                throw new HttpError(
                    HttpStatusCode.BAD_REQUEST,
                    getErrorMessage('Title must be between 5 and 100 characters')
                );
            }
            out.title = input.title.trim();
        }
    }

    private applyContent(input: Partial<IReview>, out: Partial<IReview>): void {
        if (input.content) {
            if (typeof input.content !== 'string' || input.content.length < 10 || input.content.length > 1000) {
                throw new HttpError(
                    HttpStatusCode.BAD_REQUEST,
                    getErrorMessage('Content must be between 10 and 1000 characters')
                );
            }
            out.content = input.content.trim();
        }
    }

    private applyVisitDate(input: Partial<IReview>, out: Partial<IReview>): void {
        if (input.visitDate) {
            const date = new Date(input.visitDate);
            if (isNaN(date.getTime())) {
                throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid visit date'));
            }
            out.visitDate = date;
        }
    }

    private applyRecommendedDishes(input: Partial<IReview>, out: Partial<IReview>): void {
        if (input.recommendedDishes && Array.isArray(input.recommendedDishes)) {
            out.recommendedDishes = input.recommendedDishes
                .filter(dish => typeof dish === 'string' && dish.trim().length > 0 && dish.length <= 50)
                .map(dish => dish.trim())
                .slice(0, 10);
        }
    }

    private applyTags(input: Partial<IReview>, out: Partial<IReview>): void {
        if (input.tags && Array.isArray(input.tags)) {
            out.tags = input.tags
                .filter(tag => typeof tag === 'string' && tag.trim().length > 0 && tag.length <= 30)
                .map(tag => tag.trim())
                .slice(0, 5);
        }
    }

    private applyAuthor(input: Partial<IReview>, out: Partial<IReview>): void {
        if (input.author) {
            const hex = this.tryExtractObjectIdHex(input.author);
            if (!hex) {
                throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid author ID'));
            }
            out.author = new Types.ObjectId(hex);
        }
    }

    private applyRestaurant(input: Partial<IReview>, out: Partial<IReview>): void {
        if (input.restaurant) {
            const hex = this.tryExtractObjectIdHex(input.restaurant);
            if (!hex) {
                throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid restaurant ID'));
            }
            out.restaurant = new Types.ObjectId(hex);
        }
    }
    // Atomic helper methods for rating aggregation
    private async updateEntityRatingAtomic(entityType: EntityType, entityId: Types.ObjectId, session: ClientSession): Promise<void> {
        // Calculate new rating and numReviews from all reviews for this entity
        const stats = await Review.aggregate([
            { $match: { entityType, entity: entityId } },
            { 
                $group: { 
                    _id: null, 
                    averageRating: { $avg: '$rating' }, 
                    totalReviews: { $sum: 1 } 
                } 
            }
        ]).session(session);

        const rating = stats.length ? Math.round((stats[0].averageRating || 0) * 100) / 100 : 0;
        const numReviews = stats.length ? stats[0].totalReviews : 0;

        // Update the entity with new aggregated values using switch for type safety
        switch (entityType) {
            case 'Restaurant':
                await Restaurant.updateOne({ _id: entityId }, { rating, numReviews }, { session });
                break;
            case 'Recipe':
                await Recipe.updateOne({ _id: entityId }, { rating, numReviews }, { session });
                break;
            case 'Market':
                await Market.updateOne({ _id: entityId }, { rating, numReviews }, { session });
                break;
            case 'Business':
                await Business.updateOne({ _id: entityId }, { rating, numReviews }, { session });
                break;
            case 'Doctor':
                await Doctor.updateOne({ _id: entityId }, { rating, numReviews }, { session });
                break;
            case 'Sanctuary':
                await Sanctuary.updateOne({ _id: entityId }, { rating, numReviews }, { session });
                break;
            default:
                throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Unsupported entity type'));
        }
    }

    private async addReviewToEntity(entityType: EntityType, entityId: Types.ObjectId, reviewId: Types.ObjectId, session: ClientSession): Promise<void> {
        switch (entityType) {
            case 'Restaurant':
                await Restaurant.updateOne({ _id: entityId }, { $addToSet: { reviews: reviewId } }, { session });
                break;
            case 'Recipe':
                await Recipe.updateOne({ _id: entityId }, { $addToSet: { reviews: reviewId } }, { session });
                break;
            case 'Market':
                await Market.updateOne({ _id: entityId }, { $addToSet: { reviews: reviewId } }, { session });
                break;
            case 'Business':
                await Business.updateOne({ _id: entityId }, { $addToSet: { reviews: reviewId } }, { session });
                break;
            case 'Doctor':
                await Doctor.updateOne({ _id: entityId }, { $addToSet: { reviews: reviewId } }, { session });
                break;
            case 'Sanctuary':
                await Sanctuary.updateOne({ _id: entityId }, { $addToSet: { reviews: reviewId } }, { session });
                break;
            default:
                throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Unsupported entity type'));
        }
    }

    private async removeReviewFromEntity(entityType: EntityType, entityId: Types.ObjectId, reviewId: Types.ObjectId, session: ClientSession): Promise<void> {
        switch (entityType) {
            case 'Restaurant':
                await Restaurant.updateOne({ _id: entityId }, { $pull: { reviews: reviewId } }, { session });
                break;
            case 'Recipe':
                await Recipe.updateOne({ _id: entityId }, { $pull: { reviews: reviewId } }, { session });
                break;
            case 'Market':
                await Market.updateOne({ _id: entityId }, { $pull: { reviews: reviewId } }, { session });
                break;
            case 'Business':
                await Business.updateOne({ _id: entityId }, { $pull: { reviews: reviewId } }, { session });
                break;
            case 'Doctor':
                await Doctor.updateOne({ _id: entityId }, { $pull: { reviews: reviewId } }, { session });
                break;
            case 'Sanctuary':
                await Sanctuary.updateOne({ _id: entityId }, { $pull: { reviews: reviewId } }, { session });
                break;
            default:
                throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Unsupported entity type'));
        }
    }

    private validateEntityTypeAndId(entityType: EntityType, entityId: string): void {
        const validEntityTypes: EntityType[] = ['Restaurant', 'Recipe', 'Market', 'Business', 'Doctor', 'Sanctuary'];
        if (!validEntityTypes.includes(entityType)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid entity type'));
        }
        if (!Types.ObjectId.isValid(entityId)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid entity ID format'));
        }
    }

    private sanitizeSortOptions(sort: string): Record<string, 1 | -1> {
        const allowedSortFields = ['rating', 'createdAt', 'helpfulCount', 'visitDate'];
        let sanitizedSort: Record<string, 1 | -1> = { createdAt: -1 }; // default sort

        if (sort && typeof sort === 'string') {
            // Handle formats like '-createdAt', 'rating', 'rating:desc'
            let field: string;
            let direction: number;

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

        return sanitizedSort;
    }

    // Legacy methods for backward compatibility - deprecated, will be removed in Phase 9
    /** @deprecated Use getReviewsByEntity instead */
    async listReviewsForModel(refId: string): Promise<IReview[]> {
        // Validate ObjectId format to prevent injection
        if (!Types.ObjectId.isValid(refId)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid reference ID format'));
        }

        // Use polymorphic approach instead of legacy restaurant field
        const reviews = await Review.find({ 
            entityType: 'Restaurant',
            entity: new Types.ObjectId(refId) 
        });
        return reviews;
    }

    /** @deprecated Use getReviewStats with entityType instead */
    async getTopRatedReviews(refModel: string): Promise<IReview[]> {
        // Validate refModel parameter to prevent injection
        const allowedModels = ['restaurant', 'business'];
        if (!allowedModels.includes(refModel)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid model type'));
        }

        // Map legacy model names to EntityType
        const entityType = refModel === 'restaurant' ? 'Restaurant' : 'Business';

        const reviews = await Review.aggregate([
            { $match: { entityType } },
            {
                $group: {
                    _id: '$entity',
                    avgRating: { $avg: '$rating' },
                },
            },
            { $sort: { avgRating: -1 } },
        ]);
        return reviews;
    }

}

export const reviewService = new ReviewService();

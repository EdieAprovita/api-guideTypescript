import { Review, IReview } from '../models/Review.js';
import { HttpError, HttpStatusCode } from '../types/Errors.js';
import { cacheService } from './CacheService.js';
import { Types, startSession } from 'mongoose';
import logger from '../utils/logger.js';
import {
    buildReviewEntityMatch,
    buildReviewQuery,
    buildReviewUpdatePayload,
    ReviewFilters,
    VALID_ENTITY_TYPES,
    ValidEntityType,
} from './reviewService/reviewPolicies.js';
import { ReviewStats, PaginationOptions } from './reviewService/reviewTypes.js';
import { invalidateReviewCache, buildReviewListCacheKey } from './reviewService/reviewCacheHelpers.js';
import {
    extractPaginationParams,
    extractSortParams,
    extractRatingForKey,
} from './reviewService/reviewPaginationHelpers.js';
import { validateEntityTypeAndId, recalculateEntityRating } from './reviewService/reviewEntityHelpers.js';

export const reviewService = {
    async getReviewsByEntity(
        entityType: string,
        entityId: string,
        filters: ReviewFilters = {},
        pagination: PaginationOptions = {}
    ): Promise<{
        data: IReview[];
        pagination: {
            currentPage: number;
            totalPages: number;
            totalItems: number;
            itemsPerPage: number;
            hasNext: boolean;
            hasPrevious: boolean;
        };
    }> {
        await validateEntityTypeAndId(entityType, entityId);

        const { page, limit } = extractPaginationParams(filters, pagination);
        const { sortField, sortDir } = extractSortParams(filters, pagination);
        const ratingForKey = extractRatingForKey(filters);

        const cacheKey = buildReviewListCacheKey(
            entityType,
            entityId,
            page,
            limit,
            sortField,
            ratingForKey,
            pagination.sortOrder
        );

        const cached = await cacheService.get<{
            data: IReview[];
            pagination: {
                currentPage: number;
                totalPages: number;
                totalItems: number;
                itemsPerPage: number;
                hasNext: boolean;
                hasPrevious: boolean;
            };
        }>(cacheKey);
        if (cached) {
            return cached;
        }

        const skip = (page - 1) * limit;
        const query = buildReviewQuery(entityType, entityId, filters);
        const sortOptions: Record<string, 1 | -1> = {};
        sortOptions[sortField] = sortDir;

        const [reviews, totalCount] = await Promise.all([
            Review.find(query).populate('author', 'name').sort(sortOptions).skip(skip).limit(limit),
            Review.countDocuments(query),
        ]);

        const totalPages = Math.ceil(totalCount / limit);
        const result = {
            data: reviews,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: totalCount,
                itemsPerPage: limit,
                hasNext: page < totalPages,
                hasPrevious: page > 1,
            },
        } as const;

        await cacheService.setWithTags(cacheKey, result, [`reviews:${entityType}:${entityId}`, 'reviews']);
        return result as any;
    },

    async getReviewStats(entityType: string, entityId: string): Promise<ReviewStats> {
        await validateEntityTypeAndId(entityType, entityId);

        const cacheKey = `reviews:stats:${entityType}:${entityId}`;
        const cached = await cacheService.get<ReviewStats>(cacheKey);
        if (cached) {
            return cached;
        }

        // Use aggregation to align with tests and avoid heavy in-memory work
        const agg = await Review.aggregate([
            {
                $match: buildReviewEntityMatch(entityType as ValidEntityType, entityId),
            },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: '$rating' },
                    totalReviews: { $sum: 1 },
                    ratingDistribution: { $push: '$rating' },
                },
            },
        ]);

        const base = agg[0] || { averageRating: 0, totalReviews: 0, ratingDistribution: [] as number[] };
        const rd = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
        (base.ratingDistribution as number[]).forEach(r => {
            const key = Math.max(1, Math.min(5, Math.round(r))) as 1 | 2 | 3 | 4 | 5;
            rd[key] = (rd[key] || 0) + 1;
        });

        const stats: ReviewStats = {
            totalReviews: base.totalReviews || 0,
            averageRating: Math.round(((base.averageRating || 0) as number) * 100) / 100,
            ratingDistribution: rd as any,
        };

        await cacheService.setWithTags(cacheKey, stats, [`reviews:${entityType}:${entityId}`, 'reviews']);
        return stats;
    },

    async addReview(reviewData: Partial<IReview>): Promise<IReview> {
        if (!reviewData.entityType || !reviewData.entity) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Entity type and entity ID are required');
        }

        await validateEntityTypeAndId(reviewData.entityType, reviewData.entity.toString());

        if (!reviewData.author || !Types.ObjectId.isValid(reviewData.author.toString())) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Valid author ID is required');
        }

        // 🔒 Build query safely with validated ObjectIds to prevent NoSQL injection
        const authorId = new Types.ObjectId(reviewData.author.toString());
        const entityId = new Types.ObjectId(reviewData.entity.toString());
        const entityTypeValue = String(reviewData.entityType);

        const existingReview = await Review.findOne({
            author: authorId,
            ...buildReviewEntityMatch(entityTypeValue, entityId),
        });

        if (existingReview) {
            throw new HttpError(HttpStatusCode.CONFLICT, 'User has already reviewed this entity');
        }

        // Capture narrowed values before the async transaction boundary so
        // TypeScript control-flow narrowing is preserved inside the callback.
        const narrowedEntityType: string = entityTypeValue;
        const narrowedEntityId: string = entityId.toString();

        const session = await startSession({
            defaultTransactionOptions: { writeConcern: { w: 'majority' } },
        });

        try {
            const review = await session.withTransaction(async () => {
                const [newReview] = await Review.create([reviewData], { session });
                // Recalculate inside the same transaction for atomicity
                await recalculateEntityRating(narrowedEntityType, narrowedEntityId, session);
                return newReview;
            });

            if (!review) {
                throw new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, 'Failed to create review');
            }

            logger.info('Entity rating recalculated', {
                operation: 'entity_rating_recalculated',
                entityType: narrowedEntityType,
                entityId: narrowedEntityId,
            });

            // Fetch populated review for logging
            const populatedReview = await Review.findById(review._id).populate('author', 'firstName lastName');

            await invalidateReviewCache(review.entityType, review.entity.toString(), cacheService);

            // Phase 8: Structured logging
            if (populatedReview) {
                logger.info('Review created successfully', {
                    operation: 'review_created',
                    entityType: populatedReview.entityType,
                    entityId: populatedReview.entity?.toString(),
                    authorId: populatedReview.author?._id?.toString(),
                    reviewId: populatedReview._id,
                    rating: populatedReview.rating,
                });
            }

            return populatedReview ?? review;
        } finally {
            await session.endSession();
        }
    },

    // Backward-compatible alias
    createReview(reviewData: Partial<IReview>): Promise<IReview> {
        return this.addReview(reviewData);
    },

    async updateReview(reviewId: string, updateData: Partial<IReview>, userId: string): Promise<IReview> {
        if (!Types.ObjectId.isValid(reviewId)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Invalid review ID format');
        }

        if (!Types.ObjectId.isValid(userId)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Invalid user ID format');
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, 'Review not found');
        }

        if (review.author.toString() !== userId) {
            throw new HttpError(HttpStatusCode.FORBIDDEN, 'Unauthorized to update this review');
        }

        const sanitizedUpdate = buildReviewUpdatePayload(updateData as Record<string, unknown>);

        const session = await startSession({
            defaultTransactionOptions: { writeConcern: { w: 'majority' } },
        });

        try {
            const updatedReview = await session.withTransaction(async () => {
                const updated = await Review.findByIdAndUpdate(reviewId, sanitizedUpdate, {
                    new: true,
                    session,
                    runValidators: true,
                    context: 'query',
                }).populate('author', 'firstName lastName');
                if (!updated) {
                    throw new HttpError(HttpStatusCode.NOT_FOUND, 'Review not found');
                }
                await recalculateEntityRating(updated.entityType, updated.entity?.toString() ?? '', session);
                return updated;
            });

            if (updatedReview) {
                logger.info('Entity rating recalculated', {
                    operation: 'entity_rating_recalculated',
                    entityType: updatedReview.entityType,
                    entityId: updatedReview.entity?.toString(),
                });

                const entityIdStr = updatedReview.entity?.toString();
                if (!entityIdStr) {
                    logger.warn('updateReview: committed document missing entity — skipping cache invalidation', {
                        reviewId: updatedReview._id,
                    });
                } else {
                    await invalidateReviewCache(updatedReview.entityType, entityIdStr, cacheService);
                }

                // Phase 8: Structured logging
                logger.info('Review updated successfully', {
                    operation: 'review_updated',
                    entityType: updatedReview.entityType,
                    entityId: updatedReview.entity?.toString(),
                    authorId: updatedReview.author?._id?.toString(),
                    reviewId: updatedReview._id,
                    rating: updatedReview.rating,
                });
            }

            return updatedReview!;
        } finally {
            await session.endSession();
        }
    },

    async deleteReview(reviewId: string, userId: string): Promise<void> {
        if (!Types.ObjectId.isValid(reviewId)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Invalid review ID format');
        }

        if (!Types.ObjectId.isValid(userId)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Invalid user ID format');
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, 'Review not found');
        }

        if (review.author.toString() !== userId) {
            throw new HttpError(HttpStatusCode.FORBIDDEN, 'Unauthorized to delete this review');
        }

        const session = await startSession({
            defaultTransactionOptions: { writeConcern: { w: 'majority' } },
        });
        const entityToInvalidate = {
            entityType: review.entityType,
            entityId: review.entity.toString(),
        };

        try {
            await session.withTransaction(async () => {
                await Review.findByIdAndDelete(reviewId, { session });
                await recalculateEntityRating(entityToInvalidate.entityType, entityToInvalidate.entityId, session);
            });

            logger.info('Entity rating recalculated', {
                operation: 'entity_rating_recalculated',
                entityType: entityToInvalidate.entityType,
                entityId: entityToInvalidate.entityId,
            });

            await invalidateReviewCache(entityToInvalidate.entityType, entityToInvalidate.entityId, cacheService);

            // Phase 8: Structured logging
            logger.info('Review deleted successfully', {
                operation: 'review_deleted',
                entityType: entityToInvalidate.entityType,
                entityId: entityToInvalidate.entityId,
                reviewId,
            });
        } finally {
            await session.endSession();
        }
    },

    async markAsHelpful(reviewId: string, userId: string): Promise<IReview> {
        if (!Types.ObjectId.isValid(reviewId)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Invalid review ID format');
        }

        if (!Types.ObjectId.isValid(userId)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Invalid user ID format');
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, 'Review not found');
        }

        const userObjectId = new Types.ObjectId(userId);
        if (review.helpfulVotes.some(vote => vote.toString() === userId)) {
            throw new HttpError(HttpStatusCode.CONFLICT, 'User has already voted this review as helpful');
        }

        const session = await startSession({
            defaultTransactionOptions: { writeConcern: { w: 'majority' } },
        });

        try {
            const updatedReview = await session.withTransaction(async () => {
                review.helpfulVotes.push(userObjectId);
                review.helpfulCount = review.helpfulVotes.length;
                return await review.save({ session });
            });

            await cacheService.invalidateByTag(`reviews:${review.entityType}:${review.entity}`);

            // Phase 8: Structured logging
            logger.info('Helpful vote added successfully', {
                operation: 'helpful_vote_added',
                entityType: review.entityType,
                entityId: review.entity?.toString(),
                reviewId: review._id,
                userId,
            });

            return updatedReview;
        } finally {
            await session.endSession();
        }
    },

    async removeHelpfulVote(reviewId: string, userId: string): Promise<IReview> {
        if (!Types.ObjectId.isValid(reviewId)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Invalid review ID format');
        }

        if (!Types.ObjectId.isValid(userId)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Invalid user ID format');
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, 'Review not found');
        }

        const voteIndex = review.helpfulVotes.findIndex(vote => vote.toString() === userId);
        if (voteIndex === -1) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, 'Vote not found');
        }

        const session = await startSession({
            defaultTransactionOptions: { writeConcern: { w: 'majority' } },
        });

        try {
            const updatedReview = await session.withTransaction(async () => {
                review.helpfulVotes.splice(voteIndex, 1);
                review.helpfulCount = review.helpfulVotes.length;
                return await review.save({ session });
            });

            await cacheService.invalidateByTag(`reviews:${review.entityType}:${review.entity}`);

            // Phase 8: Structured logging
            logger.info('Helpful vote removed successfully', {
                operation: 'helpful_vote_removed',
                entityType: review.entityType,
                entityId: review.entity?.toString(),
                reviewId: review._id,
                userId,
            });

            return updatedReview;
        } finally {
            await session.endSession();
        }
    },

    async findByUserAndEntity(userId: string, entityType: string, entityId: string): Promise<IReview | null> {
        if (!Types.ObjectId.isValid(userId)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Invalid user ID format');
        }

        await validateEntityTypeAndId(entityType, entityId);

        return await Review.findOne({
            author: new Types.ObjectId(userId),
            ...buildReviewEntityMatch(entityType, entityId),
        });
    },

    async getReviewById(reviewId: string): Promise<IReview> {
        if (!Types.ObjectId.isValid(reviewId)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Invalid review ID format');
        }

        const cacheKey = `review:${reviewId}`;
        const cached = await cacheService.get<IReview>(cacheKey);
        if (cached) {
            return cached;
        }

        const review = await Review.findById(reviewId).populate('author', 'name');
        if (!review) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, 'Review not found');
        }

        await cacheService.setWithTags(cacheKey, review, [`reviews:${review.entityType}:${review.entity}`], 300);
        return review;
    },

    async getTopRatedReviews(entityType: string): Promise<IReview[]> {
        const normalizedType = entityType.charAt(0).toUpperCase() + entityType.slice(1).toLowerCase();

        if (!VALID_ENTITY_TYPES.includes(normalizedType as ValidEntityType)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, `Invalid entity type: ${entityType}`);
        }

        const cacheKey = `top-rated-reviews:${normalizedType}`;
        const cached = await cacheService.get<IReview[]>(cacheKey);
        if (cached) {
            return cached;
        }

        const reviews = await Review.find({
            entityType: normalizedType,
            rating: { $gte: 4 },
        })
            .sort({ rating: -1, helpfulCount: -1, createdAt: -1 })
            .limit(10)
            .populate('author', 'name');

        await cacheService.setWithTags(cacheKey, reviews, [`reviews:${normalizedType}`, 'top-rated'], 600);
        return reviews;
    },

    async listReviewsForModel(entityId: string): Promise<IReview[]> {
        if (!Types.ObjectId.isValid(entityId)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Invalid entity ID format');
        }

        const cacheKey = `reviews-for-entity:${entityId}`;
        const cached = await cacheService.get<IReview[]>(cacheKey);
        if (cached) {
            return cached;
        }

        const reviews = await Review.find({
            $or: [{ entity: new Types.ObjectId(entityId) }, { restaurant: new Types.ObjectId(entityId) }],
        })
            .populate('author', 'name')
            .sort({ createdAt: -1 });

        // Always include a stable entity-scoped tag so mutations can invalidate
        // this cache entry even when the reviews array is empty (no entityType
        // to derive from). Entity-type-specific tags are added when available.
        const tags = ['reviews', `reviews:entity:${entityId}`];
        const firstReview = reviews[0] as IReview | undefined;
        if (firstReview?.entityType) {
            tags.push(`reviews:${firstReview.entityType}:${entityId}`);
        }
        await cacheService.setWithTags(cacheKey, reviews, tags, 300);
        return reviews;
    },
};

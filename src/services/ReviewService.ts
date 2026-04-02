import { Review, IReview } from '../models/Review.js';
import { HttpError, HttpStatusCode } from '../types/Errors.js';
import { cacheService } from './CacheService.js';
import mongoose, { Types, startSession } from 'mongoose';
import logger from '../utils/logger.js';

interface ReviewFilters {
    entityType?: string;
    entity?: string;
    rating?: number | { $gte?: number; $lte?: number };
    author?: string;
    sort?: string;
    page?: number;
    limit?: number;
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

interface PaginationOptions {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

const VALID_ENTITY_TYPES = ['Restaurant', 'Recipe', 'Market', 'Business', 'Doctor', 'Sanctuary'] as const;

/**
 * Whitelist of fields that users are allowed to modify via updateReview.
 * Prevents mass assignment of protected fields such as author, entity,
 * entityType, helpfulVotes, helpfulCount, and timestamps.
 *
 * Security: OWASP A04:2021 – Insecure Design / Mass Assignment
 */
const ALLOWED_REVIEW_UPDATE_FIELDS = ['rating', 'content', 'title', 'visitDate', 'recommendedDishes', 'tags'] as const;
type ValidEntityType = (typeof VALID_ENTITY_TYPES)[number];

/**
 * Dynamically imports and returns the Mongoose model for a given entity type.
 * Returns null in test environment to avoid heavy module imports.
 */
const getEntityModel = async (entityType: string): Promise<mongoose.Model<any> | null> => {
    if (!VALID_ENTITY_TYPES.includes(entityType as ValidEntityType)) {
        throw new HttpError(HttpStatusCode.BAD_REQUEST, `Invalid entity type: ${entityType}`);
    }

    // Skip dynamic imports in test environment to avoid mocking conflicts
    if (process.env.NODE_ENV === 'test') return null;

    switch (entityType as ValidEntityType) {
        case 'Restaurant':
            return (await import('../models/Restaurant.js')).Restaurant;
        case 'Recipe':
            return (await import('../models/Recipe.js')).Recipe;
        case 'Market':
            return (await import('../models/Market.js')).Market;
        case 'Business':
            return (await import('../models/Business.js')).Business;
        case 'Doctor':
            return (await import('../models/Doctor.js')).Doctor;
        case 'Sanctuary':
            return (await import('../models/Sanctuary.js')).Sanctuary;
        default:
            throw new HttpError(HttpStatusCode.BAD_REQUEST, `Invalid entity type: ${entityType}`);
    }
};

const validateEntityTypeAndId = async (entityType: string, entityId: string): Promise<void> => {
    if (!Types.ObjectId.isValid(entityId)) {
        throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Invalid entity ID format');
    }

    const EntityModel = await getEntityModel(entityType);
    if (!EntityModel) return; // test environment

    const entity = await EntityModel.findById(entityId);
    if (!entity) {
        throw new HttpError(HttpStatusCode.NOT_FOUND, `${entityType} not found`);
    }
};

/**
 * Recalculates and syncs the denormalized rating and numReviews fields on the
 * parent entity after any review mutation.
 *
 * Uses aggregation to compute the average rating and count, then updates the
 * entity document atomically. When no reviews remain, resets to defaults (0, 0).
 */
const recalculateEntityRating = async (
    entityType: string,
    entityId: string,
    session?: mongoose.ClientSession
): Promise<void> => {
    const EntityModel = await getEntityModel(entityType);
    if (!EntityModel) return; // test environment

    if (!entityId || !Types.ObjectId.isValid(entityId)) {
        logger.warn('Skipping rating recalculation: invalid entity ID', { entityType, entityId });
        return;
    }

    const safeEntityId = new Types.ObjectId(entityId);

    // Single aggregation pipeline to compute avgRating and count atomically
    const pipeline = [
        { $match: { entity: safeEntityId, entityType } },
        {
            $group: {
                _id: null,
                avgRating: { $avg: '$rating' },
                count: { $sum: 1 },
            },
        },
    ];

    const aggregationResult = session
        ? await Review.aggregate(pipeline).session(session)
        : await Review.aggregate(pipeline);

    const stats = aggregationResult[0];
    const avgRating = stats ? Math.round(stats.avgRating * 10) / 10 : 0;
    const count = stats ? stats.count : 0;

    // Only denormalize rating and numReviews — the full review list is queried
    // from the Review collection directly when needed (avoids unbounded array growth)
    const updateOpts = session ? { session } : {};
    await EntityModel.findByIdAndUpdate(entityId, { rating: avgRating, numReviews: count }, updateOpts);

    // NOTE: callers are responsible for logging after the transaction commits
    // to avoid duplicate log entries on Mongoose transaction retries.
};

const buildReviewListCacheKey = (
    entityType: string,
    entityId: string,
    page: number,
    limit: number,
    sortField: string,
    rating?: number
): string => {
    const parts = [`p=${page}`, `l=${limit}`];
    if (typeof rating === 'number') parts.push(`r=${rating}`);
    parts.push(`s=${sortField}`);
    return `reviews:${entityType}:${entityId}:` + parts.join('&');
};

const extractPaginationParams = (filters: ReviewFilters, pagination: PaginationOptions) => {
    const page = Math.max(1, pagination.page ?? filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, pagination.limit ?? filters.limit ?? 10));
    return { page, limit };
};

const extractSortParams = (filters: ReviewFilters, pagination: PaginationOptions) => {
    const sortRaw: string | undefined = (pagination as any).sortBy ?? filters.sort ?? undefined;
    const sortFieldRaw = typeof sortRaw === 'string' ? sortRaw : undefined;
    const sortIsDesc = sortFieldRaw?.startsWith('-') ?? false;
    const sortFieldClean = sortFieldRaw?.replace(/^-/, '') || undefined;
    const allowedSortFields = new Set(['rating', 'createdAt', 'helpfulCount', 'visitDate']);
    const sortField = sortFieldClean && allowedSortFields.has(sortFieldClean) ? sortFieldClean : 'createdAt';

    let sortDir: 1 | -1;
    if (sortIsDesc) {
        sortDir = -1;
    } else if (pagination.sortOrder === 'asc') {
        sortDir = 1;
    } else {
        sortDir = -1;
    }

    return { sortField, sortDir };
};

const extractRatingForKey = (filters: ReviewFilters): number | undefined => {
    const prelimRating = filters.rating;
    if (typeof prelimRating === 'number') {
        return Math.max(1, Math.min(5, prelimRating));
    }
    return undefined;
};

const buildSafeQuery = (entityType: string, entityId: string, filters: ReviewFilters) => {
    const objectId = new Types.ObjectId(entityId);
    const query: Record<string, unknown> = {
        entityType,
        // Support legacy 'restaurant' field for backward compatibility
        $or: [{ entity: objectId }, { restaurant: objectId }],
    };

    if (filters.author && typeof filters.author === 'string' && Types.ObjectId.isValid(filters.author)) {
        query.author = new Types.ObjectId(filters.author);
    }

    if (typeof filters.rating === 'number') {
        const r = Math.max(1, Math.min(5, filters.rating));
        query.rating = r;
    } else if (filters.rating && typeof filters.rating === 'object') {
        const range: Record<string, number> = {};
        if (typeof (filters.rating as any).$gte === 'number') {
            range.$gte = Math.max(1, Math.min(5, (filters.rating as any).$gte));
        }
        if (typeof (filters.rating as any).$lte === 'number') {
            range.$lte = Math.max(1, Math.min(5, (filters.rating as any).$lte));
        }
        if (Object.keys(range).length) {
            query.rating = range;
        }
    }

    return query;
};

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

        const cacheKey = buildReviewListCacheKey(entityType, entityId, page, limit, sortField, ratingForKey);

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
        const query = buildSafeQuery(entityType, entityId, filters);
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
        const safeEntityId = new Types.ObjectId(entityId);
        const safeEntityType = entityType as ValidEntityType;
        const agg = await Review.aggregate([
            {
                $match: {
                    $or: [{ entityType: safeEntityType, entity: safeEntityId }, { restaurant: safeEntityId }],
                },
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

        if (!reviewData.author || !mongoose.Types.ObjectId.isValid(reviewData.author.toString())) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Valid author ID is required');
        }

        // 🔒 Build query safely with validated ObjectIds to prevent NoSQL injection
        const authorId = new Types.ObjectId(reviewData.author.toString());
        const entityId = new Types.ObjectId(reviewData.entity.toString());
        const entityTypeValue = String(reviewData.entityType);

        const existingReview = await Review.findOne({
            author: authorId,
            entityType: entityTypeValue,
            entity: entityId,
        });

        if (existingReview) {
            throw new HttpError(HttpStatusCode.CONFLICT, 'User has already reviewed this entity');
        }

        // Capture narrowed values before the async transaction boundary so
        // TypeScript control-flow narrowing is preserved inside the callback.
        const narrowedEntityType: string = entityTypeValue;
        const narrowedEntityId: string = entityId.toString();

        const session = await startSession();

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

            await cacheService.invalidateByTag(`reviews:${reviewData.entityType}:${reviewData.entity}`);
            await cacheService.invalidateByTag(`reviews:entity:${reviewData.entity}`);

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

        // Sanitize input: only allow whitelisted fields to prevent mass assignment.
        // The virtual alias 'comment' is mapped to the actual schema field 'content'.
        // Security: OWASP A04:2021 – Insecure Design / Mass Assignment
        const safeSource = updateData as Record<string, unknown>;
        const sanitizedUpdate: Record<string, unknown> = {};

        for (const field of ALLOWED_REVIEW_UPDATE_FIELDS) {
            if (field in safeSource) {
                sanitizedUpdate[field] = safeSource[field];
            }
        }

        // Map 'comment' alias to 'content' only if 'content' was not explicitly provided
        if (!('content' in safeSource) && 'comment' in safeSource) {
            sanitizedUpdate['content'] = safeSource['comment'];
        }

        sanitizedUpdate['updatedAt'] = new Date();

        // Only updatedAt means no valid fields were provided
        if (Object.keys(sanitizedUpdate).length === 1) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, 'No valid fields provided to update review');
        }

        const session = await startSession();

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

                await cacheService.invalidateByTag(`reviews:${updatedReview.entityType}:${updatedReview.entity}`);
                await cacheService.invalidateByTag(`reviews:entity:${updatedReview.entity}`);

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

        const session = await startSession();
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

            await cacheService.invalidateByTag(`reviews:${review.entityType}:${review.entity}`);
            await cacheService.invalidateByTag(`reviews:entity:${review.entity}`);

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

        const session = await startSession();

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

        const session = await startSession();

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
            entityType,
            entity: new Types.ObjectId(entityId),
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
        const validTypes = [
            'Restaurant',
            'Recipe',
            'Market',
            'Business',
            'Doctor',
            'Sanctuary',
            'restaurant',
            'business',
            'doctor',
            'profession',
            'professionProfile',
            'sanctuary',
        ];
        const normalizedType = entityType.charAt(0).toUpperCase() + entityType.slice(1).toLowerCase();

        if (!validTypes.includes(entityType) && !validTypes.includes(normalizedType)) {
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

        const reviews = await Review.find({ entity: new Types.ObjectId(entityId) })
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

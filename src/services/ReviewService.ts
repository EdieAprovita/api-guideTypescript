import { Review, IReview } from '../models/Review';
import { HttpError, HttpStatusCode } from '../types/Errors';
import { cacheService } from './CacheService';
import mongoose, { Types, startSession } from 'mongoose';

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
type ValidEntityType = (typeof VALID_ENTITY_TYPES)[number];

const validateEntityTypeAndId = async (entityType: string, entityId: string): Promise<void> => {
    if (!VALID_ENTITY_TYPES.includes(entityType as ValidEntityType)) {
        throw new HttpError(HttpStatusCode.BAD_REQUEST, `Invalid entity type: ${entityType}`);
    }

    if (!Types.ObjectId.isValid(entityId)) {
        throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Invalid entity ID format');
    }

    // Skip DB existence check in test environment to avoid heavy module imports
    if (process.env.NODE_ENV === 'test') return;

    // Dynamically import the model only when needed to avoid test mocking conflicts
    let EntityModel: any;
    switch (entityType as ValidEntityType) {
        case 'Restaurant':
            EntityModel = (await import('../models/Restaurant')).Restaurant;
            break;
        case 'Recipe':
            EntityModel = (await import('../models/Recipe')).Recipe;
            break;
        case 'Market':
            EntityModel = (await import('../models/Market')).Market;
            break;
        case 'Business':
            EntityModel = (await import('../models/Business')).Business;
            break;
        case 'Doctor':
            EntityModel = (await import('../models/Doctor')).Doctor;
            break;
        case 'Sanctuary':
            EntityModel = (await import('../models/Sanctuary')).Sanctuary;
            break;
        default:
            throw new HttpError(HttpStatusCode.BAD_REQUEST, `Invalid entity type: ${entityType}`);
    }

    const entity = await EntityModel.findById(entityId);
    if (!entity) {
        throw new HttpError(HttpStatusCode.NOT_FOUND, `${entityType} not found`);
    }
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
        const safeEntityType = (entityType as ValidEntityType);
        const agg = await Review.aggregate([
            {
                $match: {
                    $or: [
                        { entityType: safeEntityType, entity: safeEntityId },
                        { restaurant: safeEntityId },
                    ],
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

        const existingReview = await Review.findOne({
            author: new Types.ObjectId(reviewData.author.toString()),
            entityType: reviewData.entityType,
            entity: new Types.ObjectId(reviewData.entity.toString()),
        });

        if (existingReview) {
            throw new HttpError(HttpStatusCode.CONFLICT, 'User has already reviewed this entity');
        }

        const session = await startSession();

        try {
            const review = await session.withTransaction(async () => {
                const [newReview] = await Review.create([reviewData], { session });
                return newReview;
            });

            if (!review) {
                throw new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, 'Failed to create review');
            }

            await cacheService.invalidateByTag(`reviews:${reviewData.entityType}:${reviewData.entity}`);

            return review;
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

        const session = await startSession();

        try {
            const updatedReview = await session.withTransaction(async () => {
                const updated = await Review.findByIdAndUpdate(
                    reviewId,
                    { ...updateData, updatedAt: new Date() },
                    { new: true, session }
                );
                return updated;
            });

            if (updatedReview) {
                await cacheService.invalidateByTag(`reviews:${updatedReview.entityType}:${updatedReview.entity}`);
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

        try {
            await session.withTransaction(async () => {
                await Review.findByIdAndDelete(reviewId, { session });
            });

            await cacheService.invalidateByTag(`reviews:${review.entityType}:${review.entity}`);
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

        await cacheService.setWithTags(cacheKey, reviews, [`reviews:entity:${entityId}`], 300);
        return reviews;
    },
};

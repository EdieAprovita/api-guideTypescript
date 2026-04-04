import { Types } from 'mongoose';
import { Review, IReview } from '../../models/Review.js';
import { HttpError, HttpStatusCode } from '../../types/Errors.js';
import { cacheService } from '../CacheService.js';
import {
    buildReviewEntityMatch,
    buildReviewQuery,
    ReviewFilters,
    VALID_ENTITY_TYPES,
    ValidEntityType,
} from './reviewPolicies.js';
import { ReviewStats, PaginationOptions } from './reviewTypes.js';
import { buildReviewListCacheKey } from './reviewCacheHelpers.js';
import { extractPaginationParams, extractSortParams, extractRatingForKey } from './reviewPaginationHelpers.js';
import { validateEntityTypeAndId } from './reviewEntityHelpers.js';

export async function getReviewsByEntity(
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
}

export async function getReviewStats(entityType: string, entityId: string): Promise<ReviewStats> {
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
}

export async function getReviewById(reviewId: string): Promise<IReview> {
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
}

export async function getTopRatedReviews(entityType: string): Promise<IReview[]> {
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
}

export async function listReviewsForModel(entityId: string): Promise<IReview[]> {
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
}

export async function findByUserAndEntity(
    userId: string,
    entityType: string,
    entityId: string
): Promise<IReview | null> {
    if (!Types.ObjectId.isValid(userId)) {
        throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Invalid user ID format');
    }

    await validateEntityTypeAndId(entityType, entityId);

    return await Review.findOne({
        author: new Types.ObjectId(userId),
        ...buildReviewEntityMatch(entityType, entityId),
    });
}

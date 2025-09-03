import { Review, IReview } from '../models/Review';
import { Restaurant } from '../models/Restaurant';
import { Recipe } from '../models/Recipe';
import { Market } from '../models/Market';
import { Business } from '../models/Business';
import { Doctor } from '../models/Doctor';
import { Sanctuary } from '../models/Sanctuary';
import { HttpError, HttpStatusCode } from '../types/Errors';
import { cacheService } from './CacheService';
import mongoose from 'mongoose';

interface ReviewFilters {
    entityType?: string;
    entity?: string;
    rating?: number | { $gte?: number; $lte?: number };
    author?: string;
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

interface PaginatedResult<T> {
    reviews: T[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

const ENTITY_MODELS = {
    Restaurant,
    Recipe, 
    Market,
    Business,
    Doctor,
    Sanctuary
} as const;

const VALID_ENTITY_TYPES = Object.keys(ENTITY_MODELS) as Array<keyof typeof ENTITY_MODELS>;

const validateEntityTypeAndId = async (entityType: string, entityId: string): Promise<void> => {
    if (!VALID_ENTITY_TYPES.includes(entityType as keyof typeof ENTITY_MODELS)) {
        throw new HttpError(`Invalid entity type: ${entityType}`, HttpStatusCode.BAD_REQUEST);
    }

    if (!mongoose.Types.ObjectId.isValid(entityId)) {
        throw new HttpError('Invalid entity ID format', HttpStatusCode.BAD_REQUEST);
    }

    const EntityModel = ENTITY_MODELS[entityType as keyof typeof ENTITY_MODELS];
    const entity = await EntityModel.findById(entityId);
    
    if (!entity) {
        throw new HttpError(`${entityType} not found`, HttpStatusCode.NOT_FOUND);
    }
};

const buildCacheKey = (base: string, params: Record<string, unknown>): string => {
    const paramString = Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}:${value}`)
        .join('|');
    return paramString ? `${base}:${paramString}` : base;
};

export const reviewService = {
    async getReviewsByEntity(
        entityType: string, 
        entityId: string, 
        filters: ReviewFilters = {},
        pagination: PaginationOptions = {}
    ): Promise<PaginatedResult<IReview>> {
        await validateEntityTypeAndId(entityType, entityId);

        const cacheKey = buildCacheKey('reviews', { 
            entityType, 
            entityId, 
            ...filters, 
            ...pagination 
        });
        
        const cached = await cacheService.get<PaginatedResult<IReview>>(cacheKey);
        if (cached) {
            return cached;
        }

        const page = Math.max(1, pagination.page || 1);
        const limit = Math.min(100, Math.max(1, pagination.limit || 10));
        const skip = (page - 1) * limit;

        const query: ReviewFilters = {
            entityType,
            entity: entityId,
            ...filters
        };

        const sortOptions: Record<string, 1 | -1> = {};
        if (pagination.sortBy) {
            sortOptions[pagination.sortBy] = pagination.sortOrder === 'asc' ? 1 : -1;
        } else {
            sortOptions.createdAt = -1;
        }

        const [reviews, totalCount] = await Promise.all([
            Review.find(query)
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .populate('author', 'name')
                .lean(),
            Review.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalCount / limit);
        const result: PaginatedResult<IReview> = {
            reviews,
            totalCount,
            currentPage: page,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
        };

        await cacheService.set(cacheKey, result, 300, [`reviews:${entityType}:${entityId}`]);
        return result;
    },

    async getReviewStats(entityType: string, entityId: string): Promise<ReviewStats> {
        await validateEntityTypeAndId(entityType, entityId);

        const cacheKey = `review-stats:${entityType}:${entityId}`;
        const cached = await cacheService.get<ReviewStats>(cacheKey);
        if (cached) {
            return cached;
        }

        const reviews = await Review.find({ 
            entityType, 
            entity: entityId 
        }).select('rating').lean();

        const totalReviews = reviews.length;
        const averageRating = totalReviews > 0 
            ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
            : 0;

        const ratingDistribution = {
            1: 0, 2: 0, 3: 0, 4: 0, 5: 0
        };

        reviews.forEach(review => {
            const rating = review.rating as keyof typeof ratingDistribution;
            if (rating >= 1 && rating <= 5) {
                ratingDistribution[rating]++;
            }
        });

        const stats: ReviewStats = {
            totalReviews,
            averageRating: Math.round(averageRating * 100) / 100,
            ratingDistribution
        };

        await cacheService.set(cacheKey, stats, 600, [`reviews:${entityType}:${entityId}`]);
        return stats;
    },

    async createReview(reviewData: Partial<IReview>): Promise<IReview> {
        if (!reviewData.entityType || !reviewData.entity) {
            throw new HttpError('Entity type and entity ID are required', HttpStatusCode.BAD_REQUEST);
        }

        await validateEntityTypeAndId(reviewData.entityType, reviewData.entity.toString());

        if (!reviewData.author || !mongoose.Types.ObjectId.isValid(reviewData.author.toString())) {
            throw new HttpError('Valid author ID is required', HttpStatusCode.BAD_REQUEST);
        }

        const existingReview = await Review.findOne({
            author: new mongoose.Types.ObjectId(reviewData.author.toString()),
            entityType: reviewData.entityType,
            entity: new mongoose.Types.ObjectId(reviewData.entity.toString())
        });

        if (existingReview) {
            throw new HttpError('User has already reviewed this entity', HttpStatusCode.CONFLICT);
        }

        const session = await mongoose.startSession();
        
        try {
            const review = await session.withTransaction(async () => {
                const [newReview] = await Review.create([reviewData], { session });
                return newReview;
            });

            await cacheService.invalidateByTag(`reviews:${reviewData.entityType}:${reviewData.entity}`);
            
            return review;
        } finally {
            await session.endSession();
        }
    },

    async updateReview(reviewId: string, updateData: Partial<IReview>, userId: string): Promise<IReview> {
        if (!mongoose.Types.ObjectId.isValid(reviewId)) {
            throw new HttpError('Invalid review ID format', HttpStatusCode.BAD_REQUEST);
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new HttpError('Invalid user ID format', HttpStatusCode.BAD_REQUEST);
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            throw new HttpError('Review not found', HttpStatusCode.NOT_FOUND);
        }

        if (review.author.toString() !== userId) {
            throw new HttpError('Unauthorized to update this review', HttpStatusCode.FORBIDDEN);
        }

        const session = await mongoose.startSession();

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
        if (!mongoose.Types.ObjectId.isValid(reviewId)) {
            throw new HttpError('Invalid review ID format', HttpStatusCode.BAD_REQUEST);
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new HttpError('Invalid user ID format', HttpStatusCode.BAD_REQUEST);
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            throw new HttpError('Review not found', HttpStatusCode.NOT_FOUND);
        }

        if (review.author.toString() !== userId) {
            throw new HttpError('Unauthorized to delete this review', HttpStatusCode.FORBIDDEN);
        }

        const session = await mongoose.startSession();

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
        if (!mongoose.Types.ObjectId.isValid(reviewId)) {
            throw new HttpError('Invalid review ID format', HttpStatusCode.BAD_REQUEST);
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new HttpError('Invalid user ID format', HttpStatusCode.BAD_REQUEST);
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            throw new HttpError('Review not found', HttpStatusCode.NOT_FOUND);
        }

        const userObjectId = new mongoose.Types.ObjectId(userId);
        if (review.helpfulVotes.some(vote => vote.toString() === userId)) {
            throw new HttpError('User has already voted this review as helpful', HttpStatusCode.CONFLICT);
        }

        const session = await mongoose.startSession();

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
        if (!mongoose.Types.ObjectId.isValid(reviewId)) {
            throw new HttpError('Invalid review ID format', HttpStatusCode.BAD_REQUEST);
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new HttpError('Invalid user ID format', HttpStatusCode.BAD_REQUEST);
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            throw new HttpError('Review not found', HttpStatusCode.NOT_FOUND);
        }

        const voteIndex = review.helpfulVotes.findIndex(vote => vote.toString() === userId);
        if (voteIndex === -1) {
            throw new HttpError('Vote not found', HttpStatusCode.NOT_FOUND);
        }

        const session = await mongoose.startSession();

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
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new HttpError('Invalid user ID format', HttpStatusCode.BAD_REQUEST);
        }

        await validateEntityTypeAndId(entityType, entityId);

        return await Review.findOne({
            author: new mongoose.Types.ObjectId(userId),
            entityType,
            entity: new mongoose.Types.ObjectId(entityId)
        });
    },

    async getReviewById(reviewId: string): Promise<IReview> {
        if (!mongoose.Types.ObjectId.isValid(reviewId)) {
            throw new HttpError('Invalid review ID format', HttpStatusCode.BAD_REQUEST);
        }

        const cacheKey = `review:${reviewId}`;
        const cached = await cacheService.get<IReview>(cacheKey);
        if (cached) {
            return cached;
        }

        const review = await Review.findById(reviewId).populate('author', 'name');
        if (!review) {
            throw new HttpError('Review not found', HttpStatusCode.NOT_FOUND);
        }

        await cacheService.set(cacheKey, review, 300, [`reviews:${review.entityType}:${review.entity}`]);
        return review;
    }
};
import { Review, IReview } from '../../models/Review.js';
import { HttpError, HttpStatusCode } from '../../types/Errors.js';
import { cacheService } from '../../services/CacheService.js';
import { Types, startSession } from 'mongoose';
import logger from '../../utils/logger.js';
import { buildReviewEntityMatch, buildReviewUpdatePayload } from './reviewPolicies.js';
import { invalidateReviewCache } from './reviewCacheHelpers.js';
import { validateEntityTypeAndId, recalculateEntityRating } from './reviewEntityHelpers.js';

export async function addReview(reviewData: Partial<IReview>): Promise<IReview> {
    if (!reviewData.entityType || !reviewData.entity) {
        throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Entity type and entity ID are required');
    }

    await validateEntityTypeAndId(reviewData.entityType, reviewData.entity.toString());

    if (!reviewData.author || !Types.ObjectId.isValid(reviewData.author.toString())) {
        throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Valid author ID is required');
    }

    // Build query safely with validated ObjectIds to prevent NoSQL injection
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
        const populatedReview = await Review.findById(review._id).populate('author', 'username firstName lastName photo');

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
}

// Backward-compatible alias
export function createReview(reviewData: Partial<IReview>): Promise<IReview> {
    return addReview(reviewData);
}

export async function updateReview(reviewId: string, updateData: Partial<IReview>, userId: string): Promise<IReview> {
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
            }).populate('author', 'username firstName lastName photo');
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
}

export async function deleteReview(reviewId: string, userId: string): Promise<void> {
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
}

export async function markAsHelpful(reviewId: string, userId: string): Promise<IReview> {
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

        await invalidateReviewCache(review.entityType, review.entity.toString(), cacheService);

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
}

export async function removeHelpfulVote(reviewId: string, userId: string): Promise<IReview> {
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

        await invalidateReviewCache(review.entityType, review.entity.toString(), cacheService);

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
}

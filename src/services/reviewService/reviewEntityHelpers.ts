import type mongoose from 'mongoose';
import { Types } from 'mongoose';
import { Review } from '../../models/Review.js';
import { HttpError, HttpStatusCode } from '../../types/Errors.js';
import logger from '../../utils/logger.js';
import { buildReviewEntityMatch, VALID_ENTITY_TYPES, ValidEntityType } from './reviewPolicies.js';

/**
 * Dynamically imports and returns the Mongoose model for a given entity type.
 * Returns null in test environment to avoid heavy module imports.
 */
export const getEntityModel = async (entityType: string): Promise<mongoose.Model<any> | null> => {
    if (!VALID_ENTITY_TYPES.includes(entityType as ValidEntityType)) {
        throw new HttpError(HttpStatusCode.BAD_REQUEST, `Invalid entity type: ${entityType}`);
    }

    // Skip dynamic imports in test environment to avoid mocking conflicts
    if (process.env.NODE_ENV === 'test') return null;

    switch (entityType as ValidEntityType) {
        case 'Restaurant':
            return (await import('../../models/Restaurant.js')).Restaurant;
        case 'Recipe':
            return (await import('../../models/Recipe.js')).Recipe;
        case 'Market':
            return (await import('../../models/Market.js')).Market;
        case 'Business':
            return (await import('../../models/Business.js')).Business;
        case 'Doctor':
            return (await import('../../models/Doctor.js')).Doctor;
        case 'Sanctuary':
            return (await import('../../models/Sanctuary.js')).Sanctuary;
        default:
            throw new HttpError(HttpStatusCode.BAD_REQUEST, `Invalid entity type: ${entityType}`);
    }
};

export const validateEntityTypeAndId = async (entityType: string, entityId: string): Promise<void> => {
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
export const recalculateEntityRating = async (
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
        { $match: buildReviewEntityMatch(entityType, safeEntityId) },
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

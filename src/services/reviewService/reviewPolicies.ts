import { Types } from 'mongoose';
import { buildAllowedUpdatePayload } from '../../utils/safeUpdates.js';

export interface ReviewFilters {
    entityType?: string;
    entity?: string;
    rating?: number | { $gte?: number; $lte?: number };
    author?: string;
    sort?: string;
    page?: number;
    limit?: number;
}

export const VALID_ENTITY_TYPES = ['Restaurant', 'Recipe', 'Market', 'Business', 'Doctor', 'Sanctuary'] as const;
export type ValidEntityType = (typeof VALID_ENTITY_TYPES)[number];

export const ALLOWED_REVIEW_UPDATE_FIELDS = [
    'rating',
    'content',
    'title',
    'visitDate',
    'recommendedDishes',
    'tags',
] as const;

export function buildReviewEntityMatch(entityType: string, entityId: string | Types.ObjectId): Record<string, unknown> {
    const objectId = typeof entityId === 'string' ? new Types.ObjectId(entityId) : entityId;
    const currentShape = { entityType, entity: objectId };

    if (entityType === 'Restaurant') {
        return {
            $or: [currentShape, { restaurant: objectId }],
        };
    }

    return currentShape;
}

export function buildReviewQuery(entityType: string, entityId: string, filters: ReviewFilters): Record<string, unknown> {
    const query: Record<string, unknown> = {
        ...buildReviewEntityMatch(entityType, entityId),
    };

    if (filters.author && typeof filters.author === 'string' && Types.ObjectId.isValid(filters.author)) {
        query.author = new Types.ObjectId(filters.author);
    }

    if (typeof filters.rating === 'number') {
        const r = Math.max(1, Math.min(5, filters.rating));
        query.rating = r;
    } else if (filters.rating && typeof filters.rating === 'object') {
        const range: Record<string, number> = {};
        if (typeof filters.rating.$gte === 'number') {
            range.$gte = Math.max(1, Math.min(5, filters.rating.$gte));
        }
        if (typeof filters.rating.$lte === 'number') {
            range.$lte = Math.max(1, Math.min(5, filters.rating.$lte));
        }
        if (Object.keys(range).length > 0) {
            query.rating = range;
        }
    }

    return query;
}

export function buildReviewUpdatePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return buildAllowedUpdatePayload(payload, {
        allowedFields: ALLOWED_REVIEW_UPDATE_FIELDS,
        aliases: { comment: 'content' },
        extraAssignments: { updatedAt: new Date() },
        context: 'review update',
        emptyMessage: 'No valid fields provided to update review',
    });
}

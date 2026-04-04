import logger from '../../utils/logger.js';
import type { PaginationOptions } from './reviewTypes.js';

export async function invalidateReviewCache(
    entityType: string,
    entityId: string,
    cache: { invalidateByTag(tag: string): Promise<void> }
): Promise<void> {
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            // Primary tag format used by getReviewsByEntity, getReviewStats, getReviewById, addReview
            await cache.invalidateByTag(`reviews:${entityType}:${entityId}`);
            // Secondary format used by listReviewsForModel
            await cache.invalidateByTag(`reviews:entity:${entityId}`);
            // Type-level tag used by getTopRatedReviews (reviews:${normalizedType})
            await cache.invalidateByTag(`reviews:${entityType}`);
            // Global top-rated tag — any review mutation can affect top-rated rankings
            await cache.invalidateByTag('top-rated');
            return;
        } catch (error) {
            if (attempt === 2) {
                logger.warn('Cache invalidation failed after 2 attempts', {
                    entityType,
                    entityId,
                    error: error instanceof Error ? error.message : String(error),
                });
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
}

export const buildReviewListCacheKey = (
    entityType: string,
    entityId: string,
    page: number,
    limit: number,
    sortField: string,
    rating?: number,
    sortOrder?: 'asc' | 'desc'
): string => {
    const parts = [`p=${page}`, `l=${limit}`];
    if (typeof rating === 'number') parts.push(`r=${rating}`);
    parts.push(`s=${sortField}`);
    if (sortOrder) parts.push(`o=${sortOrder}`);
    return `reviews:${entityType}:${entityId}:` + parts.join('&');
};

// Re-export to satisfy potential type-only consumers
export type { PaginationOptions };

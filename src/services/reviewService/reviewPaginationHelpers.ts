import type { ReviewFilters } from './reviewPolicies.js';
import type { PaginationOptions } from './reviewTypes.js';

export const extractPaginationParams = (filters: ReviewFilters, pagination: PaginationOptions) => {
    const page = Math.max(1, pagination.page ?? filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, pagination.limit ?? filters.limit ?? 10));
    return { page, limit };
};

export const extractSortParams = (filters: ReviewFilters, pagination: PaginationOptions) => {
    const sortRaw: string | undefined = pagination.sortBy ?? filters.sort ?? undefined;
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

export const extractRatingForKey = (filters: ReviewFilters): number | undefined => {
    const prelimRating = filters.rating;
    if (typeof prelimRating === 'number') {
        return Math.max(1, Math.min(5, prelimRating));
    }
    return undefined;
};

export interface PaginationMeta {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: PaginationMeta;
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

export function normalizePaginationParams(
    page?: string | number,
    limit?: string | number
): { page: number; limit: number } {
    const parsedPage = Math.max(1, Number(page) || DEFAULT_PAGE);
    const parsedLimit = Math.min(MAX_LIMIT, Math.max(1, Number(limit) || DEFAULT_LIMIT));
    return { page: parsedPage, limit: parsedLimit };
}

/**
 * Helper to build canonical pagination metadata from MongoDB counters.
 *
 * When `page` exceeds `totalPages`, it is clamped to `totalPages` so that
 * `hasPrevPage` / `hasNextPage` are always logically consistent and callers
 * never receive a cursor pointing past the last page.
 */
export function buildPaginationMeta(params: { page: number; limit: number; totalItems: number }): PaginationMeta {
    const totalPages = Math.max(1, Math.ceil(params.totalItems / params.limit));
    // Clamp currentPage to valid range [1..totalPages] when items exist.
    // When totalItems === 0, totalPages is already forced to 1 and page = 1.
    const clampedPage = params.totalItems === 0 ? 1 : Math.min(Math.max(1, params.page), totalPages);
    return {
        currentPage: clampedPage,
        totalPages,
        totalItems: params.totalItems,
        itemsPerPage: params.limit,
        hasNextPage: clampedPage < totalPages,
        hasPrevPage: clampedPage > 1,
    };
}

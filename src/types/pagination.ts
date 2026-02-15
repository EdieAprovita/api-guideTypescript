export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    meta: PaginationMeta;
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

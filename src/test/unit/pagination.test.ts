import { describe, it, expect } from 'vitest';
import {
    normalizePaginationParams,
    buildPaginationMeta,
    DEFAULT_PAGE,
    DEFAULT_LIMIT,
    MAX_LIMIT,
} from '../../types/pagination.js';

describe('normalizePaginationParams', () => {
    it('returns defaults when no arguments provided', () => {
        const result = normalizePaginationParams();
        expect(result).toEqual({ page: DEFAULT_PAGE, limit: DEFAULT_LIMIT });
    });

    it('parses string numbers correctly', () => {
        const result = normalizePaginationParams('3', '25');
        expect(result).toEqual({ page: 3, limit: 25 });
    });

    it('accepts numeric arguments', () => {
        const result = normalizePaginationParams(2, 50);
        expect(result).toEqual({ page: 2, limit: 50 });
    });

    it('clamps page to minimum of 1', () => {
        expect(normalizePaginationParams(0, 10).page).toBe(1);
        expect(normalizePaginationParams(-5, 10).page).toBe(1);
    });

    it('handles zero and negative limit values', () => {
        // 0 is falsy → falls back to DEFAULT_LIMIT via || operator
        expect(normalizePaginationParams(1, 0).limit).toBe(DEFAULT_LIMIT);
        // -10 is truthy → Math.max(1, -10) = 1
        expect(normalizePaginationParams(1, -10).limit).toBe(1);
    });

    it('clamps limit to MAX_LIMIT', () => {
        expect(normalizePaginationParams(1, 999).limit).toBe(MAX_LIMIT);
        expect(normalizePaginationParams(1, MAX_LIMIT + 1).limit).toBe(MAX_LIMIT);
    });

    it('falls back to defaults for NaN inputs', () => {
        const result = normalizePaginationParams('abc', 'xyz');
        expect(result).toEqual({ page: DEFAULT_PAGE, limit: DEFAULT_LIMIT });
    });

    it('handles undefined explicitly', () => {
        const result = normalizePaginationParams(undefined, undefined);
        expect(result).toEqual({ page: DEFAULT_PAGE, limit: DEFAULT_LIMIT });
    });
});

describe('buildPaginationMeta', () => {
    it('empty result set → currentPage 1, no next, no prev', () => {
        const result = buildPaginationMeta({ page: 1, limit: 10, totalItems: 0 });
        expect(result).toEqual({
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            itemsPerPage: 10,
            hasNextPage: false,
            hasPrevPage: false,
        });
    });

    it('first of multiple pages → hasNextPage true, hasPrevPage false', () => {
        const result = buildPaginationMeta({ page: 1, limit: 10, totalItems: 25 });
        expect(result.currentPage).toBe(1);
        expect(result.totalPages).toBe(3);
        expect(result.hasNextPage).toBe(true);
        expect(result.hasPrevPage).toBe(false);
    });

    it('middle page → hasNextPage true, hasPrevPage true', () => {
        const result = buildPaginationMeta({ page: 2, limit: 10, totalItems: 25 });
        expect(result.currentPage).toBe(2);
        expect(result.hasNextPage).toBe(true);
        expect(result.hasPrevPage).toBe(true);
    });

    it('last page → hasNextPage false, hasPrevPage true', () => {
        const result = buildPaginationMeta({ page: 3, limit: 10, totalItems: 25 });
        expect(result.currentPage).toBe(3);
        expect(result.hasNextPage).toBe(false);
        expect(result.hasPrevPage).toBe(true);
    });

    it('out-of-bounds page is clamped to totalPages → hasNextPage false, hasPrevPage true', () => {
        const result = buildPaginationMeta({ page: 10, limit: 10, totalItems: 25 });
        expect(result.currentPage).toBe(3);
        expect(result.totalPages).toBe(3);
        expect(result.hasNextPage).toBe(false);
        expect(result.hasPrevPage).toBe(true);
    });

    it('exact fit (totalItems equals limit) → single page, no next, no prev', () => {
        const result = buildPaginationMeta({ page: 1, limit: 10, totalItems: 10 });
        expect(result.currentPage).toBe(1);
        expect(result.totalPages).toBe(1);
        expect(result.hasNextPage).toBe(false);
        expect(result.hasPrevPage).toBe(false);
    });

    it('page 0 is clamped up to 1', () => {
        const result = buildPaginationMeta({ page: 0, limit: 10, totalItems: 25 });
        expect(result.currentPage).toBe(1);
        expect(result.hasPrevPage).toBe(false);
        expect(result.hasNextPage).toBe(true);
    });
});

describe('pagination constants', () => {
    it('DEFAULT_PAGE is 1', () => {
        expect(DEFAULT_PAGE).toBe(1);
    });

    it('DEFAULT_LIMIT is 10', () => {
        expect(DEFAULT_LIMIT).toBe(10);
    });

    it('MAX_LIMIT is 100', () => {
        expect(MAX_LIMIT).toBe(100);
    });
});

import { describe, it, expect } from 'vitest';
import {
    normalizePaginationParams,
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

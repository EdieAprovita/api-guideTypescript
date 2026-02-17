import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response } from 'express';
import { testUtils } from '@test/helpers/testBase';
import { HttpStatusCode } from '@/types/Errors';

vi.mock('express-validator', () => ({
    __esModule: true,
    default: { validationResult: vi.fn() },
    validationResult: vi.fn(),
}));

const mockFindNearbyPaginated = vi.fn();
const mockSearchPaginated = vi.fn();

vi.mock('@/services/BusinessService.js', () => ({
    businessService: {
        getAll: vi.fn(),
        getAllCached: vi.fn(),
        findById: vi.fn(),
        findByIdCached: vi.fn(),
        create: vi.fn(),
        updateById: vi.fn(),
        deleteById: vi.fn(),
        findNearbyPaginated: mockFindNearbyPaginated,
        searchPaginated: mockSearchPaginated,
    },
}));

vi.mock('@/services/ReviewService.js', () => ({
    reviewService: {
        addReview: vi.fn(),
        getTopRatedReviews: vi.fn(),
    },
}));

vi.mock('@/utils/sanitizer.js', () => ({
    sanitizeNoSQLInput: (data: any) => data,
}));

vi.mock('@/utils/geocodeLocation.js', () => ({
    default: vi.fn(),
}));

const setupTest = (query = {}) => {
    const req = testUtils.createMockRequest({ query }) as Request;
    const res = testUtils.createMockResponse() as Response;
    const next = testUtils.createMockNext();
    return { req, res, next };
};

describe('Phase 1 — getNearbyBusinesses controller', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return nearby businesses with pagination meta', async () => {
        const { getNearbyBusinesses } = await import('@/controllers/businessControllers.js');
        const mockResult = {
            data: [{ namePlace: 'Vegan Spot', _id: '1' }],
            meta: { page: 1, limit: 10, total: 1, pages: 1 },
        };
        mockFindNearbyPaginated.mockResolvedValue(mockResult);

        const { req, res, next } = setupTest({ latitude: '19.4326', longitude: '-99.1332', radius: '3000' });

        await getNearbyBusinesses(req, res, next);

        expect(mockFindNearbyPaginated).toHaveBeenCalledWith({
            latitude: 19.4326,
            longitude: -99.1332,
            radius: 3000,
            page: undefined,
            limit: undefined,
        });
        expect(res.status).toHaveBeenCalledWith(HttpStatusCode.OK);
        const jsonCall = (res.json as any).mock.calls[0][0];
        expect(jsonCall.meta).toEqual(mockResult.meta);
        expect(jsonCall.data).toEqual(mockResult.data);
    });

    it('should return 400 when latitude is missing', async () => {
        const { getNearbyBusinesses } = await import('@/controllers/businessControllers.js');
        const { req, res, next } = setupTest({ longitude: '-99.1332' });

        await getNearbyBusinesses(req, res, next);

        expect(next).toHaveBeenCalled();
        const errorArg = (next as any).mock.calls[0][0];
        expect(errorArg.statusCode).toBe(HttpStatusCode.BAD_REQUEST);
    });

    it('should return 400 when latitude is out of range', async () => {
        const { getNearbyBusinesses } = await import('@/controllers/businessControllers.js');
        const { req, res, next } = setupTest({ latitude: '100', longitude: '-99.1332' });

        await getNearbyBusinesses(req, res, next);

        expect(next).toHaveBeenCalled();
        const errorArg = (next as any).mock.calls[0][0];
        expect(errorArg.statusCode).toBe(HttpStatusCode.BAD_REQUEST);
    });

    it('should return 400 when radius is invalid', async () => {
        const { getNearbyBusinesses } = await import('@/controllers/businessControllers.js');
        const { req, res, next } = setupTest({ latitude: '19.43', longitude: '-99.13', radius: '99999' });

        await getNearbyBusinesses(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    it('should use default radius when not provided', async () => {
        const { getNearbyBusinesses } = await import('@/controllers/businessControllers.js');
        mockFindNearbyPaginated.mockResolvedValue({
            data: [],
            meta: { page: 1, limit: 10, total: 0, pages: 0 },
        });

        const { req, res, next } = setupTest({ latitude: '19.43', longitude: '-99.13' });

        await getNearbyBusinesses(req, res, next);

        expect(mockFindNearbyPaginated).toHaveBeenCalledWith(expect.objectContaining({ radius: 5000 }));
    });
});

describe('Phase 1 — searchBusinesses controller', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return search results with pagination', async () => {
        const { searchBusinesses } = await import('@/controllers/businessControllers.js');
        const mockResult = {
            data: [{ namePlace: 'Vegan Kitchen', _id: '1' }],
            meta: { page: 1, limit: 10, total: 1, pages: 1 },
        };
        mockSearchPaginated.mockResolvedValue(mockResult);

        const { req, res, next } = setupTest({ q: 'vegan', page: '1', limit: '10' });

        await searchBusinesses(req, res, next);

        expect(mockSearchPaginated).toHaveBeenCalledWith({
            q: 'vegan',
            category: undefined,
            sortBy: undefined,
            sortOrder: undefined,
            page: '1',
            limit: '10',
        });
        expect(res.status).toHaveBeenCalledWith(HttpStatusCode.OK);
    });

    it('should handle search with category filter', async () => {
        const { searchBusinesses } = await import('@/controllers/businessControllers.js');
        mockSearchPaginated.mockResolvedValue({
            data: [],
            meta: { page: 1, limit: 10, total: 0, pages: 0 },
        });

        const { req, res, next } = setupTest({ category: 'restaurant', sortBy: 'rating', sortOrder: 'desc' });

        await searchBusinesses(req, res, next);

        expect(mockSearchPaginated).toHaveBeenCalledWith(
            expect.objectContaining({
                category: 'restaurant',
                sortBy: 'rating',
                sortOrder: 'desc',
            })
        );
    });

    it('should forward service errors', async () => {
        const { searchBusinesses } = await import('@/controllers/businessControllers.js');
        mockSearchPaginated.mockRejectedValue(new Error('DB connection failed'));

        const { req, res, next } = setupTest({ q: 'test' });

        await searchBusinesses(req, res, next);

        expect(next).toHaveBeenCalled();
    });
});

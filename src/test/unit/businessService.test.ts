import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../models/Business.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../models/Business.js')>();
    return { ...actual };
});

import { businessService } from '../../services/BusinessService.js';
import { Business } from '../../models/Business.js';

describe('BusinessService — searchPaginated', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('should return paginated results for text search', async () => {
        const mockData = [{ namePlace: 'Green Café', _id: '1' }];
        const chainable = { skip: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), sort: vi.fn().mockReturnThis(), exec: vi.fn().mockResolvedValue(mockData) };
        vi.spyOn(Business, 'find').mockReturnValue(chainable as any);
        vi.spyOn(Business, 'countDocuments').mockReturnValue({ exec: vi.fn().mockResolvedValue(1) } as any);

        const result = await businessService.searchPaginated({ q: 'Green', page: '1', limit: '10' });

        expect(result.data).toEqual(mockData);
        expect(result.meta.total).toBe(1);
        expect(result.meta.page).toBe(1);
        expect(result.meta.limit).toBe(10);
        expect(result.meta.pages).toBe(1);
    });

    it('should filter by category only', async () => {
        const chainable = { skip: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), sort: vi.fn().mockReturnThis(), exec: vi.fn().mockResolvedValue([]) };
        vi.spyOn(Business, 'find').mockReturnValue(chainable as any);
        vi.spyOn(Business, 'countDocuments').mockReturnValue({ exec: vi.fn().mockResolvedValue(0) } as any);

        const result = await businessService.searchPaginated({ category: 'restaurant' });

        expect(result.data).toEqual([]);
        expect(result.meta.total).toBe(0);
    });

    it('should use default sort and pagination params', async () => {
        const chainable = { skip: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), sort: vi.fn().mockReturnThis(), exec: vi.fn().mockResolvedValue([]) };
        vi.spyOn(Business, 'find').mockReturnValue(chainable as any);
        vi.spyOn(Business, 'countDocuments').mockReturnValue({ exec: vi.fn().mockResolvedValue(0) } as any);

        const result = await businessService.searchPaginated({});

        expect(result.meta.page).toBe(1);
        expect(result.meta.limit).toBe(10);
    });

    it('should apply desc sort order', async () => {
        const sortSpy = vi.fn().mockReturnThis();
        const chainable = { skip: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), sort: sortSpy, exec: vi.fn().mockResolvedValue([]) };
        vi.spyOn(Business, 'find').mockReturnValue(chainable as any);
        vi.spyOn(Business, 'countDocuments').mockReturnValue({ exec: vi.fn().mockResolvedValue(0) } as any);

        await businessService.searchPaginated({ sortBy: 'rating', sortOrder: 'desc' });

        expect(sortSpy).toHaveBeenCalledWith({ rating: -1 });
    });
});

describe('BusinessService — findNearbyPaginated', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('should return paginated nearby results', async () => {
        const mockData = [{ namePlace: 'Nearby Place', _id: '1' }];
        const chainable = { skip: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), exec: vi.fn().mockResolvedValue(mockData) };
        vi.spyOn(Business, 'find').mockReturnValue(chainable as any);
        vi.spyOn(Business, 'countDocuments').mockReturnValue({ exec: vi.fn().mockResolvedValue(1) } as any);

        const result = await businessService.findNearbyPaginated({
            latitude: 19.4326,
            longitude: -99.1332,
            radius: 3000,
            page: '1',
            limit: '10',
        });

        expect(result.data).toEqual(mockData);
        expect(result.meta.total).toBe(1);
    });

    it('should use default radius and pagination', async () => {
        const chainable = { skip: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), exec: vi.fn().mockResolvedValue([]) };
        vi.spyOn(Business, 'find').mockReturnValue(chainable as any);
        vi.spyOn(Business, 'countDocuments').mockReturnValue({ exec: vi.fn().mockResolvedValue(0) } as any);

        const result = await businessService.findNearbyPaginated({
            latitude: 19.4326,
            longitude: -99.1332,
        });

        expect(result.meta.page).toBe(1);
        expect(result.meta.limit).toBe(10);
    });

    it('should build correct geospatial query', async () => {
        const findSpy = vi.fn().mockReturnValue({ skip: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), exec: vi.fn().mockResolvedValue([]) });
        vi.spyOn(Business, 'find').mockImplementation(findSpy);
        vi.spyOn(Business, 'countDocuments').mockReturnValue({ exec: vi.fn().mockResolvedValue(0) } as any);

        await businessService.findNearbyPaginated({
            latitude: 19.4326,
            longitude: -99.1332,
            radius: 2000,
        });

        expect(findSpy).toHaveBeenCalledWith({
            location: {
                $near: {
                    $geometry: { type: 'Point', coordinates: [-99.1332, 19.4326] },
                    $maxDistance: 2000,
                },
            },
        });
    });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockFind = vi.fn();
const mockCountDocuments = vi.fn();
const mockSkip = vi.fn();
const mockLimit = vi.fn();
const mockSort = vi.fn();
const mockExec = vi.fn();

vi.mock('../../models/Business.js', () => {
    const chainableQuery = () => ({
        skip: mockSkip.mockReturnThis(),
        limit: mockLimit.mockReturnThis(),
        sort: mockSort.mockReturnThis(),
        exec: mockExec,
    });

    const mockBusiness = {
        find: mockFind.mockImplementation(() => chainableQuery()),
        findById: vi.fn(),
        create: vi.fn(),
        deleteOne: vi.fn(),
        countDocuments: mockCountDocuments.mockImplementation(() => ({
            exec: vi.fn().mockResolvedValue(0),
        })),
        modelName: 'Business',
    };
    return { Business: mockBusiness, IBusiness: {} };
});

const { businessService } = await import('../../services/BusinessService.js');

describe('BusinessService — searchPaginated', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFind.mockImplementation(() => ({
            skip: mockSkip.mockReturnThis(),
            limit: mockLimit.mockReturnThis(),
            sort: mockSort.mockReturnThis(),
            exec: mockExec,
        }));
        mockExec.mockResolvedValue([]);
        mockCountDocuments.mockImplementation(() => ({
            exec: vi.fn().mockResolvedValue(0),
        }));
    });

    it('should return paginated results for text search', async () => {
        const mockData = [{ namePlace: 'Green Café', _id: '1' }];
        mockExec.mockResolvedValue(mockData);
        mockCountDocuments.mockImplementation(() => ({
            exec: vi.fn().mockResolvedValue(1),
        }));

        const result = await businessService.searchPaginated({ q: 'Green', page: '1', limit: '10' });

        expect(result.data).toEqual(mockData);
        expect(result.meta.total).toBe(1);
        expect(result.meta.page).toBe(1);
        expect(result.meta.limit).toBe(10);
    });

    it('should filter by category', async () => {
        const result = await businessService.searchPaginated({ category: 'restaurant' });

        expect(result.data).toEqual([]);
        expect(result.meta.total).toBe(0);
    });

    it('should handle combined text + category search', async () => {
        const result = await businessService.searchPaginated({
            q: 'vegan',
            category: 'restaurant',
            sortBy: 'rating',
            sortOrder: 'desc',
        });

        expect(result.meta.pages).toBe(0);
    });

    it('should normalize pagination params with defaults', async () => {
        const result = await businessService.searchPaginated({});

        expect(result.meta.page).toBe(1);
        expect(result.meta.limit).toBe(10);
    });
});

describe('BusinessService — findNearbyPaginated', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFind.mockImplementation(() => ({
            skip: mockSkip.mockReturnThis(),
            limit: mockLimit.mockReturnThis(),
            sort: mockSort.mockReturnThis(),
            exec: mockExec,
        }));
        mockExec.mockResolvedValue([]);
        mockCountDocuments.mockImplementation(() => ({
            exec: vi.fn().mockResolvedValue(0),
        }));
    });

    it('should return paginated nearby results', async () => {
        const mockData = [{ namePlace: 'Nearby Place', _id: '1' }];
        mockExec.mockResolvedValue(mockData);
        mockCountDocuments.mockImplementation(() => ({
            exec: vi.fn().mockResolvedValue(1),
        }));

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

    it('should use default radius of 5000 meters', async () => {
        const result = await businessService.findNearbyPaginated({
            latitude: 19.4326,
            longitude: -99.1332,
        });

        expect(result.meta.page).toBe(1);
        expect(result.meta.limit).toBe(10);
    });
});

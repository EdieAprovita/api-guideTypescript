import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServiceMock } from '../utils/unified-test-helpers';

// Crear mocks simples
const mockCacheService = {
    set: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    invalidate: vi.fn().mockResolvedValue(undefined),
    invalidatePattern: vi.fn().mockResolvedValue(undefined),
    invalidateByTag: vi.fn().mockResolvedValue(undefined),
};

const mockRestaurantService = createServiceMock([]);
const mockBusinessService = createServiceMock([]);

const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
};

// Mock dependencies
vi.mock('../../services/CacheService', () => ({
    cacheService: mockCacheService,
}));
vi.mock('../../services/RestaurantService', () => ({
    restaurantService: mockRestaurantService,
}));
vi.mock('../../services/BusinessService', () => ({
    businessService: mockBusinessService,
}));
vi.mock('../../utils/logger', () => ({
    default: mockLogger,
}));

// Import after mocking
import { CacheWarmingService } from '../../services/CacheWarmingService';

describe('CacheWarmingService', () => {
    let warmingService: CacheWarmingService;

    beforeEach(() => {
        vi.clearAllMocks();
        warmingService = new CacheWarmingService();
    });

    afterEach(() => {
        warmingService.stopAutoWarming();
    });

    it('should initialize correctly', () => {
        const stats = warmingService.getWarmingStats();
        expect(stats.isWarming).toBe(false);
        expect(stats.lastWarmingTime).toBeNull();
        expect(stats.autoWarmingActive).toBe(false);
    });

    it('should start auto warming', async () => {
        mockRestaurantService.getAllCached.mockResolvedValue([]);
        mockBusinessService.getAllCached.mockResolvedValue([]);

        await warmingService.startAutoWarming();

        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Starting automatic cache warming'));
        const stats = warmingService.getWarmingStats();
        expect(stats.autoWarmingActive).toBe(true);
    });

    it('should stop auto warming', () => {
        warmingService.stopAutoWarming();
        // Should not throw error
        expect(true).toBe(true);
    });

    it('should warm critical data', async () => {
        mockRestaurantService.getAllCached.mockResolvedValue([]);
        mockBusinessService.getAllCached.mockResolvedValue([]);

        const result = await warmingService.warmUpCriticalData();

        expect(result.success).toBe(true);
        expect(typeof result.duration).toBe('number');
    });

    it('should handle warming errors gracefully', async () => {
        mockRestaurantService.getAllCached.mockRejectedValue(new Error('Test error'));
        mockBusinessService.getAllCached.mockResolvedValue([]);

        const result = await warmingService.warmUpCriticalData();

        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });
});

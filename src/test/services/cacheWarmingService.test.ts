import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';

// Mock all dependencies before importing
vi.mock('../../services/CacheService');
vi.mock('../../services/RestaurantService');
vi.mock('../../services/BusinessService');
vi.mock('../../utils/logger');

import { CacheWarmingService, cacheWarmingService } from '../../services/CacheWarmingService';
import { cacheService } from '../../services/CacheService';
import { restaurantService } from '../../services/RestaurantService';
import { businessService } from '../../services/BusinessService';
import logger from '../../utils/logger';

const mockedCacheService = vi.mocked(cacheService);
const mockedRestaurantService = vi.mocked(restaurantService);
const mockedBusinessService = vi.mocked(businessService);
const mockedLogger = vi.mocked(logger);

describe('CacheWarmingService', () => {
    let warmingService: CacheWarmingService;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        warmingService = new CacheWarmingService();
    });

    afterEach(() => {
        warmingService.stopAutoWarming();
        vi.useRealTimers();
    });

    describe('Constructor', () => {
        it('should initialize with default state', () => {
            const stats = warmingService.getWarmingStats();

            expect(stats.isWarming).toBe(false);
            expect(stats.lastWarmingTime).toBeNull();
            expect(stats.autoWarmingActive).toBe(false);
        });
    });

    describe('startAutoWarming', () => {
        it('should start automatic warming with default interval', async () => {
            // Setup mocks properly
            mockedRestaurantService.getAllCached = vi.fn().mockResolvedValue([]);
            mockedBusinessService.getAllCached = vi.fn().mockResolvedValue([]);
            mockedCacheService.set = vi.fn().mockResolvedValue(undefined);

            await warmingService.startAutoWarming();

            expect(mockedLogger.info).toHaveBeenCalledWith('🔥 Starting automatic cache warming every 30 minutes');

            const stats = warmingService.getWarmingStats();
            expect(stats.autoWarmingActive).toBe(true);
        });

        it('should start automatic warming with custom interval', async () => {
            mockedRestaurantService.getAllCached = vi.fn().mockResolvedValue([]);
            mockedBusinessService.getAllCached = vi.fn().mockResolvedValue([]);
            mockedCacheService.set = vi.fn().mockResolvedValue(undefined);

            await warmingService.startAutoWarming(15);

            expect(mockedLogger.info).toHaveBeenCalledWith('🔥 Starting automatic cache warming every 15 minutes');
        });
    });

    describe('stopAutoWarming', () => {
        it('should stop automatic warming', async () => {
            mockedRestaurantService.getAllCached = vi.fn().mockResolvedValue([]);
            mockedBusinessService.getAllCached = vi.fn().mockResolvedValue([]);
            mockedCacheService.set = vi.fn().mockResolvedValue(undefined);

            await warmingService.startAutoWarming();
            warmingService.stopAutoWarming();

            expect(mockedLogger.info).toHaveBeenCalledWith('🛑 Automatic cache warming stopped');

            const stats = warmingService.getWarmingStats();
            expect(stats.autoWarmingActive).toBe(false);
        });
    });

    describe('warmUpCriticalData', () => {
        beforeEach(() => {
            mockedRestaurantService.getAllCached = vi.fn().mockResolvedValue([]);
            mockedBusinessService.getAllCached = vi.fn().mockResolvedValue([]);
            mockedCacheService.set = vi.fn().mockResolvedValue(undefined);
        });

        it('should warm up all critical data successfully', async () => {
            const result = await warmingService.warmUpCriticalData();

            expect(result.success).toBe(true);
            expect(result.itemsWarmed).toBeGreaterThan(0);
            expect(result.errors).toHaveLength(0);
            expect(typeof result.duration).toBe('number');
        });

        it('should skip warming if already in progress', async () => {
            // Start first warming
            const firstWarming = warmingService.warmUpCriticalData();

            // Try to start second warming immediately
            const result = await warmingService.warmUpCriticalData();

            expect(result.success).toBe(false);
            expect(result.itemsWarmed).toBe(0);
            expect(result.errors).toContain('Warming already in progress');

            // Wait for first warming to complete
            await firstWarming;
        });
    });

    describe('getWarmingStats', () => {
        it('should return correct warming statistics', () => {
            const stats = warmingService.getWarmingStats();

            expect(stats).toEqual({
                isWarming: false,
                lastWarmingTime: null,
                autoWarmingActive: false,
            });
        });
    });

    describe('Singleton Instance', () => {
        it('should have singleton exported', () => {
            expect(cacheWarmingService).toBeInstanceOf(CacheWarmingService);
        });
    });
});

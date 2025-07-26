import { vi } from 'vitest';
import { CacheWarmingService } from '../../services/CacheWarmingService';
import { cacheService } from '../../services/CacheService';
import { restaurantService } from '../../services/RestaurantService';
import { businessService } from '../../services/BusinessService';
import logger from '../../utils/logger';
import { createMockData } from '../utils/testHelpers';
import { MockRestaurant } from '../types';

// Mock dependencies
vi.mock('../../services/CacheService');
vi.mock('../../services/RestaurantService');
vi.mock('../../services/BusinessService');
vi.mock('../../utils/logger');

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
            mockedRestaurantService.getAllCached.mockResolvedValue([createMockData.restaurant()]);
            mockedBusinessService.getAllCached.mockResolvedValue([createMockData.business()]);
            mockedCacheService.set.mockResolvedValue();

            await warmingService.startAutoWarming();

            expect(mockedLogger.info).toHaveBeenCalledWith('🔥 Starting automatic cache warming every 30 minutes');

            const stats = warmingService.getWarmingStats();
            expect(stats.autoWarmingActive).toBe(true);
        });

        it('should start automatic warming with custom interval', async () => {
            mockedRestaurantService.getAllCached.mockResolvedValue([]);
            mockedBusinessService.getAllCached.mockResolvedValue([]);
            mockedCacheService.set.mockResolvedValue();

            await warmingService.startAutoWarming(15);

            expect(mockedLogger.info).toHaveBeenCalledWith('🔥 Starting automatic cache warming every 15 minutes');
        });

        it('should perform initial warming when started', async () => {
            mockedRestaurantService.getAllCached.mockResolvedValue([createMockData.restaurant()]);
            mockedBusinessService.getAllCached.mockResolvedValue([createMockData.business()]);
            mockedCacheService.set.mockResolvedValue();

            await warmingService.startAutoWarming();

            expect(mockedLogger.info).toHaveBeenCalledWith('🔥 Starting comprehensive cache warming...');
        });
    });

    describe('stopAutoWarming', () => {
        it('should stop automatic warming', async () => {
            mockedRestaurantService.getAllCached.mockResolvedValue([]);
            mockedBusinessService.getAllCached.mockResolvedValue([]);
            mockedCacheService.set.mockResolvedValue();

            await warmingService.startAutoWarming();
            warmingService.stopAutoWarming();

            expect(mockedLogger.info).toHaveBeenCalledWith('🛑 Automatic cache warming stopped');

            const stats = warmingService.getWarmingStats();
            expect(stats.autoWarmingActive).toBe(false);
        });

        it('should handle stopping when not running', () => {
            warmingService.stopAutoWarming();
            // Should not throw error or log anything special
        });
    });

    describe('warmUpCriticalData', () => {
        beforeEach(() => {
            // Mock successful service responses
            mockedRestaurantService.getAllCached.mockResolvedValue([
                { _id: '1', name: 'Test Restaurant 1' },
                { _id: '2', name: 'Test Restaurant 2' },
            ]);

            mockedBusinessService.getAllCached.mockResolvedValue([
                { _id: '1', name: 'Test Business 1', typeBusiness: 'market' },
                { _id: '2', name: 'Test Business 2', typeBusiness: 'shop' },
            ]);

            mockedCacheService.set.mockResolvedValue();
        });

        it('should warm up all critical data successfully', async () => {
            const result = await warmingService.warmUpCriticalData();

            expect(result.success).toBe(true);
            expect(result.itemsWarmed).toBeGreaterThan(0);
            expect(result.errors).toHaveLength(0);
            expect(typeof result.duration).toBe('number');

            expect(mockedLogger.info).toHaveBeenCalledWith('🔥 Starting comprehensive cache warming...');
            expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Cache warming completed!'));
        });

        it('should skip warming if already in progress', async () => {
            // Start first warming
            const firstWarming = warmingService.warmUpCriticalData();

            // Try to start second warming immediately
            const result = await warmingService.warmUpCriticalData();

            expect(result.success).toBe(false);
            expect(result.itemsWarmed).toBe(0);
            expect(result.errors).toContain('Warming already in progress');

            expect(mockedLogger.warn).toHaveBeenCalledWith('⚠️ Cache warming already in progress, skipping...');

            // Wait for first warming to complete
            await firstWarming;
        });

        it('should handle errors in restaurant warming', async () => {
            mockedRestaurantService.getAllCached.mockRejectedValue(new Error('Restaurant service error'));
            mockedBusinessService.getAllCached.mockResolvedValue([]);

            const result = await warmingService.warmUpCriticalData();

            expect(result.success).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain('Error warming restaurants');
        });

        it('should handle errors in business warming', async () => {
            mockedRestaurantService.getAllCached.mockResolvedValue([]);
            mockedBusinessService.getAllCached.mockRejectedValue(new Error('Business service error'));

            const result = await warmingService.warmUpCriticalData();

            expect(result.success).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors.some(error => error.includes('Error warming businesses'))).toBe(true);
        });

        it('should handle critical errors gracefully', async () => {
            mockedCacheService.set.mockRejectedValue(new Error('Cache service down'));
            mockedRestaurantService.getAllCached.mockResolvedValue([{ _id: '1', name: 'Test' } as MockRestaurant]);

            const result = await warmingService.warmUpCriticalData();

            expect(result.success).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });

    describe('warmSpecificData', () => {
        beforeEach(() => {
            mockedRestaurantService.getAllCached.mockResolvedValue([createMockData.restaurant()]);
            mockedBusinessService.getAllCached.mockResolvedValue([createMockData.business()]);
            mockedCacheService.set.mockResolvedValue();
        });

        it('should warm restaurants data specifically', async () => {
            const result = await warmingService.warmSpecificData('restaurants');

            expect(result).toBeGreaterThan(0);
            expect(mockedLogger.info).toHaveBeenCalledWith('🔥 Warming specific data type: restaurants');
            expect(mockedRestaurantService.getAllCached).toHaveBeenCalled();
        });

        it('should warm businesses data specifically', async () => {
            const result = await warmingService.warmSpecificData('businesses');

            expect(result).toBeGreaterThan(0);
            expect(mockedLogger.info).toHaveBeenCalledWith('🔥 Warming specific data type: businesses');
            expect(mockedBusinessService.getAllCached).toHaveBeenCalled();
        });

        it('should warm users data specifically', async () => {
            const result = await warmingService.warmSpecificData('users');

            expect(result).toBeGreaterThan(0);
            expect(mockedLogger.info).toHaveBeenCalledWith('🔥 Warming specific data type: users');
            expect(mockedCacheService.set).toHaveBeenCalledWith(
                'users:stats',
                expect.any(Object),
                'users',
                expect.any(Object)
            );
        });

        it('should warm categories data specifically', async () => {
            const result = await warmingService.warmSpecificData('categories');

            expect(result).toBeGreaterThan(0);
            expect(mockedLogger.info).toHaveBeenCalledWith('🔥 Warming specific data type: categories');
            expect(mockedCacheService.set).toHaveBeenCalledWith(
                'categories:restaurants',
                expect.any(Array),
                'categories',
                expect.any(Object)
            );
        });

        it('should warm geographical data specifically', async () => {
            const result = await warmingService.warmSpecificData('geo');

            expect(result).toBeGreaterThan(0);
            expect(mockedLogger.info).toHaveBeenCalledWith('🔥 Warming specific data type: geo');
            expect(mockedCacheService.set).toHaveBeenCalledWith(
                'geo:cities:coordinates',
                expect.any(Object),
                'geolocation',
                expect.any(Object)
            );
        });

        it('should throw error for unknown data type', async () => {
            await expect(warmingService.warmSpecificData('unknown' as 'restaurants')).rejects.toThrow(
                'Unknown data type: unknown'
            );
        });
    });

    describe('Restaurant warming logic', () => {
        it('should cache all restaurants list', async () => {
            mockedRestaurantService.getAllCached.mockResolvedValue([
                createMockData.restaurant(),
                createMockData.restaurant({ _id: 'restaurant-2' }),
            ]);
            mockedCacheService.set.mockResolvedValue();

            const result = await warmingService.warmSpecificData('restaurants');

            expect(mockedCacheService.set).toHaveBeenCalledWith(
                'restaurants:all',
                [createMockData.restaurant(), createMockData.restaurant({ _id: 'restaurant-2' })],
                'restaurants',
                { ttl: 300, tags: ['restaurants', 'listings'] }
            );
            expect(result).toBeGreaterThan(0);
        });

        it('should cache individual top restaurants', async () => {
            const extendedMockRestaurants = Array.from({ length: 25 }, (_, i) => ({
                ...createMockData.restaurant(),
                _id: `${i + 1}`,
                name: `Restaurant ${i + 1}`,
            }));
            mockedRestaurantService.getAllCached.mockResolvedValue(extendedMockRestaurants as MockRestaurant[]);
            mockedCacheService.set.mockResolvedValue();

            await warmingService.warmSpecificData('restaurants');

            // Should cache top 20 restaurants individually
            expect(mockedCacheService.set).toHaveBeenCalledWith(
                'restaurant:1',
                extendedMockRestaurants[0],
                'restaurants',
                { ttl: 600, tags: ['restaurants'] }
            );
        });

        it('should cache popular restaurant searches', async () => {
            mockedRestaurantService.getAllCached.mockResolvedValue([createMockData.restaurant()]);
            mockedCacheService.set.mockResolvedValue();

            await warmingService.warmSpecificData('restaurants');

            expect(mockedCacheService.set).toHaveBeenCalledWith(
                expect.stringContaining('restaurants:search:'),
                expect.any(Array),
                'restaurants',
                { ttl: 600, tags: ['restaurants', 'search'] }
            );
        });

        it('should handle empty restaurant list', async () => {
            mockedRestaurantService.getAllCached.mockResolvedValue([]);
            mockedCacheService.set.mockResolvedValue();

            const result = await warmingService.warmSpecificData('restaurants');

            // Should still warm search filters even with empty list
            expect(result).toBeGreaterThan(0);
        });
    });

    describe('Business warming logic', () => {
        it('should cache all businesses list', async () => {
            mockedBusinessService.getAllCached.mockResolvedValue([
                createMockData.business(),
                createMockData.business({ _id: 'business-2' }),
            ]);
            mockedCacheService.set.mockResolvedValue();

            await warmingService.warmSpecificData('businesses');

            expect(mockedCacheService.set).toHaveBeenCalledWith(
                'businesses:all',
                [createMockData.business(), createMockData.business({ _id: 'business-2' })],
                'businesses',
                { ttl: 600, tags: ['businesses', 'listings'] }
            );
        });

        it('should cache businesses by categories', async () => {
            mockedBusinessService.getAllCached.mockResolvedValue([
                createMockData.business(),
                createMockData.business({ _id: 'business-2' }),
            ]);
            mockedCacheService.set.mockResolvedValue();

            await warmingService.warmSpecificData('businesses');

            expect(mockedCacheService.set).toHaveBeenCalledWith(
                'businesses:category:market',
                expect.any(Array),
                'businesses',
                { ttl: 900, tags: ['businesses', 'categories'] }
            );
        });
    });

    describe('User warming logic', () => {
        it('should cache user statistics', async () => {
            mockedCacheService.set.mockResolvedValue();

            await warmingService.warmSpecificData('users');

            expect(mockedCacheService.set).toHaveBeenCalledWith(
                'users:stats',
                {
                    totalUsers: 0,
                    activeUsers: 0,
                    professionalUsers: 0,
                    recentSignups: 0,
                    usersByRole: {
                        user: 0,
                        professional: 0,
                        admin: 0,
                    },
                    lastUpdated: expect.any(Date),
                    cacheGenerated: true,
                },
                'users',
                { ttl: 3600, tags: ['users', 'stats'] }
            );
        });

        it('should cache admin user profiles without sensitive data', async () => {
            mockedCacheService.set.mockResolvedValue();

            await warmingService.warmSpecificData('users');

            expect(mockedCacheService.set).toHaveBeenCalledWith(
                'user:profile:1',
                {
                    _id: '1',
                    username: 'admin1',
                    role: 'admin',
                },
                'users',
                { ttl: 1800, tags: ['users', 'profiles'] }
            );
        });
    });

    describe('Categories warming logic', () => {
        it('should cache restaurant categories', async () => {
            mockedCacheService.set.mockResolvedValue();

            await warmingService.warmSpecificData('categories');

            expect(mockedCacheService.set).toHaveBeenCalledWith(
                'categories:restaurants',
                expect.arrayContaining(['vegan', 'vegetarian', 'organic']),
                'categories',
                { ttl: 3600, tags: ['categories', 'static'] }
            );
        });

        it('should cache business categories', async () => {
            mockedCacheService.set.mockResolvedValue();

            await warmingService.warmSpecificData('categories');

            expect(mockedCacheService.set).toHaveBeenCalledWith(
                'categories:businesses',
                expect.arrayContaining(['market', 'shop', 'service']),
                'categories',
                { ttl: 3600, tags: ['categories', 'static'] }
            );
        });

        it('should cache popular cities', async () => {
            mockedCacheService.set.mockResolvedValue();

            await warmingService.warmSpecificData('categories');

            expect(mockedCacheService.set).toHaveBeenCalledWith(
                'cities:popular',
                expect.arrayContaining(['madrid', 'barcelona', 'valencia']),
                'geographical',
                { ttl: 7200, tags: ['geographical', 'cities'] }
            );
        });

        it('should cache app configuration', async () => {
            mockedCacheService.set.mockResolvedValue();

            await warmingService.warmSpecificData('categories');

            expect(mockedCacheService.set).toHaveBeenCalledWith(
                'app:config',
                {
                    version: '1.0.0',
                    features: ['cache', 'geolocation', 'reviews', 'search'],
                    supportedLanguages: ['es', 'en'],
                    maxResults: 50,
                    defaultRadius: 5000,
                },
                'config',
                { ttl: 7200, tags: ['config', 'static'] }
            );
        });
    });

    describe('Geographical data warming logic', () => {
        it('should cache city coordinates', async () => {
            mockedCacheService.set.mockResolvedValue();

            await warmingService.warmSpecificData('geo');

            expect(mockedCacheService.set).toHaveBeenCalledWith(
                'geo:cities:coordinates',
                expect.objectContaining({
                    madrid: { lat: 40.4168, lng: -3.7038 },
                    barcelona: { lat: 41.3851, lng: 2.1734 },
                }),
                'geolocation',
                { ttl: 7200, tags: ['geolocation', 'coordinates'] }
            );
        });

        it('should cache popular geographical searches', async () => {
            mockedCacheService.set.mockResolvedValue();

            await warmingService.warmSpecificData('geo');

            expect(mockedCacheService.set).toHaveBeenCalledWith(
                'geo:40.4168:-3.7038:5000',
                expect.objectContaining({
                    restaurants: 15,
                    businesses: 8,
                    total: 23,
                    center: { lat: 40.4168, lng: -3.7038 },
                    radius: 5000,
                }),
                'geolocation',
                { ttl: 1800, tags: ['geolocation', 'search'] }
            );
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

        it('should show warming in progress status', async () => {
            let resolveResolve: () => void;
            const delayedPromise = new Promise<any[]>(resolve => {
                resolveResolve = () => resolve([]);
            });

            mockedRestaurantService.getAllCached.mockReturnValue(delayedPromise);
            mockedBusinessService.getAllCached.mockResolvedValue([]);
            mockedCacheService.set.mockResolvedValue();

            // Start warming but don't wait for completion
            const warmingPromise = warmingService.warmUpCriticalData();

            // Check status immediately
            const stats = warmingService.getWarmingStats();
            expect(stats.isWarming).toBe(true);

            // Complete the promise and wait for warming to finish
            resolveResolve!();
            await warmingPromise;
        });

        it('should show last warming time after completion', async () => {
            mockedRestaurantService.getAllCached.mockResolvedValue([]);
            mockedBusinessService.getAllCached.mockResolvedValue([]);
            mockedCacheService.set.mockResolvedValue();

            await warmingService.warmUpCriticalData();

            const stats = warmingService.getWarmingStats();
            expect(stats.lastWarmingTime).toBeInstanceOf(Date);
        });
    });

    describe('Periodic warming', () => {
        it('should perform periodic warming when interval expires', async () => {
            mockedRestaurantService.getAllCached.mockResolvedValue([]);
            mockedBusinessService.getAllCached.mockResolvedValue([]);
            mockedCacheService.set.mockResolvedValue();

            await warmingService.startAutoWarming(1); // 1 minute interval

            // Clear initial warming calls
            vi.clearAllMocks();

            // Advance timer by 1 minute
            vi.advanceTimersByTime(60 * 1000);
            await vi.runOnlyPendingTimersAsync();

            expect(mockedLogger.info).toHaveBeenCalledWith('🔥 Starting comprehensive cache warming...');
        });
    });

    describe('Error handling', () => {
        it('should handle and log restaurant warming errors', async () => {
            mockedRestaurantService.getAllCached.mockRejectedValue(new Error('DB error'));
            mockedBusinessService.getAllCached.mockResolvedValue([]);
            mockedCacheService.set.mockResolvedValue();

            const result = await warmingService.warmUpCriticalData();

            expect(mockedLogger.error).toHaveBeenCalledWith('Error warming restaurants: Error: DB error');
            expect(result.errors).toContain('Error warming restaurants: Error: DB error');
        });

        it('should continue warming other data types after one fails', async () => {
            mockedRestaurantService.getAllCached.mockRejectedValue(new Error('Restaurant error'));
            mockedBusinessService.getAllCached.mockResolvedValue([]);
            mockedCacheService.set.mockResolvedValue();

            const result = await warmingService.warmUpCriticalData();

            // Should have attempted to warm other data types
            expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Users warmed:'));
            expect(result.itemsWarmed).toBeGreaterThan(0);
        });
    });

    describe('Singleton Instance', () => {
        it('should have singleton exported', () => {
            const { cacheWarmingService } = require('../../../src/services/CacheWarmingService');
            expect(cacheWarmingService).toBeInstanceOf(CacheWarmingService);
        });
    });
});

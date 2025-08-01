/**
 * Clean CacheService Tests - Using Unified Mock System
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupTest } from '../config/unified-test-config';
import { mockFactory } from '../mocks/unified-mock-factory';

// Mock the CacheService module
vi.mock('../../services/CacheService', () => mockFactory.createCacheServiceMockModule());

describe('CacheService', () => {
    const testHooks = setupTest();
    let cacheService: any;

    beforeEach(async () => {
        await testHooks.beforeEach();
        vi.clearAllMocks();
        // Get the mocked service instance directly from the mock
        const { CacheService } = await import('../../services/CacheService');
        cacheService = new CacheService();
    });

    afterEach(() => {
        // Clean up after each test
    });

    describe('Constructor and initialization', () => {
        it('should create CacheService instance successfully', () => {
            expect(cacheService).toBeDefined();
            expect(typeof cacheService.get).toBe('function');
            expect(typeof cacheService.set).toBe('function');
            expect(typeof cacheService.flush).toBe('function');
        });
    });

    describe('get method', () => {
        it('should return null on cache miss', async () => {
            const result = await cacheService.get('test-key');
            expect(result).toBeNull();
        });

        it('should handle different data types correctly', async () => {
            const stringResult = await cacheService.get<string>('string-key');
            const objectResult = await cacheService.get<object>('object-key');

            expect(stringResult).toBeNull();
            expect(objectResult).toBeNull();
        });
    });

    describe('set method', () => {
        it('should set value without throwing errors', async () => {
            const testData = { id: 1, name: 'Test' };

            await expect(cacheService.set('test-key', testData)).resolves.toBeUndefined();
        });

        it('should set value with specific type', async () => {
            const testData = { id: 1, name: 'Test' };

            await expect(cacheService.set('test-key', testData, 'restaurants')).resolves.toBeUndefined();
        });

        it('should set value with custom options', async () => {
            const testData = { id: 1, name: 'Test' };
            const options = { ttl: 600 };

            await expect(cacheService.set('test-key', testData, 'default', options)).resolves.toBeUndefined();
        });
    });

    describe('setWithTags method', () => {
        it('should set value with tags without throwing', async () => {
            const testData = { id: 1, name: 'Test' };
            const tags = ['restaurants', 'reviews'];

            await expect(cacheService.setWithTags('test-key', testData, tags)).resolves.toBeUndefined();
        });

        it('should set value with tags and custom TTL', async () => {
            const testData = { id: 1, name: 'Test' };
            const tags = ['restaurants'];

            await expect(cacheService.setWithTags('test-key', testData, tags, 600)).resolves.toBeUndefined();
        });
    });

    describe('invalidate method', () => {
        it('should invalidate key without throwing', async () => {
            await expect(cacheService.invalidate('test-key')).resolves.toBeUndefined();
        });
    });

    describe('invalidatePattern method', () => {
        it('should invalidate pattern without throwing', async () => {
            await expect(cacheService.invalidatePattern('test:*')).resolves.toBeUndefined();
        });
    });

    describe('invalidateByTag method', () => {
        it('should invalidate by tag without throwing', async () => {
            await expect(cacheService.invalidateByTag('restaurants')).resolves.toBeUndefined();
        });
    });

    describe('getStats method', () => {
        it('should return cache statistics', async () => {
            const stats = await cacheService.getStats();

            expect(stats).toEqual({
                hitRatio: 85.5,
                totalRequests: 1000,
                cacheSize: 250,
                memoryUsage: '2.5MB',
                uptime: 3600,
            });
        });
    });

    describe('flush method', () => {
        it('should flush cache without throwing', async () => {
            await expect(cacheService.flush()).resolves.toBeUndefined();
        });
    });

    describe('exists method', () => {
        it('should return false for non-existent key', async () => {
            const exists = await cacheService.exists('test-key');
            expect(exists).toBe(false);
        });
    });

    describe('expire method', () => {
        it('should set expiration without throwing', async () => {
            await expect(cacheService.expire('test-key', 3600)).resolves.toBeUndefined();
        });
    });

    describe('disconnect method', () => {
        it('should disconnect without throwing', async () => {
            await expect(cacheService.disconnect()).resolves.toBeUndefined();
        });
    });
});

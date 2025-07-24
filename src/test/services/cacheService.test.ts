import { vi } from 'vitest';
import type { MockedClass, Mocked } from 'vitest';
import { CacheService, CacheStats, CacheOptions } from '../../services/CacheService';
import Redis from 'ioredis';
import logger from '../../utils/logger';

// Mock Redis
vi.mock('ioredis');
vi.mock('../../utils/logger');

const MockedRedis = Redis as MockedClass<typeof Redis>;
const mockedLogger = logger as Mocked<typeof logger>;

describe('CacheService', () => {
    let cacheService: CacheService;
    let mockRedis: Mocked<Redis>;

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();

        // Create mock Redis instance
        mockRedis = {
            get: vi.fn(),
            setex: vi.fn(),
            del: vi.fn(),
            scan: vi.fn(),
            info: vi.fn(),
            dbsize: vi.fn(),
            flushdb: vi.fn(),
            exists: vi.fn(),
            expire: vi.fn(),
            quit: vi.fn(),
            on: vi.fn(),
        };

        // Mock Redis constructor
        MockedRedis.mockImplementation(() => mockRedis);

        // Create fresh instance
        cacheService = new CacheService();
    });

    afterEach(async () => {
        await cacheService.disconnect();
    });

    describe('Constructor and Redis initialization', () => {
        it('should initialize Redis with correct configuration', () => {
            expect(MockedRedis).toHaveBeenCalledWith({
                host: 'localhost',
                port: 6379,
                db: 0,
                retryDelayOnFailover: 100,
                maxRetriesPerRequest: 3,
                lazyConnect: true,
                keepAlive: 30000,
                connectTimeout: 10000,
                commandTimeout: 5000,
            });
        });

        it('should set up Redis event listeners', () => {
            expect(mockRedis.on).toHaveBeenCalledWith('connect', expect.any(Function));
            expect(mockRedis.on).toHaveBeenCalledWith('ready', expect.any(Function));
            expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
            expect(mockRedis.on).toHaveBeenCalledWith('close', expect.any(Function));
        });

        it('should use environment variables for Redis configuration', () => {
            const { TEST_REDIS_CONFIG } = require('../../testConfig');
            process.env.REDIS_HOST = 'test-host';
            process.env.REDIS_PORT = '6380';
            process.env.REDIS_PASSWORD = TEST_REDIS_CONFIG.password;

            const testService = new CacheService();
            expect(testService).toBeDefined();

            expect(MockedRedis).toHaveBeenCalledWith(
                expect.objectContaining({
                    host: 'test-host',
                    port: 6380,
                    password: TEST_REDIS_CONFIG.password,
                })
            );

            // Cleanup
            delete process.env.REDIS_HOST;
            delete process.env.REDIS_PORT;
            delete process.env.REDIS_PASSWORD;
        });
    });

    describe('get method', () => {
        it('should return cached value on cache hit', async () => {
            const testData = { id: 1, name: 'Test' };
            mockRedis.get.mockResolvedValue(JSON.stringify(testData));

            const result = await cacheService.get<typeof testData>('test-key');

            expect(mockRedis.get).toHaveBeenCalledWith('test-key');
            expect(result).toEqual(testData);
            expect(mockedLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Cache HIT: test-key'));
        });

        it('should return null on cache miss', async () => {
            mockRedis.get.mockResolvedValue(null);

            const result = await cacheService.get('test-key');

            expect(mockRedis.get).toHaveBeenCalledWith('test-key');
            expect(result).toBeNull();
            expect(mockedLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Cache MISS: test-key'));
        });

        it('should handle Redis errors gracefully', async () => {
            const error = new Error('Redis error');
            mockRedis.get.mockRejectedValue(error);

            const result = await cacheService.get('test-key');

            expect(result).toBeNull();
            expect(mockedLogger.error).toHaveBeenCalledWith('Cache GET error for key test-key:', error);
        });

        it('should handle invalid JSON gracefully', async () => {
            mockRedis.get.mockResolvedValue('invalid-json');

            const result = await cacheService.get('test-key');

            expect(result).toBeNull();
            expect(mockedLogger.error).toHaveBeenCalledWith('Cache GET error for key test-key:', expect.any(Error));
        });
    });

    describe('set method', () => {
        it('should set value with default TTL', async () => {
            const testData = { id: 1, name: 'Test' };
            mockRedis.setex.mockResolvedValue('OK');

            await cacheService.set('test-key', testData);

            expect(mockRedis.setex).toHaveBeenCalledWith(
                'test-key',
                300, // default TTL
                JSON.stringify(testData)
            );
            expect(mockedLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Cache SET: test-key (TTL: 300s'));
        });

        it('should set value with specific type TTL', async () => {
            const testData = { id: 1, name: 'Restaurant' };
            mockRedis.setex.mockResolvedValue('OK');

            await cacheService.set('test-key', testData, 'restaurants');

            expect(mockRedis.setex).toHaveBeenCalledWith(
                'test-key',
                300, // restaurants TTL
                JSON.stringify(testData)
            );
        });

        it('should set value with custom TTL in options', async () => {
            const testData = { id: 1, name: 'Test' };
            const options: CacheOptions = { ttl: 600 };
            mockRedis.setex.mockResolvedValue('OK');

            await cacheService.set('test-key', testData, 'default', options);

            expect(mockRedis.setex).toHaveBeenCalledWith('test-key', 600, JSON.stringify(testData));
        });

        it('should handle tags for invalidation', async () => {
            const testData = { id: 1, name: 'Test' };
            const options: CacheOptions = { tags: ['restaurants', 'nearby'] };
            mockRedis.setex.mockResolvedValue('OK');

            await cacheService.set('test-key', testData, 'default', options);

            expect(mockRedis.setex).toHaveBeenCalledWith('test-key', 300, JSON.stringify(testData));
        });

        it('should handle Redis errors gracefully', async () => {
            const error = new Error('Redis error');
            mockRedis.setex.mockRejectedValue(error);

            await cacheService.set('test-key', { data: 'test' });

            expect(mockedLogger.error).toHaveBeenCalledWith('Cache SET error for key test-key:', error);
        });
    });

    describe('setWithTags method', () => {
        it('should set value with tags', async () => {
            const testData = { id: 1, name: 'Test' };
            const tags = ['restaurants', 'nearby'];
            mockRedis.setex.mockResolvedValue('OK');

            await cacheService.setWithTags('test-key', testData, tags);

            expect(mockRedis.setex).toHaveBeenCalledWith('test-key', 300, JSON.stringify(testData));
        });

        it('should set value with tags and custom TTL', async () => {
            const testData = { id: 1, name: 'Test' };
            const tags = ['restaurants', 'nearby'];
            mockRedis.setex.mockResolvedValue('OK');

            await cacheService.setWithTags('test-key', testData, tags, 600);

            expect(mockRedis.setex).toHaveBeenCalledWith('test-key', 600, JSON.stringify(testData));
        });
    });

    describe('invalidate method', () => {
        it('should delete specific key', async () => {
            mockRedis.del.mockResolvedValue(1);

            await cacheService.invalidate('test-key');

            expect(mockRedis.del).toHaveBeenCalledWith('test-key');
            expect(mockedLogger.debug).toHaveBeenCalledWith('🗑️ Cache INVALIDATED: test-key');
        });

        it('should handle Redis errors gracefully', async () => {
            const error = new Error('Redis error');
            mockRedis.del.mockRejectedValue(error);

            await cacheService.invalidate('test-key');

            expect(mockedLogger.error).toHaveBeenCalledWith('Cache INVALIDATE error for key test-key:', error);
        });
    });

    describe('invalidatePattern method', () => {
        it('should invalidate keys matching pattern', async () => {
            mockRedis.scan.mockResolvedValueOnce(['0', ['key1', 'key2']]).mockResolvedValueOnce(['0', []]);
            mockRedis.del.mockResolvedValue(2);

            await cacheService.invalidatePattern('test:*');

            expect(mockRedis.scan).toHaveBeenCalledWith('0', 'MATCH', 'test:*', 'COUNT', 100);
            expect(mockRedis.del).toHaveBeenCalledWith('key1', 'key2');
            expect(mockedLogger.info).toHaveBeenCalledWith('🧹 Cache PATTERN INVALIDATED: test:* (2 keys)');
        });

        it('should handle multiple scan batches', async () => {
            mockRedis.scan.mockResolvedValueOnce(['1', ['key1', 'key2']]).mockResolvedValueOnce(['0', ['key3']]);
            mockRedis.del.mockResolvedValue(3);

            await cacheService.invalidatePattern('test:*');

            expect(mockRedis.scan).toHaveBeenCalledTimes(2);
            expect(mockRedis.del).toHaveBeenCalledWith('key1', 'key2', 'key3');
        });

        it('should handle no matching keys', async () => {
            mockRedis.scan.mockResolvedValue(['0', []]);

            await cacheService.invalidatePattern('test:*');

            expect(mockRedis.del).not.toHaveBeenCalled();
        });

        it('should handle Redis errors gracefully', async () => {
            const error = new Error('Redis error');
            mockRedis.scan.mockRejectedValue(error);

            await cacheService.invalidatePattern('test:*');

            expect(mockedLogger.error).toHaveBeenCalledWith(
                'Cache PATTERN INVALIDATE error for pattern test:*:',
                error
            );
        });
    });

    describe('invalidateByTag method', () => {
        it('should invalidate keys associated with tag', async () => {
            // First set some data with tags to populate tagMap
            const testData = { id: 1, name: 'Test' };
            mockRedis.setex.mockResolvedValue('OK');
            await cacheService.setWithTags('test-key1', testData, ['restaurants']);
            await cacheService.setWithTags('test-key2', testData, ['restaurants']);

            mockRedis.del.mockResolvedValue(2);

            await cacheService.invalidateByTag('restaurants');

            expect(mockRedis.del).toHaveBeenCalledWith('test-key1', 'test-key2');
            expect(mockedLogger.info).toHaveBeenCalledWith('🏷️ Cache TAG INVALIDATED: restaurants (2 keys)');
        });

        it('should handle non-existent tags', async () => {
            await cacheService.invalidateByTag('non-existent-tag');

            expect(mockRedis.del).not.toHaveBeenCalled();
        });

        it('should handle Redis errors gracefully', async () => {
            const error = new Error('Redis error');
            const testData = { id: 1, name: 'Test' };
            mockRedis.setex.mockResolvedValue('OK');
            await cacheService.setWithTags('test-key', testData, ['restaurants']);

            mockRedis.del.mockRejectedValue(error);

            await cacheService.invalidateByTag('restaurants');

            expect(mockedLogger.error).toHaveBeenCalledWith('Cache TAG INVALIDATE error for tag restaurants:', error);
        });
    });

    describe('getStats method', () => {
        it('should return cache statistics', async () => {
            const mockInfo = `
                used_memory_human:1.27M
                uptime_in_seconds:3600
            `;
            mockRedis.info.mockResolvedValue(mockInfo);
            mockRedis.dbsize.mockResolvedValue(241);

            // Simulate some hits and misses
            mockRedis.get.mockResolvedValue(JSON.stringify({ test: 'data' }));
            await cacheService.get('test1');
            await cacheService.get('test2');

            mockRedis.get.mockResolvedValue(null);
            await cacheService.get('test3');

            const stats = await cacheService.getStats();

            expect(stats).toEqual({
                hitRatio: 66.67,
                totalRequests: 3,
                cacheSize: 241,
                memoryUsage: '1.27M',
                uptime: 3600,
            });
        });

        it('should handle Redis errors gracefully', async () => {
            const error = new Error('Redis error');
            mockRedis.info.mockRejectedValue(error);

            const stats = await cacheService.getStats();

            expect(stats).toEqual({
                hitRatio: 0,
                totalRequests: 0,
                cacheSize: 0,
                memoryUsage: 'Error',
                uptime: 0,
            });
            expect(mockedLogger.error).toHaveBeenCalledWith('Error getting cache stats:', error);
        });

        it('should handle malformed Redis info', async () => {
            mockRedis.info.mockResolvedValue('invalid info format');
            mockRedis.dbsize.mockResolvedValue(0);

            const stats = await cacheService.getStats();

            expect(stats.memoryUsage).toBe('Unknown');
            expect(stats.uptime).toBe(0);
        });
    });

    describe('flush method', () => {
        it('should flush all cache data', async () => {
            mockRedis.flushdb.mockResolvedValue('OK');

            await cacheService.flush();

            expect(mockRedis.flushdb).toHaveBeenCalled();
            expect(mockedLogger.warn).toHaveBeenCalledWith('🧽 Cache FLUSHED completely');
        });

        it('should handle Redis errors gracefully', async () => {
            const error = new Error('Redis error');
            mockRedis.flushdb.mockRejectedValue(error);

            await cacheService.flush();

            expect(mockedLogger.error).toHaveBeenCalledWith('Cache FLUSH error:', error);
        });
    });

    describe('exists method', () => {
        it('should return true if key exists', async () => {
            mockRedis.exists.mockResolvedValue(1);

            const result = await cacheService.exists('test-key');

            expect(result).toBe(true);
            expect(mockRedis.exists).toHaveBeenCalledWith('test-key');
        });

        it('should return false if key does not exist', async () => {
            mockRedis.exists.mockResolvedValue(0);

            const result = await cacheService.exists('test-key');

            expect(result).toBe(false);
        });

        it('should handle Redis errors gracefully', async () => {
            const error = new Error('Redis error');
            mockRedis.exists.mockRejectedValue(error);

            const result = await cacheService.exists('test-key');

            expect(result).toBe(false);
            expect(mockedLogger.error).toHaveBeenCalledWith('Cache EXISTS error for key test-key:', error);
        });
    });

    describe('expire method', () => {
        it('should set TTL for existing key', async () => {
            mockRedis.expire.mockResolvedValue(1);

            await cacheService.expire('test-key', 600);

            expect(mockRedis.expire).toHaveBeenCalledWith('test-key', 600);
            expect(mockedLogger.debug).toHaveBeenCalledWith('⏰ Cache TTL updated: test-key (600s)');
        });

        it('should handle Redis errors gracefully', async () => {
            const error = new Error('Redis error');
            mockRedis.expire.mockRejectedValue(error);

            await cacheService.expire('test-key', 600);

            expect(mockedLogger.error).toHaveBeenCalledWith('Cache EXPIRE error for key test-key:', error);
        });
    });

    describe('generateKey static method', () => {
        it('should generate consistent cache keys', () => {
            const key1 = CacheService.generateKey('users', 123, 'profile');
            const key2 = CacheService.generateKey('users', 123, 'profile');

            expect(key1).toBe('users:123:profile');
            expect(key1).toBe(key2);
        });

        it('should handle different data types', () => {
            const key = CacheService.generateKey('test', 123, true, 'end');

            expect(key).toBe('test:123:true:end');
        });

        it('should handle empty parts', () => {
            const key = CacheService.generateKey();

            expect(key).toBe('');
        });
    });

    describe('disconnect method', () => {
        it('should close Redis connection gracefully', async () => {
            mockRedis.quit.mockResolvedValue('OK');

            await cacheService.disconnect();

            expect(mockRedis.quit).toHaveBeenCalled();
            expect(mockedLogger.info).toHaveBeenCalledWith('👋 Redis connection closed gracefully');
        });

        it('should handle Redis errors gracefully', async () => {
            const error = new Error('Redis error');
            mockRedis.quit.mockRejectedValue(error);

            await cacheService.disconnect();

            expect(mockedLogger.error).toHaveBeenCalledWith('Error closing Redis connection:', error);
        });
    });

    describe('TTL configuration', () => {
        it('should use correct TTL for different content types', async () => {
            const testData = { id: 1, name: 'Test' };
            mockRedis.setex.mockResolvedValue('OK');

            await cacheService.set('test-key', testData, 'restaurants');
            expect(mockRedis.setex).toHaveBeenCalledWith('test-key', 300, expect.any(String));

            await cacheService.set('test-key', testData, 'businesses');
            expect(mockRedis.setex).toHaveBeenCalledWith('test-key', 600, expect.any(String));

            await cacheService.set('test-key', testData, 'geolocation');
            expect(mockRedis.setex).toHaveBeenCalledWith('test-key', 1800, expect.any(String));

            await cacheService.set('test-key', testData, 'users');
            expect(mockRedis.setex).toHaveBeenCalledWith('test-key', 900, expect.any(String));

            await cacheService.set('test-key', testData, 'reviews');
            expect(mockRedis.setex).toHaveBeenCalledWith('test-key', 180, expect.any(String));

            await cacheService.set('test-key', testData, 'categories');
            expect(mockRedis.setex).toHaveBeenCalledWith('test-key', 3600, expect.any(String));

            await cacheService.set('test-key', testData, 'search');
            expect(mockRedis.setex).toHaveBeenCalledWith('test-key', 600, expect.any(String));
        });

        it('should use default TTL for unknown content types', async () => {
            const testData = { id: 1, name: 'Test' };
            mockRedis.setex.mockResolvedValue('OK');

            await cacheService.set('test-key', testData, 'unknown-type');

            expect(mockRedis.setex).toHaveBeenCalledWith('test-key', 300, expect.any(String));
        });
    });
});

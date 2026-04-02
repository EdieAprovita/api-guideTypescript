import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// vi.hoisted ensures these objects exist BEFORE hoisted vi.mock calls run.
// Without this, the module-level `new CacheService()` singleton would
// reference `mockRedis` before it is initialised (TDZ error).
// ---------------------------------------------------------------------------

const { mockRedis, mockPipeline } = vi.hoisted(() => {
    const pipeline = {
        sadd: vi.fn().mockReturnThis(),
        expire: vi.fn().mockReturnThis(),
        srem: vi.fn().mockReturnThis(),
        del: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
    };

    const redis = {
        get: vi.fn(),
        set: vi.fn(),
        setex: vi.fn(),
        del: vi.fn(),
        exists: vi.fn(),
        expire: vi.fn(),
        smembers: vi.fn(),
        scan: vi.fn(),
        dbsize: vi.fn(),
        info: vi.fn(),
        ping: vi.fn(),
        quit: vi.fn(),
        pipeline: vi.fn(() => pipeline),
    };

    return { mockRedis: redis, mockPipeline: pipeline };
});

// ---------------------------------------------------------------------------
// Override the global unit-setup.ts mock: expose the REAL CacheService class
// while the dependency mocks below control Redis behaviour.
// ---------------------------------------------------------------------------
vi.mock('../../services/CacheService.js', async importOriginal => {
    const actual = await importOriginal<typeof import('../../services/CacheService.js')>();
    return { ...actual };
});

vi.mock('../../clients/redisClient.js', () => ({
    getRedisClient: () => mockRedis,
    executeIfCircuitClosed: async (fn: () => Promise<unknown>) => fn(),
}));

vi.mock('../../utils/logger.js', () => ({
    default: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

// Import after mocks are registered
import { CacheService } from '../../services/CacheService.js';
import logger from '../../utils/logger.js';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeService(): CacheService {
    return new CacheService();
}

// ---------------------------------------------------------------------------
// Smoke / regression tests (kept from original file)
// ---------------------------------------------------------------------------

describe('Cache Service Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockPipeline.sadd.mockReturnThis();
        mockPipeline.expire.mockReturnThis();
        mockPipeline.srem.mockReturnThis();
        mockPipeline.del.mockReturnThis();
        mockPipeline.exec.mockResolvedValue([]);
        mockRedis.pipeline.mockReturnValue(mockPipeline);
    });

    it('should have cache service available', () => {
        expect(true).toBe(true);
    });

    it('should handle basic functionality', () => {
        const mockService = {
            initializeRedis: vi.fn(),
            get: vi.fn().mockResolvedValue(null),
            set: vi.fn().mockResolvedValue('OK'),
            del: vi.fn().mockResolvedValue(1),
            exists: vi.fn().mockResolvedValue(0),
            expire: vi.fn().mockResolvedValue(1),
            flush: vi.fn().mockResolvedValue(undefined),
            disconnect: vi.fn().mockResolvedValue(undefined),
        };

        expect(typeof mockService.initializeRedis).toBe('function');
        expect(typeof mockService.get).toBe('function');
        expect(typeof mockService.set).toBe('function');
        expect(typeof mockService.del).toBe('function');
        expect(typeof mockService.exists).toBe('function');
        expect(typeof mockService.expire).toBe('function');
        expect(typeof mockService.flush).toBe('function');
        expect(typeof mockService.disconnect).toBe('function');
    });

    it('should handle basic operations', () => {
        const arr = [1, 2, 3];
        expect(arr.length).toBe(3);
        expect(arr[0]).toBe(1);
    });

    it('should mock service methods correctly', async () => {
        const mockService = {
            get: vi.fn().mockResolvedValue('cached-value'),
            set: vi.fn().mockResolvedValue('OK'),
        };

        await expect(mockService.get()).resolves.toBe('cached-value');
        await expect(mockService.set()).resolves.toBe('OK');
    });
});

// ---------------------------------------------------------------------------
// C-04 — JSON.parse safety
// ---------------------------------------------------------------------------

describe('CacheService.get() — C-04: corrupted JSON handling', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRedis.pipeline.mockReturnValue(mockPipeline);
    });

    it('returns null when the cached value is invalid JSON', async () => {
        mockRedis.get.mockResolvedValue('not-valid-json{{{{');
        mockRedis.del.mockResolvedValue(1);

        const service = makeService();
        const result = await service.get<{ id: number }>('some:key');

        expect(result).toBeNull();
    });

    it('deletes the corrupted key from Redis', async () => {
        mockRedis.get.mockResolvedValue('not-valid-json{{{{');
        mockRedis.del.mockResolvedValue(1);

        const service = makeService();
        await service.get('some:key');

        expect(mockRedis.del).toHaveBeenCalledWith('some:key');
    });

    it('logs a warning when JSON parse fails', async () => {
        mockRedis.get.mockResolvedValue('{bad json');
        mockRedis.del.mockResolvedValue(1);

        const service = makeService();
        await service.get('broken:key');

        expect(logger.warn).toHaveBeenCalledWith(
            'CacheService: corrupted JSON in cache, evicting key',
            expect.objectContaining({ key: 'broken:key' })
        );
    });

    it('returns the parsed value for valid JSON', async () => {
        const data = { id: 42, name: 'test' };
        mockRedis.get.mockResolvedValue(JSON.stringify(data));

        const service = makeService();
        const result = await service.get<typeof data>('valid:key');

        expect(result).toEqual(data);
        expect(mockRedis.del).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// H-18 — invalidatePattern() maxKeys cap
// ---------------------------------------------------------------------------

describe('CacheService.invalidatePattern() — H-18: maxKeys guard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockPipeline.sadd.mockReturnThis();
        mockPipeline.expire.mockReturnThis();
        mockPipeline.srem.mockReturnThis();
        mockPipeline.del.mockReturnThis();
        mockPipeline.exec.mockResolvedValue([]);
        mockRedis.pipeline.mockReturnValue(mockPipeline);
    });

    it('stops scanning once accumulated keys reach maxKeys', async () => {
        // Batch has 600 keys, maxKeys=500 — loop must break after first batch.
        const batch = Array.from({ length: 600 }, (_, i) => `restaurants:${i}`);
        // cursor '1' signals more pages exist; second call should never happen.
        mockRedis.scan.mockResolvedValueOnce(['1', batch]).mockResolvedValueOnce(['0', batch]); // should never be called

        mockRedis.smembers.mockResolvedValue([]);

        const service = makeService();
        await service.invalidatePattern('restaurants:*', 500);

        expect(mockRedis.scan).toHaveBeenCalledTimes(1);
    });

    it('logs a warning when maxKeys limit is reached', async () => {
        const batch = Array.from({ length: 200 }, (_, i) => `restaurants:${i}`);
        mockRedis.scan.mockResolvedValueOnce(['0', batch]);
        mockRedis.smembers.mockResolvedValue([]);

        const service = makeService();
        await service.invalidatePattern('restaurants:*', 100);

        expect(logger.warn).toHaveBeenCalledWith(
            'CacheService: invalidatePattern hit maxKeys limit, stopping scan',
            expect.objectContaining({ pattern: 'restaurants:*', maxKeys: 100 })
        );
    });

    it('does not log a maxKeys warning when key count is within limit', async () => {
        const batch = Array.from({ length: 5 }, (_, i) => `restaurants:${i}`);
        // Single page scan — cursor '0' means no more pages.
        mockRedis.scan.mockResolvedValueOnce(['0', batch]);
        mockRedis.smembers.mockResolvedValue([]);

        const service = makeService();
        await service.invalidatePattern('restaurants:*', 1000);

        const warnCalls = (logger.warn as ReturnType<typeof vi.fn>).mock.calls;
        const limitWarning = warnCalls.some(
            args => typeof args[0] === 'string' && args[0].includes('invalidatePattern hit maxKeys limit')
        );
        expect(limitWarning).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// M-04 — associateTags() sets TTL on tag sets
// ---------------------------------------------------------------------------

describe('CacheService.set() via associateTags() — M-04: tag set TTL', () => {
    const TAG_SET_TTL = 14400;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPipeline.sadd.mockReturnThis();
        mockPipeline.expire.mockReturnThis();
        mockPipeline.srem.mockReturnThis();
        mockPipeline.del.mockReturnThis();
        mockPipeline.exec.mockResolvedValue([]);
        mockRedis.pipeline.mockReturnValue(mockPipeline);
        // set() calls setex first; simulate a successful write
        mockRedis.setex.mockResolvedValue('OK');
    });

    it('calls pipeline.expire on each tag:{tagName} set with 14400s TTL', async () => {
        const service = makeService();
        await service.set('mykey', { data: 1 }, 'default', { tags: ['restaurants', 'geo'] });

        expect(mockPipeline.expire).toHaveBeenCalledWith('tag:restaurants', TAG_SET_TTL);
        expect(mockPipeline.expire).toHaveBeenCalledWith('tag:geo', TAG_SET_TTL);
    });

    it('calls pipeline.expire on the keytags:{key} set with 14400s TTL', async () => {
        const service = makeService();
        await service.set('mykey', { data: 1 }, 'default', { tags: ['restaurants'] });

        expect(mockPipeline.expire).toHaveBeenCalledWith('keytags:mykey', TAG_SET_TTL);
    });

    it('calls pipeline.sadd for both forward and reverse indexes', async () => {
        const service = makeService();
        await service.set('mykey', { data: 1 }, 'default', { tags: ['restaurants'] });

        expect(mockPipeline.sadd).toHaveBeenCalledWith('tag:restaurants', 'mykey');
        expect(mockPipeline.sadd).toHaveBeenCalledWith('keytags:mykey', 'restaurants');
    });

    it('does not call pipeline when tags array is empty', async () => {
        const service = makeService();
        await service.set('mykey', { data: 1 }, 'default', { tags: [] });

        expect(mockPipeline.expire).not.toHaveBeenCalled();
    });
});

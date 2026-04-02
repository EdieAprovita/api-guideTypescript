import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import healthRoutes from '../../routes/healthRoutes.js';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('../../services/CacheService', () => ({
    cacheService: {
        ping: vi.fn(),
    },
}));

vi.mock('../../clients/redisClient.js', () => ({
    getCircuitBreakerState: vi.fn(() => ({
        state: 'closed',
        failures: 0,
        lastFailure: null,
        nextRetry: null,
    })),
    checkAndAdvanceState: vi.fn(),
}));

vi.mock('mongoose', () => ({
    default: {
        connection: {
            readyState: 1,
        },
    },
}));

vi.mock('../../utils/logger', () => ({
    default: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

// ---------------------------------------------------------------------------
// Test app
// ---------------------------------------------------------------------------

const app = express();
app.use(express.json());
app.use('/health', healthRoutes);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getMongoose() {
    const mod = await import('mongoose');
    return mod.default;
}

async function getCacheService() {
    const mod = await import('../../services/CacheService');
    return mod.cacheService;
}

async function getRedisClientModule() {
    return await import('../../clients/redisClient.js');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /health/ready', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('when MongoDB is connected and Redis responds with PONG', () => {
        it('returns 200 with ready: true and both service flags true', async () => {
            const mongoose = await getMongoose();
            const cacheService = await getCacheService();

            (mongoose.connection as { readyState: number }).readyState = 1;
            vi.mocked(cacheService.ping).mockResolvedValue(true);

            const response = await request(app).get('/health/ready').expect(200);

            expect(response.body).toMatchObject({
                ready: true,
                mongo: true,
                redis: true,
            });
            expect(response.body.timestamp).toBeDefined();
        });
    });

    describe('when Redis ping returns false', () => {
        it('returns 503 with ready: false and redis: false', async () => {
            const mongoose = await getMongoose();
            const cacheService = await getCacheService();

            (mongoose.connection as { readyState: number }).readyState = 1;
            vi.mocked(cacheService.ping).mockResolvedValue(false);

            const response = await request(app).get('/health/ready').expect(503);

            expect(response.body).toMatchObject({
                ready: false,
                redis: false,
            });
        });
    });

    describe('when MongoDB is disconnected', () => {
        it('returns 503 with ready: false and mongo: false', async () => {
            const mongoose = await getMongoose();
            const cacheService = await getCacheService();

            (mongoose.connection as { readyState: number }).readyState = 0;
            vi.mocked(cacheService.ping).mockResolvedValue(true);

            const response = await request(app).get('/health/ready').expect(503);

            expect(response.body).toMatchObject({
                ready: false,
                mongo: false,
            });
        });
    });

    describe('when both MongoDB and Redis are down', () => {
        it('returns 503 with ready: false, mongo: false, redis: false', async () => {
            const mongoose = await getMongoose();
            const cacheService = await getCacheService();

            (mongoose.connection as { readyState: number }).readyState = 0;
            vi.mocked(cacheService.ping).mockResolvedValue(false);

            const response = await request(app).get('/health/ready').expect(503);

            expect(response.body).toMatchObject({
                ready: false,
                mongo: false,
                redis: false,
            });
        });
    });

    describe('bounded ping timeout', () => {
        it('resolves within 600 ms even when Redis hangs indefinitely', async () => {
            const mongoose = await getMongoose();
            const cacheService = await getCacheService();

            (mongoose.connection as { readyState: number }).readyState = 1;
            // Simulate a hung Redis connection — never resolves
            vi.mocked(cacheService.ping).mockReturnValue(new Promise(() => {}));

            const start = Date.now();
            const response = await request(app).get('/health/ready');
            const elapsed = Date.now() - start;

            // Probe must complete well under a second (timeout is 500 ms)
            expect(elapsed).toBeLessThan(600);
            // Redis timed out, so the service is not ready
            expect(response.status).toBe(503);
            expect(response.body.redis).toBe(false);
        });
    });
});

describe('GET /health/deep', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns 200 when Redis is healthy and the circuit breaker is half-open', async () => {
        const mongoose = await getMongoose();
        const cacheService = await getCacheService();
        const redisClient = await getRedisClientModule();

        (mongoose.connection as { readyState: number }).readyState = 1;
        vi.mocked(cacheService.ping).mockResolvedValue(true);
        vi.mocked(redisClient.getCircuitBreakerState).mockReturnValue({
            state: 'half-open',
            failures: 5,
            lastFailure: Date.now() - 1000,
            nextRetry: null,
        });

        const response = await request(app).get('/health/deep').expect(200);

        expect(response.body.status).toBe('healthy');
        expect(response.body.services.redis).toBe(true);
        expect(response.body.services.circuitBreaker.state).toBe('half-open');
    });

    it('returns 503 when Redis is connected but the circuit breaker is still open', async () => {
        const mongoose = await getMongoose();
        const cacheService = await getCacheService();
        const redisClient = await getRedisClientModule();

        (mongoose.connection as { readyState: number }).readyState = 1;
        vi.mocked(cacheService.ping).mockResolvedValue(true);
        vi.mocked(redisClient.getCircuitBreakerState).mockReturnValue({
            state: 'open',
            failures: 5,
            lastFailure: Date.now() - 1000,
            nextRetry: Date.now() + 10_000,
        });

        const response = await request(app).get('/health/deep').expect(503);

        expect(response.body.status).toBe('degraded');
        expect(response.body.services.redis).toBe(true);
        expect(response.body.services.circuitBreaker.state).toBe('open');
    });
});

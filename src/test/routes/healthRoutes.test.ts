import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import healthRoutes, { healthV1Router } from '../../routes/healthRoutes.js';
import * as authMiddleware from '../../middleware/authMiddleware.js';

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

// Mock auth middleware — default: passes through (existing tests unaffected).
// Using vi.fn() so individual tests can override with mockImplementationOnce.
vi.mock('../../middleware/authMiddleware.js', () => ({
    protect: vi.fn((_req: Request, _res: Response, next: NextFunction) => next()),
    admin: vi.fn((_req: Request, _res: Response, next: NextFunction) => next()),
}));

// ---------------------------------------------------------------------------
// Test apps
// ---------------------------------------------------------------------------

const app = express();
app.use(express.json());
app.use('/health', healthRoutes);

// Mirrors the production mount in app.ts — used by B-C3 tests to catch
// routing regressions on the /api/v1/health alias specifically.
const apiApp = express();
apiApp.use(express.json());
apiApp.use('/health', healthRoutes);
apiApp.use('/api/v1/health', healthV1Router);

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

// ---------------------------------------------------------------------------
// H-01: /health/deep is protected — returns 401 without a valid token
// ---------------------------------------------------------------------------

describe('GET /health/deep — auth guard (H-01)', () => {
    it('returns 401 when protect middleware rejects the request', async () => {
        // Override the module-level protect mock for this single test so the
        // REAL healthRoutes router (already mounted in `app`) returns 401.
        vi.mocked(authMiddleware.protect).mockImplementationOnce(
            (_req: Request, res: Response, _next: NextFunction) => {
                res.status(401).json({ success: false, message: 'Not authorized to access this route' });
            }
        );

        const response = await request(app).get('/health/deep');
        expect(response.status).toBe(401);
    });
});

// ---------------------------------------------------------------------------
// B3-03: GET /health/v1 — Sprint-3 versioned liveness endpoint
// ---------------------------------------------------------------------------

describe('GET /health/v1 (Sprint-3 contract)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns 200 with status "ok" and services mongo/redis "ok" when both are up', async () => {
        const mongoose = await getMongoose();
        const cacheService = await getCacheService();

        (mongoose.connection as { readyState: number }).readyState = 1;
        vi.mocked(cacheService.ping).mockResolvedValue(true);

        const response = await request(app).get('/health/v1').expect(200);

        expect(response.body).toMatchObject({
            status: 'ok',
            services: { mongo: 'ok', redis: 'ok' },
        });
        expect(typeof response.body.uptime).toBe('number');
        expect(response.body.timestamp).toBeDefined();
    });

    it('returns 503 with status "degraded" and redis "down" when Redis is unavailable', async () => {
        const mongoose = await getMongoose();
        const cacheService = await getCacheService();

        (mongoose.connection as { readyState: number }).readyState = 1;
        vi.mocked(cacheService.ping).mockResolvedValue(false);

        const response = await request(app).get('/health/v1').expect(503);

        expect(response.body).toMatchObject({
            status: 'degraded',
            services: { mongo: 'ok', redis: 'down' },
        });
    });

    it('returns 503 with status "degraded" and mongo "down" when MongoDB is disconnected', async () => {
        const mongoose = await getMongoose();
        const cacheService = await getCacheService();

        (mongoose.connection as { readyState: number }).readyState = 0;
        vi.mocked(cacheService.ping).mockResolvedValue(true);

        const response = await request(app).get('/health/v1').expect(503);

        expect(response.body).toMatchObject({
            status: 'degraded',
            services: { mongo: 'down', redis: 'ok' },
        });
    });

    it('returns 503 with both services "down" when both are unavailable', async () => {
        const mongoose = await getMongoose();
        const cacheService = await getCacheService();

        (mongoose.connection as { readyState: number }).readyState = 0;
        vi.mocked(cacheService.ping).mockResolvedValue(false);

        const response = await request(app).get('/health/v1').expect(503);

        expect(response.body).toMatchObject({
            status: 'degraded',
            services: { mongo: 'down', redis: 'down' },
        });
    });

    it('completes within 2500 ms even when Redis hangs indefinitely (2 s bounded ping)', async () => {
        const mongoose = await getMongoose();
        const cacheService = await getCacheService();

        (mongoose.connection as { readyState: number }).readyState = 1;
        // Simulate a hung Redis connection — never resolves
        vi.mocked(cacheService.ping).mockReturnValue(new Promise(() => {}));

        const start = Date.now();
        const response = await request(app).get('/health/v1');
        const elapsed = Date.now() - start;

        expect(elapsed).toBeLessThan(2_500);
        expect(response.status).toBe(503);
        expect(response.body.services.redis).toBe('down');
    });

    it('does NOT require authentication', async () => {
        // Reset protect mock to ensure it would block if called
        vi.mocked(authMiddleware.protect).mockImplementationOnce(
            (_req: Request, res: Response, _next: NextFunction) => {
                res.status(401).json({ success: false, message: 'Not authorized' });
            }
        );

        const mongoose = await getMongoose();
        const cacheService = await getCacheService();
        (mongoose.connection as { readyState: number }).readyState = 1;
        vi.mocked(cacheService.ping).mockResolvedValue(true);

        // /health/v1 must NOT invoke protect — it should succeed even when protect would block
        const response = await request(app).get('/health/v1');
        expect(response.status).toBe(200);
    });
});

// ---------------------------------------------------------------------------
// B-C3: GET /api/v1/health — routing alias must serve the Sprint-3 contract
// These tests hit the /api/v1/health path (not /health/v1) to catch future
// regressions in the healthV1Router mount in app.ts.
// ---------------------------------------------------------------------------

describe('GET /api/v1/health (B-C3 routing alias)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns 200 with Sprint-3 contract payload when all services are up', async () => {
        const mongoose = await getMongoose();
        const cacheService = await getCacheService();

        (mongoose.connection as { readyState: number }).readyState = 1;
        vi.mocked(cacheService.ping).mockResolvedValue(true);

        const response = await request(apiApp).get('/api/v1/health').expect(200);

        expect(response.body).toMatchObject({
            status: 'ok',
            services: { mongo: 'ok', redis: 'ok' },
        });
        expect(typeof response.body.uptime).toBe('number');
        expect(typeof response.body.timestamp).toBe('string');
    });

    it('returns 503 with status "degraded" when Redis ping times out', async () => {
        const mongoose = await getMongoose();
        const cacheService = await getCacheService();

        (mongoose.connection as { readyState: number }).readyState = 1;
        // Simulate Redis ping timeout — never resolves, bounded at 2 s
        vi.mocked(cacheService.ping).mockReturnValue(new Promise(() => {}));

        const response = await request(apiApp).get('/api/v1/health');

        expect(response.status).toBe(503);
        expect(response.body).toMatchObject({
            status: 'degraded',
            services: { mongo: 'ok', redis: 'down' },
        });
    });
});

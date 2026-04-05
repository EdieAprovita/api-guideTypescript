import express, { Request, Response } from 'express';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';
import { cacheService } from '../services/CacheService.js';
import { getCircuitBreakerState, checkAndAdvanceState } from '../clients/redisClient.js';
import { protect, admin } from '../middleware/authMiddleware.js';

// Bounded ping helper: resolves false after `timeoutMs` so a stalled
// connection cannot hold the probe open indefinitely.
async function pingWithTimeout(timeoutMs: number): Promise<boolean> {
    let timeoutId: ReturnType<typeof setTimeout>;
    return Promise.race([
        cacheService.ping().finally(() => clearTimeout(timeoutId)),
        new Promise<boolean>(resolve => {
            timeoutId = setTimeout(() => resolve(false), timeoutMs);
        }),
    ]);
}

const router = express.Router();

/**
 * @description Health check — reports server liveness and database connectivity.
 * Returns 200 when the database is connected, 503 when degraded or unavailable.
 * Intentionally lightweight so load-balancer probes remain fast.
 * @route GET /health
 */
router.get('/', async (_req: Request, res: Response) => {
    try {
        logger.debug('Health check requested');

        const dbState = mongoose.connection.readyState;
        const isDbHealthy = dbState === 1; // 1 = connected

        const health = {
            status: isDbHealthy ? 'ok' : 'degraded',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: isDbHealthy ? 'connected' : 'disconnected',
        };

        res.status(isDbHealthy ? 200 : 503).json(health);
    } catch (error) {
        logger.error('Health check failed', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
        res.status(503).json({
            status: 'error',
            timestamp: new Date().toISOString(),
        });
    }
});

/**
 * @description Readiness probe — indicates if the server is ready to accept traffic.
 * Gates on both MongoDB and Redis connectivity. The Redis ping is bounded to 500 ms
 * so a hung Redis connection cannot block Kubernetes probes long enough to cause
 * an unnecessary pod restart.
 * @route GET /ready
 */
router.get('/ready', async (_req: Request, res: Response) => {
    try {
        logger.debug('Readiness probe requested');

        const mongoConnected = mongoose.connection.readyState === 1;
        const redisConnected = await pingWithTimeout(500);
        const ready = mongoConnected && redisConnected;

        if (ready) {
            logger.info('Readiness check passed');
            res.status(200).json({
                ready: true,
                mongo: mongoConnected,
                redis: redisConnected,
                timestamp: new Date().toISOString(),
                message: 'Service is ready to accept requests',
            });
        } else {
            logger.warn('Readiness check failed', {
                mongoState: mongoose.connection.readyState,
                redis: redisConnected,
            });
            res.status(503).json({
                ready: false,
                mongo: mongoConnected,
                redis: redisConnected,
                timestamp: new Date().toISOString(),
                message: 'Service is not ready',
            });
        }
    } catch (error) {
        logger.error('Readiness check error', error as Error);
        res.status(503).json({
            ready: false,
            timestamp: new Date().toISOString(),
            message: 'Service unavailable',
        });
    }
});

/**
 * @description Deep health check — exposes internal service status, memory, and
 * circuit-breaker state. Restricted to authenticated admins only (H-01).
 * @route GET /deep
 */
router.get('/deep', protect, admin, async (_req: Request, res: Response) => {
    try {
        logger.debug('Deep health check requested');

        const mongoConnected = mongoose.connection.readyState === 1;
        const redisConnected = await pingWithTimeout(500);

        checkAndAdvanceState();
        const circuitBreaker = getCircuitBreakerState();
        const uptime = process.uptime();
        const memoryUsage = process.memoryUsage();

        const redisOperational = redisConnected && circuitBreaker.state !== 'open';
        const allHealthy = mongoConnected && redisOperational;

        const healthStatus = {
            status: allHealthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            uptime: `${Math.floor(uptime / 60)} minutes`,
            services: {
                mongodb: mongoConnected,
                redis: redisConnected,
                circuitBreaker: {
                    state: circuitBreaker.state,
                    failures: circuitBreaker.failures,
                    nextRetry: circuitBreaker.nextRetry ? new Date(circuitBreaker.nextRetry).toISOString() : null,
                },
            },
            memory: {
                rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
                heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
                heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
            },
        };

        logger.info('Deep health check completed', {
            status: healthStatus.status,
            mongoConnected,
            redisConnected,
            redisOperational,
            circuitBreakerState: circuitBreaker.state,
        });

        res.status(allHealthy ? 200 : 503).json(healthStatus);
    } catch (error) {
        logger.error('Deep health check error', error as Error);
        res.status(503).json({
            status: 'unhealthy',
            message: 'Health check failed',
            timestamp: new Date().toISOString(),
        });
    }
});

/**
 * Sprint-3 contract handler — shared by both `/health/v1` and `/api/v1/health`.
 * Returns { status, uptime, timestamp, services: { mongo, redis } }.
 * Redis ping is bounded to 2 s so the endpoint degrades gracefully.
 * No authentication required — safe for external load-balancer probes.
 */
async function sprint3HealthHandler(_req: Request, res: Response): Promise<void> {
    try {
        logger.debug('v1 health check requested');

        const isMongoUp = mongoose.connection.readyState === 1;
        const isRedisUp = await pingWithTimeout(2_000);

        const allUp = isMongoUp && isRedisUp;

        const payload = {
            status: allUp ? 'ok' : 'degraded',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            services: {
                mongo: isMongoUp ? ('ok' as const) : ('down' as const),
                redis: isRedisUp ? ('ok' as const) : ('down' as const),
            },
        };

        // B-C2: reduce log volume — debug on success, warn on degraded
        if (payload.status === 'ok') {
            logger.debug('v1 health check completed', {
                status: payload.status,
                mongo: payload.services.mongo,
                redis: payload.services.redis,
            });
        } else {
            logger.warn('v1 health check completed', {
                status: payload.status,
                mongo: payload.services.mongo,
                redis: payload.services.redis,
            });
        }

        res.status(allUp ? 200 : 503).json(payload);
    } catch (error) {
        logger.error('v1 health check failed', {
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(503).json({
            status: 'error',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            services: { mongo: 'down', redis: 'down' },
        });
    }
}

/**
 * @description Versioned liveness + service health endpoint.
 * @route GET /v1
 */
router.get('/v1', sprint3HealthHandler);

/**
 * Dedicated sub-router for the `/api/v1/health` alias (B-C1).
 * Exposes ONLY the Sprint-3 contract at `/` so that mounting at
 * `/api/v1/health` routes correctly without colliding with the legacy `/health` handler.
 */
const healthV1Router = express.Router();
healthV1Router.get('/', sprint3HealthHandler);

export { healthV1Router };
export default router;

import express, { Request, Response } from 'express';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';
import { cacheService } from '../services/CacheService.js';
import { getCircuitBreakerState, checkAndAdvanceState, isRedisConfigured } from '../clients/redisClient.js';
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
 * @description Liveness check — reports whether the HTTP process is alive.
 * It intentionally does not gate on MongoDB/Redis; dependency readiness lives
 * under /health/ready and /health/v1.
 * @route GET /health
 */
router.get('/', (_req: Request, res: Response) => {
    logger.debug('Liveness check requested');
    res.status(200).json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});

/**
 * @description Readiness probe — indicates if the server is ready to accept traffic.
 * Gates on MongoDB, and on Redis only when Redis is configured. The Redis ping
 * is bounded to 500 ms so a hung Redis connection cannot block probes.
 * @route GET /ready
 */
router.get('/ready', async (_req: Request, res: Response) => {
    try {
        logger.debug('Readiness probe requested');

        const mongoConnected = mongoose.connection.readyState === 1;
        const redisConfigured = isRedisConfigured();
        const redisConnected = redisConfigured ? await pingWithTimeout(500) : false;
        const ready = mongoConnected && (!redisConfigured || redisConnected);

        if (ready) {
            logger.info('Readiness check passed');
            res.status(200).json({
                ready: true,
                mongo: mongoConnected,
                redis: redisConnected,
                redisConfigured,
                timestamp: new Date().toISOString(),
                message: 'Service is ready to accept requests',
            });
        } else {
            logger.warn('Readiness check failed', {
                mongoState: mongoose.connection.readyState,
                redis: redisConnected,
                redisConfigured,
            });
            res.status(503).json({
                ready: false,
                mongo: mongoConnected,
                redis: redisConnected,
                redisConfigured,
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
        const redisConfigured = isRedisConfigured();
        const redisConnected = redisConfigured ? await pingWithTimeout(500) : false;

        checkAndAdvanceState();
        const circuitBreaker = getCircuitBreakerState();
        const uptime = process.uptime();
        const memoryUsage = process.memoryUsage();

        const redisOperational = redisConnected && circuitBreaker.state !== 'open';
        const allHealthy = mongoConnected && (!redisConfigured || redisOperational);

        const healthStatus = {
            status: allHealthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            uptime: `${Math.floor(uptime / 60)} minutes`,
            services: {
                mongodb: mongoConnected,
                redis: redisConnected,
                redisConfigured,
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
            redisConfigured,
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
 * Redis ping is bounded to 2 s when Redis is configured. If Redis is not
 * configured, Redis is reported as disabled and does not degrade readiness.
 * No authentication required — safe for external load-balancer probes.
 */
async function sprint3HealthHandler(_req: Request, res: Response): Promise<void> {
    try {
        logger.debug('v1 health check requested');

        const isMongoUp = mongoose.connection.readyState === 1;
        const redisConfigured = isRedisConfigured();
        const isRedisUp = redisConfigured ? await pingWithTimeout(2_000) : false;

        const allUp = isMongoUp && (!redisConfigured || isRedisUp);

        const payload = {
            status: allUp ? 'ok' : 'degraded',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            services: {
                mongo: isMongoUp ? ('ok' as const) : ('down' as const),
                redis: redisConfigured ? (isRedisUp ? ('ok' as const) : ('down' as const)) : ('disabled' as const),
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

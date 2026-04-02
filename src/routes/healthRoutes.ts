import express, { Request, Response } from 'express';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';
import { cacheService } from '../services/CacheService.js';

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
        // Bounded ping: resolves false after 500 ms so a stalled Redis connection
        // cannot hold the probe open past the Kubernetes failureThreshold window.
        const redisPingWithTimeout = (): Promise<boolean> =>
            Promise.race([cacheService.ping(), new Promise<boolean>(resolve => setTimeout(() => resolve(false), 500))]);

        const redisConnected = await redisPingWithTimeout();
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
 * @description Deep health check
 * @route GET /deep
 */
router.get('/deep', async (_req: Request, res: Response) => {
    try {
        logger.debug('Deep health check requested');

        const mongoConnected = mongoose.connection.readyState === 1;
        const uptime = process.uptime();
        const memoryUsage = process.memoryUsage();

        const healthStatus = {
            status: mongoConnected ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            uptime: `${Math.floor(uptime / 60)} minutes`,
            services: {
                mongodb: mongoConnected,
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
        });

        res.status(mongoConnected ? 200 : 503).json(healthStatus);
    } catch (error) {
        logger.error('Deep health check error', error as Error);
        res.status(503).json({
            status: 'unhealthy',
            message: 'Health check failed',
            timestamp: new Date().toISOString(),
        });
    }
});

export default router;

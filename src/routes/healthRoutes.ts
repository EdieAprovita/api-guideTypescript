import express, { Request, Response } from 'express';
import logger from '../utils/logger';
import mongoose from 'mongoose';

const router = express.Router();

/**
 * @description Liveness probe - indicates if the server is alive
 * @route GET /health
 */
router.get('/', (_req: Request, res: Response) => {
    logger.debug('Liveness probe requested');

    res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
    });
});

/**
 * @description Readiness probe - indicates if the server is ready to accept requests
 * @route GET /ready
 */
router.get('/ready', async (_req: Request, res: Response) => {
    try {
        logger.debug('Readiness probe requested');

        // Verificar MongoDB
        const mongoConnected = mongoose.connection.readyState === 1;

        if (mongoConnected) {
            logger.info('Readiness check passed - MongoDB connected');
            res.status(200).json({
                ready: true,
                mongodb: mongoConnected,
                timestamp: new Date().toISOString(),
                message: 'Service is ready to accept requests',
            });
        } else {
            logger.warn('Readiness check failed - MongoDB not connected', {
                mongoState: mongoose.connection.readyState,
            });
            res.status(503).json({
                ready: false,
                mongodb: mongoConnected,
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

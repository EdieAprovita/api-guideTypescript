import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import { cacheService } from '../services/CacheService.js';
import { cacheMonitor } from '../scripts/cacheMonitor.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Get cache statistics
router.get('/stats', protect, admin, async (_req, res) => {
    try {
        const stats = await cacheService.getStats();
        const performance = await cacheMonitor.getCurrentPerformance();

        res.json({
            success: true,
            data: {
                stats,
                performance,
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        logger.error('Error getting cache stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get cache statistics',
        });
    }
});

// Flush all cache
router.delete('/flush', protect, admin, async (_req, res) => {
    try {
        await cacheService.flush();
        logger.info('Cache flushed by admin');

        res.json({
            success: true,
            message: 'Cache flushed successfully',
        });
    } catch (error) {
        logger.error('Error flushing cache:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to flush cache',
        });
    }
});

// Invalidate cache by pattern
router.delete('/invalidate/:pattern(*)', protect, admin, async (req, res) => {
    try {
        const { pattern } = req.params;

        if (!pattern) {
            return res.status(400).json({
                success: false,
                error: 'Pattern parameter is required',
            });
        }

        await cacheService.invalidatePattern(pattern);

        logger.info(`Cache pattern invalidated: ${pattern}`);

        return res.json({
            success: true,
            message: `Cache pattern '${pattern}' invalidated successfully`,
        });
    } catch (error) {
        logger.error('Error invalidating cache pattern:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to invalidate cache pattern',
        });
    }
});

// Invalidate cache by tag
router.delete('/invalidate-tag/:tag', protect, admin, async (req, res) => {
    try {
        const { tag } = req.params;

        if (!tag) {
            return res.status(400).json({
                success: false,
                error: 'Tag parameter is required',
            });
        }

        await cacheService.invalidateByTag(tag);

        logger.info(`Cache tag invalidated: ${tag}`);

        return res.json({
            success: true,
            message: `Cache tag '${tag}' invalidated successfully`,
        });
    } catch (error) {
        logger.error('Error invalidating cache tag:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to invalidate cache tag',
        });
    }
});

// Get cache health status
router.get('/health', async (_req, res) => {
    try {
        const stats = await cacheService.getStats();
        const isHealthy = stats.hitRatio > 0.1; // Consider healthy if hit ratio > 10%

        res.json({
            success: true,
            data: {
                status: isHealthy ? 'healthy' : 'unhealthy',
                hitRatio: stats.hitRatio,
                totalRequests: stats.totalRequests,
                cacheSize: stats.cacheSize,
                memoryUsage: stats.memoryUsage,
                uptime: stats.uptime,
            },
        });
    } catch (error) {
        logger.error('Error getting cache health:', error);
        res.status(500).json({
            success: false,
            data: {
                status: 'unhealthy',
                error: 'Failed to get cache health status',
            },
        });
    }
});

// Start/stop cache monitoring
router.post('/monitor/:action', protect, admin, async (req, res) => {
    try {
        const { action } = req.params;
        const { interval } = req.body;

        if (action === 'start') {
            cacheMonitor.startMonitoring(interval || 5);
            res.json({
                success: true,
                message: 'Cache monitoring started',
            });
        } else if (action === 'stop') {
            cacheMonitor.stopMonitoring();
            res.json({
                success: true,
                message: 'Cache monitoring stopped',
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Invalid action. Use "start" or "stop"',
            });
        }
    } catch (error) {
        logger.error('Error managing cache monitoring:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to manage cache monitoring',
        });
    }
});

export default router;

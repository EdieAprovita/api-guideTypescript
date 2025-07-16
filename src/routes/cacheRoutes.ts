import { Router } from 'express';
import { cacheStatsMiddleware, cacheFlushMiddleware } from '../middleware/cache';
import { cacheService } from '../services/CacheService';
import { cacheWarmingService } from '../services/CacheWarmingService';
import { cacheAlertService } from '../services/CacheAlertService';
import { Request, Response } from 'express';
import logger from '../utils/logger';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     CacheStats:
 *       type: object
 *       properties:
 *         hitRatio:
 *           type: string
 *           description: Porcentaje de cache hits
 *           example: "85.2%"
 *         totalRequests:
 *           type: number
 *           description: Total de requests procesadas
 *           example: 1250
 *         cacheSize:
 *           type: number
 *           description: Número de claves en cache
 *           example: 47
 *         memoryUsage:
 *           type: string
 *           description: Uso de memoria Redis
 *           example: "2.5M"
 *         uptime:
 *           type: number
 *           description: Tiempo de funcionamiento Redis
 *           example: 3600
 *         status:
 *           type: string
 *           enum: [excellent, good, fair, poor]
 *           description: Estado del rendimiento del cache
 */

/**
 * @swagger
 * /api/cache/stats:
 *   get:
 *     summary: Obtener estadísticas del cache
 *     tags: [Cache]
 *     responses:
 *       200:
 *         description: Estadísticas del cache obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CacheStats'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/stats', cacheStatsMiddleware());

/**
 * @swagger
 * /api/cache/health:
 *   get:
 *     summary: Verificar salud del cache
 *     tags: [Cache]
 *     responses:
 *       200:
 *         description: Cache funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   type: string
 *                   example: "operational"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 responseTime:
 *                   type: number
 *                   description: Tiempo de respuesta en ms
 *       503:
 *         description: Cache no disponible
 */
router.get('/health', async (_req: Request, res: Response) => {
    const start = Date.now();
    
    try {
        // Test básico de Redis
        const testKey = 'health:check';
        const testValue = { timestamp: new Date().toISOString() };
        
        await cacheService.set(testKey, testValue, 'test', { ttl: 10 });
        const retrieved = await cacheService.get(testKey);
        await cacheService.invalidate(testKey);
        
        const responseTime = Date.now() - start;
        
        if (retrieved) {
            res.json({
                success: true,
                status: 'operational',
                timestamp: new Date().toISOString(),
                responseTime,
                message: 'Cache is working correctly'
            });
        } else {
            throw new Error('Cache health check failed');
        }
        
    } catch (error) {
        logger.error('Cache health check failed:', error);
        res.status(503).json({
            success: false,
            status: 'error',
            timestamp: new Date().toISOString(),
            responseTime: Date.now() - start,
            error: 'Cache service unavailable'
        });
    }
});

/**
 * @swagger
 * /api/cache/invalidate/{pattern}:
 *   delete:
 *     summary: Invalidar cache por patrón
 *     tags: [Cache]
 *     parameters:
 *       - in: path
 *         name: pattern
 *         required: true
 *         schema:
 *           type: string
 *         description: Patrón de claves a invalidar (ej. "restaurants:*")
 *     responses:
 *       200:
 *         description: Cache invalidado exitosamente
 *       500:
 *         description: Error invalidando cache
 */
router.delete('/invalidate/:pattern', async (req: Request, res: Response) => {
    try {
        const { pattern } = req.params;
        
        if (!pattern || pattern.length < 2) {
            res.status(400).json({
                success: false,
                error: 'Pattern must be at least 2 characters long'
            });
            return;
        }
        
        await cacheService.invalidatePattern(pattern);
        
        res.json({
            success: true,
            message: `Cache invalidated for pattern: ${pattern}`,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Error invalidating cache pattern:', error);
        res.status(500).json({
            success: false,
            error: 'Error invalidating cache'
        });
    }
});

/**
 * @swagger
 * /api/cache/invalidate/tag/{tag}:
 *   delete:
 *     summary: Invalidar cache por tag
 *     tags: [Cache]
 *     parameters:
 *       - in: path
 *         name: tag
 *         required: true
 *         schema:
 *           type: string
 *         description: Tag para invalidar (ej. "restaurants", "geolocation")
 *     responses:
 *       200:
 *         description: Cache invalidado por tag exitosamente
 *       500:
 *         description: Error invalidando cache
 */
router.delete('/invalidate/tag/:tag', async (req: Request, res: Response) => {
    try {
        const { tag } = req.params;
        
        if (!tag || tag.length < 2) {
            res.status(400).json({
                success: false,
                error: 'Tag must be at least 2 characters long'
            });
            return;
        }
        
        await cacheService.invalidateByTag(tag);
        
        res.json({
            success: true,
            message: `Cache invalidated for tag: ${tag}`,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Error invalidating cache by tag:', error);
        res.status(500).json({
            success: false,
            error: 'Error invalidating cache'
        });
    }
});

/**
 * @swagger
 * /api/cache/warm:
 *   post:
 *     summary: Precalentar cache con datos críticos
 *     tags: [Cache]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dataType:
 *                 type: string
 *                 enum: [all, restaurants, businesses, users, categories, geo]
 *                 description: Tipo de datos a precalentar
 *               autoStart:
 *                 type: boolean
 *                 description: Iniciar precalentamiento automático
 *               intervalMinutes:
 *                 type: number
 *                 description: Intervalo en minutos para auto-warming
 *     responses:
 *       200:
 *         description: Cache precalentado exitosamente
 *       500:
 *         description: Error precalentando cache
 */
router.post('/warm', async (req: Request, res: Response) => {
    try {
        const { dataType = 'all', autoStart = false, intervalMinutes = 30 } = req.body;
        
        let result;
        
        if (dataType === 'all') {
            result = await cacheWarmingService.warmUpCriticalData();
        } else {
            const itemsWarmed = await cacheWarmingService.warmSpecificData(dataType);
            result = {
                success: true,
                duration: 0,
                itemsWarmed,
                errors: []
            };
        }
        
        // Iniciar auto-warming si se solicita
        if (autoStart) {
            await cacheWarmingService.startAutoWarming(intervalMinutes);
        }
        
        res.json({
            success: result.success,
            message: result.success ? 'Cache warmed up successfully' : 'Cache warming completed with errors',
            dataType,
            itemsWarmed: result.itemsWarmed,
            duration: `${result.duration}ms`,
            errors: result.errors,
            autoWarmingStarted: autoStart,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Error warming up cache:', error);
        res.status(500).json({
            success: false,
            error: 'Error warming up cache',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * @swagger
 * /api/cache/warming/status:
 *   get:
 *     summary: Obtener estado del cache warming
 *     tags: [Cache]
 *     responses:
 *       200:
 *         description: Estado del warming obtenido exitosamente
 */
router.get('/warming/status', async (_req: Request, res: Response) => {
    try {
        const stats = cacheWarmingService.getWarmingStats();
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Error getting warming status:', error);
        res.status(500).json({
            success: false,
            error: 'Error getting warming status'
        });
    }
});

/**
 * @swagger
 * /api/cache/warming/stop:
 *   post:
 *     summary: Detener auto-warming
 *     tags: [Cache]
 *     responses:
 *       200:
 *         description: Auto-warming detenido exitosamente
 */
router.post('/warming/stop', async (_req: Request, res: Response) => {
    try {
        cacheWarmingService.stopAutoWarming();
        res.json({
            success: true,
            message: 'Auto-warming stopped successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Error stopping auto-warming:', error);
        res.status(500).json({
            success: false,
            error: 'Error stopping auto-warming'
        });
    }
});

/**
 * @swagger
 * /api/cache/alerts:
 *   get:
 *     summary: Obtener alertas activas del cache
 *     tags: [Cache]
 *     responses:
 *       200:
 *         description: Alertas obtenidas exitosamente
 */
router.get('/alerts', async (_req: Request, res: Response) => {
    try {
        const activeAlerts = cacheAlertService.getActiveAlerts();
        const status = cacheAlertService.getMonitoringStatus();
        
        res.json({
            success: true,
            data: {
                alerts: activeAlerts,
                monitoring: status,
                totalActiveAlerts: activeAlerts.length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Error getting cache alerts:', error);
        res.status(500).json({
            success: false,
            error: 'Error getting cache alerts'
        });
    }
});

/**
 * @swagger
 * /api/cache/alerts/config:
 *   get:
 *     summary: Obtener configuración de alertas
 *     tags: [Cache]
 *   put:
 *     summary: Actualizar configuración de alertas
 *     tags: [Cache]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *               checkIntervalSeconds:
 *                 type: number
 *               thresholds:
 *                 type: object
 *                 properties:
 *                   minHitRatio:
 *                     type: number
 *                   maxMemoryUsage:
 *                     type: string
 *                   maxResponseTime:
 *                     type: number
 *                   minCacheSize:
 *                     type: number
 */
router.route('/alerts/config')
    .get(async (_req: Request, res: Response) => {
        try {
            const config = cacheAlertService.getConfig();
            res.json({
                success: true,
                data: config,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Error getting alert config:', error);
            res.status(500).json({
                success: false,
                error: 'Error getting alert config'
            });
        }
    })
    .put(async (req: Request, res: Response) => {
        try {
            const newConfig = req.body;
            cacheAlertService.updateConfig(newConfig);
            
            res.json({
                success: true,
                message: 'Alert configuration updated successfully',
                data: cacheAlertService.getConfig(),
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Error updating alert config:', error);
            res.status(500).json({
                success: false,
                error: 'Error updating alert config'
            });
        }
    });

/**
 * @swagger
 * /api/cache/alerts/start:
 *   post:
 *     summary: Iniciar monitoreo de alertas
 *     tags: [Cache]
 */
router.post('/alerts/start', async (_req: Request, res: Response) => {
    try {
        cacheAlertService.startMonitoring();
        res.json({
            success: true,
            message: 'Cache monitoring started successfully',
            status: cacheAlertService.getMonitoringStatus(),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Error starting cache monitoring:', error);
        res.status(500).json({
            success: false,
            error: 'Error starting cache monitoring'
        });
    }
});

/**
 * @swagger
 * /api/cache/alerts/stop:
 *   post:
 *     summary: Detener monitoreo de alertas
 *     tags: [Cache]
 */
router.post('/alerts/stop', async (_req: Request, res: Response) => {
    try {
        cacheAlertService.stopMonitoring();
        res.json({
            success: true,
            message: 'Cache monitoring stopped successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Error stopping cache monitoring:', error);
        res.status(500).json({
            success: false,
            error: 'Error stopping cache monitoring'
        });
    }
});

/**
 * @swagger
 * /api/cache/flush:
 *   delete:
 *     summary: Limpiar todo el cache (usar con precaución)
 *     tags: [Cache]
 *     responses:
 *       200:
 *         description: Cache limpiado exitosamente
 *       500:
 *         description: Error limpiando cache
 */
router.delete('/flush', cacheFlushMiddleware());

export default router;
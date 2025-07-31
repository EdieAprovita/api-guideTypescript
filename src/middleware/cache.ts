import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/CacheService';
import logger from '../utils/logger';

export interface CacheableRequest extends Request {
    cacheKey?: string;
    cacheType?: string;
    skipCache?: boolean;
}

export interface CacheableResponse extends Response {
    sendCached?: (data: unknown) => void;
}

interface CacheMiddlewareOptions {
    ttl?: number;
    tags?: string[];
    keyGenerator?: (req: Request) => string;
    sendCached?: (data: unknown) => void;
}

/**
 * Determinar estado del cache basado en hit ratio
 */
function getStatusFromHitRatio(hitRatio: number): string {
    if (hitRatio > 70) return 'excellent';
    if (hitRatio > 50) return 'good';
    if (hitRatio > 30) return 'fair';
    return 'poor';
}

/**
 * Serializar valor de forma segura para cache key
 */
function safeStringify(value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    if (Array.isArray(value)) {
        return value.map(safeStringify).join(',');
    }
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    return String(value);
}

/**
 * Generar clave de cache basada en la request
 */
function generateCacheKey(req: Request): string {
    const { method, originalUrl, query } = req;

    // Crear clave base - usar pathname en lugar de originalUrl para evitar duplicación
    const url = new URL(originalUrl, 'http://localhost');
    let key = `${method}:${url.pathname}`;

    // Agregar parámetros de query si existen
    if (Object.keys(query).length > 0) {
        const sortedQuery = Object.keys(query)
            .sort((a, b) => a.localeCompare(b))
            .map(k => `${k}=${safeStringify(query[k])}`)
            .join('&');
        key += `?${sortedQuery}`;
    }

    // Agregar parámetros de ruta solo si no están ya en la URL
    // Skip adding route parameters as they're already part of the URL
    // if (Object.keys(params).length > 0 && !originalUrl.includes(':')) {
    //     const sortedParams = Object.keys(params)
    //         .sort((a, b) => a.localeCompare(b))
    //         .map(k => `${k}=${safeStringify(params[k])}`)
    //         .join('&');
    //     key += `|${sortedParams}`;
    // }

    return key;
}

/**
 * Middleware de cache para endpoints GET
 * @param type - Tipo de contenido para configurar TTL
 * @param options - Opciones adicionales
 */
export function cacheMiddleware(
    type: string = 'default',
    options: {
        ttl?: number;
        tags?: string[];
        skipIf?: (req: Request) => boolean;
        keyGenerator?: (req: Request) => string;
    } = {}
) {
    return async (req: CacheableRequest, res: CacheableResponse, next: NextFunction) => {
        // Solo cachear GET requests por defecto
        if (req.method !== 'GET') {
            return next();
        }

        // Verificar si se debe saltar cache
        if (options.skipIf?.(req)) {
            req.skipCache = true;
            return next();
        }

        // Generar clave de cache
        const cacheKey = options.keyGenerator ? options.keyGenerator(req) : generateCacheKey(req);
        req.cacheKey = cacheKey;
        req.cacheType = type;

        try {
            // Intentar obtener del cache
            const cachedData = await cacheService.get(cacheKey);

            if (cachedData) {
                // Cache HIT - devolver datos cacheados
                logger.debug(`🎯 Cache HIT: ${cacheKey}`);
                // Parse cached data if it's a string, otherwise use as is
                let parsedData;
                try {
                    parsedData = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
                } catch (parseError) {
                    // If parsing fails, use the original data
                    parsedData = cachedData;
                }
                return res.status(200).json(parsedData);
            }

            // Cache MISS - continuar con el procesamiento normal
            logger.debug(`❌ Cache MISS: ${cacheKey}`);

            // Interceptar el método json() para cachear la respuesta
            const originalJson = res.json;
            res.json = function (data: unknown) {
                // Store in cache only for successful responses
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    const cacheOptions: CacheMiddlewareOptions = {};
                    if (options.ttl !== undefined) cacheOptions.ttl = options.ttl;
                    if (options.tags !== undefined) cacheOptions.tags = options.tags;
                    cacheService.set(cacheKey, data, type, cacheOptions).catch(error => {
                        logger.error(`Error caching response for ${cacheKey}:`, error);
                    });
                }

                // Llamar al método original
                return originalJson.call(this, data);
            };

            next();
        } catch (error) {
            logger.error(`Cache middleware error for ${cacheKey}:`, error);
            // En caso de error del cache, continuar sin cache
            next();
        }
    };
}

/**
 * Middleware específico para endpoints de geolocalización
 */
export function geoLocationCacheMiddleware(radiusKm: number = 5) {
    return cacheMiddleware('geolocation', {
        ttl: 1800, // 30 minutos
        tags: ['geolocation', 'location'],
        keyGenerator: req => {
            const { lat, lng, radius = radiusKm } = req.query;
            return `geo:${safeStringify(lat)}:${safeStringify(lng)}:${safeStringify(radius)}`;
        },
        skipIf: req => {
            // Saltar cache si faltan coordenadas
            return !req.query.lat || !req.query.lng;
        },
    });
}

/**
 * Middleware específico para listados de restaurantes
 */
export function restaurantCacheMiddleware() {
    return cacheMiddleware('restaurants', {
        ttl: 300, // 5 minutos
        tags: ['restaurants', 'listings'],
        keyGenerator: req => {
            const { category, city, rating, price } = req.query;
            const filters = [category, city, rating, price].filter(Boolean).map(safeStringify).join(':');
            return `restaurants:${req.path}:${filters}`;
        },
    });
}

/**
 * Middleware específico para perfiles de usuario
 */
export function userProfileCacheMiddleware() {
    return cacheMiddleware('users', {
        ttl: 900, // 15 minutos
        tags: ['users', 'profiles'],
        keyGenerator: req => {
            const userId = req.params.id ?? req.user?._id;
            return `user:profile:${safeStringify(userId)}`;
        },
        skipIf: req => {
            // Saltar cache si no hay ID de usuario
            return !req.params.id && !req.user?._id;
        },
    });
}

/**
 * Middleware específico para búsquedas
 */
export function searchCacheMiddleware() {
    return cacheMiddleware('search', {
        ttl: 600, // 10 minutos
        tags: ['search'],
        keyGenerator: req => {
            const { q, type, limit = 10, offset = 0 } = req.query;
            return `search:${safeStringify(q)}:${safeStringify(type)}:${safeStringify(limit)}:${safeStringify(offset)}`;
        },
        skipIf: req => {
            // Saltar cache si no hay query
            return !req.query.q || (req.query.q as string).length < 2;
        },
    });
}

/**
 * Middleware para invalidar cache en operaciones de escritura
 */
export function cacheInvalidationMiddleware(tags: string[]) {
    return async (_req: Request, res: Response, next: NextFunction) => {
        // Interceptar respuestas exitosas de escritura
        const originalJson = res.json;
        res.json = function (data: unknown) {
            // Solo invalidar en operaciones exitosas
            if (res.statusCode >= 200 && res.statusCode < 300) {
                // Invalidar de forma asíncrona
                Promise.all(tags.map(tag => cacheService.invalidateByTag(tag))).catch(error => {
                    logger.error('Error invalidating cache tags:', error);
                });
            }

            return originalJson.call(this, data);
        };

        next();
    };
}

/**
 * Middleware para obtener estadísticas del cache
 */
export function cacheStatsMiddleware() {
    return async (_req: Request, res: Response, _next: NextFunction) => {
        try {
            const stats = await cacheService.getStats();
            res.json({
                success: true,
                data: {
                    ...stats,
                    hitRatio: `${stats.hitRatio}%`,
                    status: getStatusFromHitRatio(stats.hitRatio),
                },
            });
        } catch (error) {
            logger.error('Error getting cache stats:', error);
            res.status(500).json({
                success: false,
                error: 'Error retrieving cache statistics',
            });
        }
    };
}

/**
 * Middleware para limpiar cache (usar con cuidado)
 */
export function cacheFlushMiddleware() {
    return async (_req: Request, res: Response, _next: NextFunction) => {
        try {
            await cacheService.flush();
            res.json({
                success: true,
                message: 'Cache flushed successfully',
            });
        } catch (error) {
            logger.error('Error flushing cache:', error);
            res.status(500).json({
                success: false,
                error: 'Error flushing cache',
            });
        }
    };
}

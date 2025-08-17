import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/CacheService';
import logger from '../utils/logger';
import crypto from 'crypto';

export interface CacheableRequest extends Request {
    cacheKey?: string;
    cacheType?: string;
    skipCache?: boolean;
}

export interface CacheableResponse extends Response {
    sendCached?: (data: unknown) => void;
    checkCache?: (data: unknown, lastModified?: Date) => Response;
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
    const { method, path, query } = req as unknown as Request & { path: string };

    // Crear clave base
    let key = `${method}:${path}`;

    // Agregar parámetros de query si existen
    if (Object.keys(query).length > 0) {
        const sortedQuery = Object.keys(query)
            .sort((a, b) => a.localeCompare(b))
            .map(k => `${k}=${safeStringify(query[k])}`)
            .join('&');
        key += `?${sortedQuery}`;
    }

    // No incluir parámetros de ruta en la clave (los tests esperan solo path y query ordenada)

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
            let cachedData = await cacheService.get(cacheKey);

            // If cached data is a string, try to parse JSON. If parsing fails, treat as cache miss
            if (typeof cachedData === 'string') {
                try {
                    cachedData = JSON.parse(cachedData);
                } catch {
                    cachedData = null as any;
                }
            }

            if (cachedData) {
                // Cache HIT - verificar headers de validación
                logger.debug(`🎯 Cache HIT: ${cacheKey}`);

                // Generar ETag basado en los datos cacheados
                const etag = generateETag(cachedData);
                res.setHeader('ETag', etag);

                // Agregar headers de caché para mejorar el rendimiento
                const ttl = options.ttl || 300; // 5 minutos por defecto
                res.setHeader('Cache-Control', `public, max-age=${ttl}`);
                res.setHeader('Last-Modified', new Date().toUTCString());

                // Verificar si el cliente tiene la misma versión
                const ifNoneMatch = req.headers['if-none-match'];
                if (ifNoneMatch === etag || ifNoneMatch === `"${etag}"`) {
                    // El cliente ya tiene la versión más reciente
                    logger.debug(`📋 Returning 304 for ${cacheKey}`);
                    return res.status(304).end();
                }

                // El cliente necesita la versión actualizada
                logger.debug(`📤 Returning 200 with cached data for ${cacheKey}`);
                return res.status(200).json(cachedData);
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

                    // Generar ETag para los nuevos datos
                    const etag = generateETag(data);
                    res.setHeader('ETag', etag);

                    // Agregar headers de caché para nuevos datos
                    const ttl = options.ttl || 300;
                    res.setHeader('Cache-Control', `public, max-age=${ttl}`);
                    res.setHeader('Last-Modified', new Date().toUTCString());

                    // Intentionally fire-and-forget cache write
                    void cacheService.set(cacheKey, data, type, cacheOptions);
                }

                // Llamar al método original
                return originalJson.call(this, data);
            };

            next();
        } catch (error) {
            logger.error(`Cache middleware error for ${cacheKey}:`, error);
            // En caso de error del cache, continuar sin cache
            // Error is intentionally caught to prevent cache failures from breaking the application
            next();
        }
    };
}

/**
 * Genera un ETag basado en el contenido de los datos
 */
function generateETag(data: unknown): string {
    const dataString = JSON.stringify(data);
    return crypto.createHash('md5').update(dataString).digest('hex');
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
 * Middleware específico para listados de negocios
 */
export function businessCacheMiddleware() {
    return cacheMiddleware('businesses', {
        ttl: 300, // 5 minutos
        tags: ['businesses', 'listings'],
        keyGenerator: req => {
            const { category, city, rating, type } = req.query;
            const filters = [category, city, rating, type].filter(Boolean).map(safeStringify).join(':');
            return `businesses:${req.path}:${filters}`;
        },
    });
}

/**
 * Middleware específico para listados de recetas
 */
export function recipeCacheMiddleware() {
    return cacheMiddleware('recipes', {
        ttl: 600, // 10 minutos (las recetas cambian menos frecuentemente)
        tags: ['recipes', 'content'],
        keyGenerator: req => {
            const { category, difficulty, cookingTime, ingredients } = req.query;
            const filters = [category, difficulty, cookingTime, ingredients]
                .filter(Boolean)
                .map(safeStringify)
                .join(':');
            return `recipes:${req.path}:${filters}`;
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
 * Middleware para invalidar caché cuando se modifican datos
 * Se debe usar en rutas POST, PUT, DELETE
 */
export function cacheInvalidationMiddleware(tags: string[]) {
    return async (_req: Request, res: Response, next: NextFunction) => {
        // Guardar el método original
        const originalJson = res.json;

        res.json = function (data: unknown) {
            // Si la operación fue exitosa, invalidar caché de forma asíncrona
            if (res.statusCode >= 200 && res.statusCode < 300) {
                logger.debug(`🗑️ Invalidating cache for tags: ${tags.join(', ')}`);

                // Invalidar por tags y patrones de forma asíncrona (fire-and-forget)
                void Promise.all([
                    ...tags.map(tag => cacheService.invalidateByTag(tag)),
                    cacheService.invalidatePattern('restaurants:*'),
                    cacheService.invalidatePattern('businesses:*'),
                    cacheService.invalidatePattern('recipes:*'),
                    cacheService.invalidatePattern('users:*'),
                    cacheService.invalidatePattern('reviews:*'),
                ]).catch(error => {
                    logger.error('Error invalidating cache:', error);
                });
            }

            // Llamar al método original
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

/**
 * Middleware para validación de caché del navegador
 * Maneja headers If-None-Match e If-Modified-Since
 */
export function browserCacheValidation() {
    return (req: Request, res: CacheableResponse, next: NextFunction) => {
        // Solo para GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Verificar si el cliente tiene datos en caché
        const ifNoneMatch = req.headers['if-none-match'];
        const ifModifiedSince = req.headers['if-modified-since'];

        if (!ifNoneMatch && !ifModifiedSince) {
            // No hay headers de validación, continuar normalmente
            return next();
        }

        // Agregar método para verificar si los datos han cambiado
        res.checkCache = (data: unknown, lastModified?: Date) => {
            const etag = generateETag(data);
            res.setHeader('ETag', etag);

            if (lastModified) {
                res.setHeader('Last-Modified', lastModified.toUTCString());
            }

            // Verificar ETag
            if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === `"${etag}"`)) {
                logger.debug(`📋 Browser cache valid - returning 304`);
                return res.status(304).end();
            }

            // Verificar Last-Modified
            if (ifModifiedSince && lastModified) {
                const clientDate = new Date(ifModifiedSince);
                if (lastModified <= clientDate) {
                    logger.debug(`📋 Browser cache valid (Last-Modified) - returning 304`);
                    return res.status(304).end();
                }
            }

            // Los datos han cambiado, devolver 200
            return res.status(200).json(data);
        };

        next();
    };
}

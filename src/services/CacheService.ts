import type { Redis as RedisType } from 'ioredis';
import logger from '../utils/logger.js';
import { executeIfCircuitClosed, getRedisClient } from '../clients/redisClient.js';

export interface CacheStats {
    hitRatio: number;
    totalRequests: number;
    cacheSize: number;
    memoryUsage: string;
    uptime: number;
}

export interface CacheOptions {
    ttl?: number;
    tags?: string[];
}

/**
 * CacheService - Servicio de cache inteligente con Redis
 *
 * Características:
 * - TTL específico por tipo de dato
 * - Sistema de tags para invalidación masiva
 * - Métricas de rendimiento
 * - Conexión resiliente a Redis
 */
export class CacheService {
    private redis!: RedisType;
    private hits = 0;
    private misses = 0;

    // TTL por tipo de contenido (en segundos)
    private readonly ttlConfig: Record<string, number> = {
        restaurants: 300, // 5 min - datos que cambian poco
        businesses: 600, // 10 min - datos relativamente estáticos
        geolocation: 1800, // 30 min - consultas costosas de geo
        users: 900, // 15 min - perfiles de usuario
        reviews: 180, // 3 min - contenido dinámico
        categories: 3600, // 1 hora - datos muy estáticos
        search: 600, // 10 min - resultados de búsqueda
    };

    constructor() {
        this.redis = getRedisClient();
    }

    private async executeRedis<T>(operationName: string, operation: () => Promise<T>, fallback: T): Promise<T> {
        try {
            const result = await executeIfCircuitClosed(operation);
            if (result === null) {
                logger.warn(`Cache ${operationName} skipped because Redis circuit breaker is open`);
                return fallback;
            }
            return result;
        } catch (error) {
            logger.error(`Cache ${operationName} error`, error as Error);
            return fallback;
        }
    }

    /**
     * Obtener valor del cache
     * @param key - Clave del cache
     * @returns Valor parseado o null si no existe
     */
    async get<T>(key: string): Promise<T | null> {
        const start = Date.now();
        const value = await this.executeRedis(`GET ${key}`, () => this.redis.get(key), null);
        const duration = Date.now() - start;

        if (value) {
            this.hits++;
            logger.debug(`🎯 Cache HIT: ${key} (${duration}ms)`);
            return JSON.parse(value) as T;
        } else {
            this.misses++;
            logger.debug(`❌ Cache MISS: ${key} (${duration}ms)`);
            return null;
        }
    }

    /**
     * Establecer valor en cache
     * @param key - Clave del cache
     * @param value - Valor a cachear
     * @param type - Tipo de contenido para TTL
     * @param options - Opciones adicionales
     */
    async set<T>(key: string, value: T, type: string = 'default', options: CacheOptions = {}): Promise<void> {
        const start = Date.now();
        const ttl = options.ttl || this.ttlConfig[type] || 300; // 5 min default
        const serializedValue = JSON.stringify(value);

        const writeOk = await this.executeRedis(`SET ${key}`, () => this.redis.setex(key, ttl, serializedValue), false as boolean | string);
        if (!writeOk) {
            return;
        }

        if (options.tags) {
            await this.associateTags(key, options.tags);
        }

        const duration = Date.now() - start;
        logger.debug(`💾 Cache SET: ${key} (TTL: ${ttl}s, ${duration}ms)`);
    }

    /**
     * Establecer valor con tags para invalidación masiva
     * @param key - Clave del cache
     * @param value - Valor a cachear
     * @param tags - Tags para agrupar claves
     * @param ttl - Tiempo de vida opcional
     */
    async setWithTags<T>(key: string, value: T, tags: string[], ttl?: number): Promise<void> {
        const options: CacheOptions = { tags };
        if (ttl !== undefined) {
            options.ttl = ttl;
        }
        await this.set(key, value, 'default', options);
    }

    /**
     * Invalidar cache por clave específica
     * @param key - Clave a invalidar
     */
    async invalidate(key: string): Promise<void> {
        const reverseKey = `keytags:${key}`;
        const associatedTags = await this.executeRedis(`SMEMBERS ${reverseKey}`, () => this.redis.smembers(reverseKey), [] as string[]);
        const invalidated = await this.executeRedis(`INVALIDATE ${key}`, async () => {
            const pipeline = this.redis.pipeline();

            for (const tag of associatedTags) {
                pipeline.srem(`tag:${tag}`, key);
            }

            pipeline.del(reverseKey);
            pipeline.del(key);

            await pipeline.exec();
            return true;
        }, false);

        if (invalidated) {
            logger.debug(`Cache INVALIDATED: ${key}`);
        }
    }

    /**
     * Invalidar múltiples claves por patrón
     * @param pattern - Patrón de claves (ej: "restaurants:*")
     */
    async invalidatePattern(pattern: string): Promise<void> {
        try {
            const keys: string[] = [];
            let cursor = '0';
            do {
                const [nextCursor, batchKeys] = await this.executeRedis(
                    `SCAN ${pattern}`,
                    () => this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100),
                    ['0', []] as [string, string[]]
                );
                cursor = nextCursor;
                keys.push(...batchKeys);
            } while (cursor !== '0');

            if (keys.length > 0) {
                // Fetch the reverse index for each matched key to clean up tag sets
                const keyTagSets = await Promise.all(
                    keys.map(key => this.executeRedis(`SMEMBERS keytags:${key}`, () => this.redis.smembers(`keytags:${key}`), [] as string[]))
                );

                const invalidated = await this.executeRedis(`INVALIDATE PATTERN ${pattern}`, async () => {
                    const pipeline = this.redis.pipeline();

                    keys.forEach((key, i) => {
                        pipeline.del(key);
                        pipeline.del(`keytags:${key}`);
                        (keyTagSets[i] ?? []).forEach(tag => {
                            pipeline.srem(`tag:${tag}`, key);
                        });
                    });

                    await pipeline.exec();
                    return true;
                }, false);

                if (invalidated) {
                    logger.info(`🧹 Cache PATTERN INVALIDATED: ${pattern} (${keys.length} keys)`);
                }
            }
        } catch (error) {
            logger.error(`Cache PATTERN INVALIDATE error for pattern ${pattern}:`, error);
        }
    }

    /**
     * Invalidar cache por tag
     * @param tag - Tag para invalidar todas las claves asociadas
     */
    async invalidateByTag(tag: string): Promise<void> {
        const tagSetKey = `tag:${tag}`;
        const members = await this.executeRedis(`SMEMBERS ${tagSetKey}`, () => this.redis.smembers(tagSetKey), [] as string[]);

        if (members.length === 0) {
            return;
        }

        const memberTagSets = await Promise.all(
            members.map(member => this.executeRedis(`SMEMBERS keytags:${member}`, () => this.redis.smembers(`keytags:${member}`), [] as string[]))
        );

        const invalidated = await this.executeRedis(`INVALIDATE TAG ${tag}`, async () => {
            const pipeline = this.redis.pipeline();

            members.forEach((member, i) => {
                pipeline.del(member);
                pipeline.del(`keytags:${member}`);
                (memberTagSets[i] ?? []).forEach(otherTag => {
                    if (otherTag !== tag) {
                        pipeline.srem(`tag:${otherTag}`, member);
                    }
                });
            });

            pipeline.del(tagSetKey);
            await pipeline.exec();
            return true;
        }, false);

        if (invalidated) {
            logger.info(`Cache TAG INVALIDATED: ${tag} (${members.length} keys)`);
        }
    }

    /**
     * Obtener estadísticas del cache
     */
    async getStats(): Promise<CacheStats> {
        try {
            const info = await this.executeRedis('INFO memory', () => this.redis.info('memory'), '');
            const totalRequests = this.hits + this.misses;
            const hitRatio = totalRequests > 0 ? this.hits / totalRequests : 0;

            // Extraer uso de memoria del INFO
            const memMatch = RegExp(/used_memory_human:(.+)/).exec(info);
            const memoryUsage = memMatch?.[1]?.trim() || 'Unknown';

            const uptimeMatch = RegExp(/uptime_in_seconds:(\d+)/).exec(info);
            const uptime = uptimeMatch?.[1] ? parseInt(uptimeMatch[1]) : 0;

            const dbSize = await this.executeRedis('DBSIZE', () => this.redis.dbsize(), 0);

            return {
                hitRatio: Number((hitRatio * 100).toFixed(2)),
                totalRequests,
                cacheSize: dbSize,
                memoryUsage,
                uptime,
            };
        } catch (error) {
            logger.error('Error getting cache stats:', error);
            return {
                hitRatio: 0,
                totalRequests: 0,
                cacheSize: 0,
                memoryUsage: 'Error',
                uptime: 0,
            };
        }
    }

    /**
     * Sends a PING command to Redis and returns `true` when the reply is PONG.
     * Returns `false` on any connection or command error, making it safe to use
     * as a non-throwing health check.
     */
    async ping(): Promise<boolean> {
        const result = await this.executeRedis('PING', () => this.redis.ping(), null);
        return result === 'PONG';
    }

    /**
     * Flush only cache-owned keys, preserving security-critical keys
     * (token blacklist, refresh tokens, user revocation markers).
     *
     * Uses SCAN iterator to avoid blocking Redis on large key sets,
     * and deletes in pipelined batches for efficiency.
     */
    async flush(): Promise<void> {
        // Prefixes managed by TokenService — must NEVER be deleted by a cache flush.
        const protectedPrefixes = ['blacklist:', 'user_tokens:', 'refresh_token:', 'tag:', 'keytags:'];

        try {
            let cursor = '0';
            let deletedCount = 0;

            do {
                const [nextCursor, keys] = await this.executeRedis(
                    'SCAN *',
                    () => this.redis.scan(cursor, 'MATCH', '*', 'COUNT', 200),
                    ['0', []] as [string, string[]]
                );
                cursor = nextCursor;

                const keysToDelete = keys.filter(key => !protectedPrefixes.some(prefix => key.startsWith(prefix)));

                if (keysToDelete.length > 0) {
                    const deleted = await this.executeRedis('FLUSH CACHE KEYS', async () => {
                        const pipeline = this.redis.pipeline();
                        for (const key of keysToDelete) {
                            pipeline.del(key);
                        }
                        await pipeline.exec();
                        return true;
                    }, false);
                    if (deleted) {
                        deletedCount += keysToDelete.length;
                    }
                }
            } while (cursor !== '0');

            this.hits = 0;
            this.misses = 0;
            logger.warn(`Cache FLUSHED (scoped): removed ${deletedCount} cache keys, token/blacklist keys preserved`);
        } catch (error) {
            logger.error('Cache FLUSH error:', error);
        }
    }

    /**
     * Verificar si una clave existe
     * @param key - Clave a verificar
     */
    async exists(key: string): Promise<boolean> {
        const result = await this.executeRedis(`EXISTS ${key}`, () => this.redis.exists(key), 0);
        return result === 1;
    }

    /**
     * Establecer TTL para una clave existente
     * @param key - Clave
     * @param ttl - Tiempo de vida en segundos
     */
    async expire(key: string, ttl: number): Promise<void> {
        try {
            const updated = await this.executeRedis(`EXPIRE ${key}`, () => this.redis.expire(key, ttl), 0);
            if (updated !== 1) {
                return;
            }
            logger.debug(`⏰ Cache TTL updated: ${key} (${ttl}s)`);
        } catch (error) {
            logger.error(`Cache EXPIRE error for key ${key}:`, error);
        }
    }

    /**
     * Asociar tags con una clave para invalidación masiva (Redis-backed).
     *
     * Forward index:  tag:{tagName}  → SET of cache keys
     * Reverse index:  keytags:{key}  → SET of tag names
     * @private
     */
    private async associateTags(key: string, tags: string[]): Promise<void> {
        if (tags.length === 0) return;

        try {
            await this.executeRedis(`ASSOCIATE TAGS ${key}`, async () => {
                const pipeline = this.redis.pipeline();

                for (const tag of tags) {
                    pipeline.sadd(`tag:${tag}`, key);
                }

                pipeline.sadd(`keytags:${key}`, ...tags);

                await pipeline.exec();
                return true;
            }, false);
        } catch (error) {
            logger.warn(`Cache ASSOCIATE TAGS warning for key ${key}:`, error);
        }
    }

    /**
     * Generar clave de cache consistente
     * @param parts - Partes de la clave
     */
    static generateKey(...parts: (string | number)[]): string {
        return parts.map(part => String(part)).join(':');
    }

    /**
     * Cerrar conexión Redis (para testing y shutdown)
     */
    async disconnect(): Promise<void> {
        try {
            await this.redis.quit();
            logger.info('👋 Redis connection closed gracefully');
        } catch (error) {
            logger.error('Error closing Redis connection:', error);
        }
    }
}

// Singleton instance
export const cacheService = new CacheService();

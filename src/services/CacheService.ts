import RedisLib from 'ioredis';
import type { Redis as RedisType } from 'ioredis';
const Redis = RedisLib.default || RedisLib;
import logger from '../utils/logger.js';

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
        this.initializeRedis();
    }

    /**
     * Inicializar conexión Redis con configuración resiliente
     */
    private initializeRedis(): void {
        interface RedisConfig {
            host: string;
            port: number;
            db: number;
            retryDelayOnFailover: number;
            maxRetriesPerRequest: number;
            lazyConnect: boolean;
            keepAlive: number;
            connectTimeout: number;
            commandTimeout: number;
            password?: string;
        }

        const redisConfig: RedisConfig = {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            db: 0,
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
            lazyConnect: true,
            keepAlive: 30000,
            // Configuración de timeouts
            connectTimeout: 10000,
            commandTimeout: 5000,
        };

        // Solo agregar password si está definida
        if (process.env.REDIS_PASSWORD) {
            redisConfig.password = process.env.REDIS_PASSWORD;
        }

        this.redis = new Redis(redisConfig);

        // Event listeners para monitoreo
        this.redis.on('connect', () => {
            logger.info('✅ Redis connected successfully');
        });

        this.redis.on('ready', () => {
            logger.info('🚀 Redis ready to accept commands');
        });

        this.redis.on('error', (error: Error) => {
            logger.error('❌ Redis connection error:', error);
        });

        this.redis.on('close', () => {
            logger.warn('⚠️ Redis connection closed');
        });
    }

    /**
     * Obtener valor del cache
     * @param key - Clave del cache
     * @returns Valor parseado o null si no existe
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            const start = Date.now();
            const value = await this.redis.get(key);
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
        } catch (error) {
            logger.error(`Cache GET error for key ${key}:`, error);
            this.misses++;
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
        try {
            const start = Date.now();
            const ttl = options.ttl || this.ttlConfig[type] || 300; // 5 min default
            const serializedValue = JSON.stringify(value);

            await this.redis.setex(key, ttl, serializedValue);

            // Manejar tags para invalidación
            if (options.tags) {
                await this.associateTags(key, options.tags);
            }

            const duration = Date.now() - start;
            logger.debug(`💾 Cache SET: ${key} (TTL: ${ttl}s, ${duration}ms)`);
        } catch (error) {
            logger.error(`Cache SET error for key ${key}:`, error);
        }
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
        try {
            const reverseKey = `keytags:${key}`;
            const associatedTags = await this.redis.smembers(reverseKey);

            const pipeline = this.redis.pipeline();

            // Remove this key from every tag SET that references it
            for (const tag of associatedTags) {
                pipeline.srem(`tag:${tag}`, key);
            }

            // Delete the reverse index entry and the cache key itself
            pipeline.del(reverseKey);
            pipeline.del(key);

            await pipeline.exec();

            logger.debug(`Cache INVALIDATED: ${key}`);
        } catch (error) {
            logger.warn(`Cache INVALIDATE warning for key ${key}:`, error);
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
                const [nextCursor, batchKeys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
                cursor = nextCursor;
                keys.push(...batchKeys);
            } while (cursor !== '0');
            if (keys.length > 0) {
                await this.redis.del(...keys);
                logger.info(`🧹 Cache PATTERN INVALIDATED: ${pattern} (${keys.length} keys)`);
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
        try {
            const tagSetKey = `tag:${tag}`;
            const members = await this.redis.smembers(tagSetKey);

            if (members.length === 0) {
                return;
            }

            const pipeline = this.redis.pipeline();

            // Delete every cache key that belongs to this tag
            for (const member of members) {
                pipeline.del(member);
                // Remove the reverse index entry for each deleted key
                pipeline.del(`keytags:${member}`);
            }

            // Delete the forward tag SET itself
            pipeline.del(tagSetKey);

            await pipeline.exec();

            logger.info(`Cache TAG INVALIDATED: ${tag} (${members.length} keys)`);
        } catch (error) {
            logger.warn(`Cache TAG INVALIDATE warning for tag ${tag}:`, error);
        }
    }

    /**
     * Obtener estadísticas del cache
     */
    async getStats(): Promise<CacheStats> {
        try {
            const info = await this.redis.info('memory');
            const totalRequests = this.hits + this.misses;
            const hitRatio = totalRequests > 0 ? this.hits / totalRequests : 0;

            // Extraer uso de memoria del INFO
            const memMatch = RegExp(/used_memory_human:(.+)/).exec(info);
            const memoryUsage = memMatch?.[1]?.trim() || 'Unknown';

            const uptimeMatch = RegExp(/uptime_in_seconds:(\d+)/).exec(info);
            const uptime = uptimeMatch?.[1] ? parseInt(uptimeMatch[1]) : 0;

            const dbSize = await this.redis.dbsize();

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

    async flush(): Promise<void> {
        try {
            await this.redis.flushdb();
            this.hits = 0;
            this.misses = 0;
            logger.warn('Cache FLUSHED completely');
        } catch (error) {
            logger.error('Cache FLUSH error:', error);
        }
    }

    /**
     * Verificar si una clave existe
     * @param key - Clave a verificar
     */
    async exists(key: string): Promise<boolean> {
        try {
            const result = await this.redis.exists(key);
            return result === 1;
        } catch (error) {
            logger.error(`Cache EXISTS error for key ${key}:`, error);
            return false;
        }
    }

    /**
     * Establecer TTL para una clave existente
     * @param key - Clave
     * @param ttl - Tiempo de vida en segundos
     */
    async expire(key: string, ttl: number): Promise<void> {
        try {
            await this.redis.expire(key, ttl);
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
            const pipeline = this.redis.pipeline();

            for (const tag of tags) {
                // Forward: tag → keys
                pipeline.sadd(`tag:${tag}`, key);
            }

            // Reverse: key → tags (spread so all tags are added in one SADD call)
            pipeline.sadd(`keytags:${key}`, ...tags);

            await pipeline.exec();
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

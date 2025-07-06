import Redis from 'ioredis';
import logger from '../utils/logger';

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
    private redis!: Redis;
    private hits = 0;
    private misses = 0;
    private tagMap: Map<string, Set<string>> = new Map();
    
    // TTL por tipo de contenido (en segundos)
    private readonly ttlConfig: Record<string, number> = {
        restaurants: 300,       // 5 min - datos que cambian poco
        businesses: 600,        // 10 min - datos relativamente estáticos
        geolocation: 1800,      // 30 min - consultas costosas de geo
        users: 900,             // 15 min - perfiles de usuario
        reviews: 180,           // 3 min - contenido dinámico
        categories: 3600,       // 1 hora - datos muy estáticos
        search: 600             // 10 min - resultados de búsqueda
    };

    constructor() {
        this.initializeRedis();
    }

    /**
     * Inicializar conexión Redis con configuración resiliente
     */
    private initializeRedis(): void {
        const redisConfig: any = {
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

        this.redis.on('error', (error) => {
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
    async set<T>(
        key: string, 
        value: T, 
        type: string = 'default', 
        options: CacheOptions = {}
    ): Promise<void> {
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
    async setWithTags<T>(
        key: string, 
        value: T, 
        tags: string[], 
        ttl?: number
    ): Promise<void> {
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
            await this.redis.del(key);
            logger.debug(`🗑️ Cache INVALIDATED: ${key}`);
        } catch (error) {
            logger.error(`Cache INVALIDATE error for key ${key}:`, error);
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
            const keys = this.tagMap.get(tag);
            if (keys && keys.size > 0) {
                const keyArray = Array.from(keys);
                await this.redis.del(...keyArray);
                this.tagMap.delete(tag);
                logger.info(`🏷️ Cache TAG INVALIDATED: ${tag} (${keyArray.length} keys)`);
            }
        } catch (error) {
            logger.error(`Cache TAG INVALIDATE error for tag ${tag}:`, error);
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
            const memMatch = info.match(/used_memory_human:(.+)/);
            const memoryUsage = memMatch?.[1]?.trim() || 'Unknown';
            
            const uptimeMatch = info.match(/uptime_in_seconds:(\d+)/);
            const uptime = uptimeMatch?.[1] ? parseInt(uptimeMatch[1]) : 0;
            
            const dbSize = await this.redis.dbsize();

            return {
                hitRatio: Number((hitRatio * 100).toFixed(2)),
                totalRequests,
                cacheSize: dbSize,
                memoryUsage,
                uptime
            };
        } catch (error) {
            logger.error('Error getting cache stats:', error);
            return {
                hitRatio: 0,
                totalRequests: 0,
                cacheSize: 0,
                memoryUsage: 'Error',
                uptime: 0
            };
        }
    }

    /**
     * Limpiar todo el cache (usar con cuidado)
     */
    async flush(): Promise<void> {
        try {
            await this.redis.flushdb();
            this.tagMap.clear();
            this.hits = 0;
            this.misses = 0;
            logger.warn('🧽 Cache FLUSHED completely');
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
     * Asociar tags con una clave para invalidación masiva
     * @private
     */
    private async associateTags(key: string, tags: string[]): Promise<void> {
        tags.forEach(tag => {
            if (!this.tagMap.has(tag)) {
                this.tagMap.set(tag, new Set());
            }
            this.tagMap.get(tag)!.add(key);
        });
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
import { Document, Model, Types, FilterQuery } from 'mongoose';
import { HttpError, HttpStatusCode } from '../types/Errors';
import { getErrorMessage } from '../types/modalTypes';
import { cacheService, CacheOptions } from './CacheService';
import logger from '../utils/logger';
import { sanitizeNoSQLInput } from '../utils/sanitizer';

/**
 * @description Base service class
 * @name BaseService
 * @class
 * @returns {Object}
 */

class BaseService<T extends Document> {
    protected modelName: string;
    protected cacheEnabled: boolean = true;
    protected cacheTTL: number = 300; // 5 minutos por defecto

    constructor(
        protected model: Model<T>,
        protected userId?: string
    ) {
        this.modelName = model.modelName.toLowerCase();
    }

    async getAll(): Promise<T[]> {
        return this.model.find();
    }

    async findById(id: string): Promise<T> {
        // Validate ObjectId format to prevent injection
        if (!Types.ObjectId.isValid(id)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid ID format'));
        }

        // Convert string to ObjectId to prevent injection
        const objectId = new Types.ObjectId(id);

        const item = await this.model.findById(objectId);
        if (!item) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage('Item not found'));
        }
        return item;
    }

    async create(data: Partial<T>): Promise<T> {
        // 🔒 Sanitize input to prevent NoSQL injection
        const sanitizedData = sanitizeNoSQLInput(data);

        // Si se proporciona userId en el constructor, úsalo como author por defecto
        // Pero si data ya tiene author, respeta ese valor
        if (this.userId && !(sanitizedData as any).author) {
            const dataWithAuthor = { ...sanitizedData, author: this.userId } as Partial<T>;
            return this.model.create(dataWithAuthor);
        }

        return this.model.create(sanitizedData);
    }

    async updateById(id: string, data: Partial<T>): Promise<T> {
        // Validate ObjectId format to prevent injection
        if (!Types.ObjectId.isValid(id)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid ID format'));
        }

        // 🔒 Sanitize input to prevent NoSQL injection
        const sanitizedData = sanitizeNoSQLInput(data);

        // Convert string to ObjectId to prevent injection
        const objectId = new Types.ObjectId(id);

        const item = await this.model.findByIdAndUpdate(objectId, sanitizedData, { new: true });
        if (!item) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage('Item not found'));
        }
        return item;
    }

    async deleteById(id: string): Promise<void> {
        // Validate ObjectId format to prevent injection
        if (!Types.ObjectId.isValid(id)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid ID format'));
        }

        // Convert string to ObjectId to prevent injection
        const objectId = new Types.ObjectId(id);

        const item = await this.model.findById(objectId);
        if (!item) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage('Item not found'));
        }

        await this.model.deleteOne({ _id: id });

        // Invalidar cache después de eliminar
        if (this.cacheEnabled) {
            await this.invalidateCache(id);
        }
    }

    // ========== MÉTODOS CON CACHE ==========

    /**
     * Buscar por ID con cache
     */
    async findByIdCached(id: string, options?: CacheOptions): Promise<T> {
        if (!this.cacheEnabled) {
            return this.findById(id);
        }

        const cacheKey = `${this.modelName}:${id}`;

        try {
            // Intentar obtener del cache
            let item = await cacheService.get<T>(cacheKey);

            if (!item) {
                // Cache miss - obtener de BD
                item = await this.findById(id);

                // Cachear el resultado
                await cacheService.set(cacheKey, item, this.modelName, {
                    ttl: options?.ttl || this.cacheTTL,
                    tags: options?.tags || [this.modelName],
                });
            }

            return item;
        } catch (error) {
            logger.error(`Cache error in findByIdCached for ${this.modelName}:`, error);
            // Fallback a búsqueda directa
            return this.findById(id);
        }
    }

    /**
     * Obtener todos con cache
     */
    async getAllCached(options?: CacheOptions): Promise<T[]> {
        if (!this.cacheEnabled) {
            return this.getAll();
        }

        const cacheKey = `${this.modelName}:all`;

        try {
            let items = await cacheService.get<T[]>(cacheKey);

            if (!items) {
                items = await this.getAll();
                await cacheService.set(cacheKey, items, this.modelName, {
                    ttl: options?.ttl || this.cacheTTL,
                    tags: options?.tags || [this.modelName, 'listings'],
                });
            }

            return items;
        } catch (error) {
            logger.error(`Cache error in getAllCached for ${this.modelName}:`, error);
            return this.getAll();
        }
    }

    /**
     * Crear con invalidación de cache
     */
    async createCached(data: Partial<T>, _options?: CacheOptions): Promise<T> {
        const item = await this.create(data);

        if (this.cacheEnabled) {
            // Invalidar cache de listados
            await this.invalidateCachePattern(`${this.modelName}:all*`);
            await cacheService.invalidateByTag(this.modelName);
        }

        return item;
    }

    /**
     * Actualizar con invalidación de cache
     */
    async updateByIdCached(id: string, data: Partial<T>): Promise<T> {
        const item = await this.updateById(id, data);

        if (this.cacheEnabled) {
            await this.invalidateCache(id);
        }

        return item;
    }

    /**
     * Buscar con cache genérico
     */
    async findWithCache<U = T>(query: object, cacheKey: string, options?: CacheOptions): Promise<U[]> {
        // 🔒 Sanitize query to prevent NoSQL injection
        const sanitizedQuery = sanitizeNoSQLInput(query);

        if (!this.cacheEnabled) {
            return this.model.find(sanitizedQuery).exec() as Promise<U[]>;
        }

        try {
            let results = await cacheService.get<U[]>(cacheKey);

            if (!results || results === null) {
                results = (await this.model.find(sanitizedQuery).exec()) as U[];
                await cacheService.set(cacheKey, results, this.modelName, {
                    ttl: options?.ttl || this.cacheTTL,
                    tags: options?.tags || [this.modelName],
                });
            }

            return results || ([] as U[]);
        } catch (error) {
            logger.error(`Cache error in findWithCache for ${this.modelName}:`, error);
            return this.model.find(sanitizedQuery).exec() as Promise<U[]>;
        }
    }

    /**
     * Invalidar cache específico de un item
     */
    async invalidateCache(id: string): Promise<void> {
        try {
            const cacheKey = `${this.modelName}:${id}`;
            await cacheService.invalidate(cacheKey);

            // También invalidar listados relacionados
            await this.invalidateCachePattern(`${this.modelName}:all*`);
            await cacheService.invalidateByTag(this.modelName);
        } catch (error) {
            logger.error(`Error invalidating cache for ${this.modelName}:${id}:`, error);
        }
    }

    /**
     * Invalidar cache por patrón
     */
    async invalidateCachePattern(pattern: string): Promise<void> {
        try {
            await cacheService.invalidatePattern(pattern);
        } catch (error) {
            logger.error(`Error invalidating cache pattern ${pattern}:`, error);
        }
    }

    /**
     * Configurar cache para este servicio
     */
    configureCaching(enabled: boolean, ttl?: number): void {
        this.cacheEnabled = enabled;
        if (ttl) {
            this.cacheTTL = ttl;
        }
    }

    /**
     * Generar clave de cache consistente
     */
    protected generateCacheKey(...parts: (string | number)[]): string {
        return [this.modelName, ...parts].join(':');
    }

    protected async findAll(): Promise<T[]> {
        return this.model.find({}).exec() as Promise<T[]>;
    }

    protected async findWithPagination(query: FilterQuery<T>, page: number = 1, limit: number = 10): Promise<T[]> {
        // 🔒 Sanitize query to prevent NoSQL injection
        const sanitizedQuery = sanitizeNoSQLInput(query);
        const skip = (page - 1) * limit;
        let results: T[];

        if (limit > 0) {
            results = (await this.model.find(sanitizedQuery).skip(skip).limit(limit).exec()) as T[];
        } else {
            results = (await this.model.find(sanitizedQuery).exec()) as T[];
        }

        return results;
    }

    protected async findNearby(coordinates: [number, number], maxDistance: number = 10000): Promise<T[]> {
        const query = {
            location: {
                $near: {
                    $geometry: { type: 'Point', coordinates },
                    $maxDistance: maxDistance,
                },
            },
        };
        return this.model.find(query).exec() as Promise<T[]>;
    }
}
export default BaseService;

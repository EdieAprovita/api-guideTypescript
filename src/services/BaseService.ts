import { Document, Model, Types, FilterQuery } from 'mongoose';
import { HttpError, HttpStatusCode } from '../types/Errors.js';
import { getErrorMessage } from '../types/modalTypes.js';
import { cacheService, CacheOptions } from './CacheService.js';
import logger from '../utils/logger.js';
import { PaginatedResponse, PaginationMeta, normalizePaginationParams } from '../types/pagination.js';

/**
 * @description Options for nearby search
 */
export interface NearbyOptions {
    latitude: number;
    longitude: number;
    radius?: number | undefined;
    page?: string | number | undefined;
    limit?: string | number | undefined;
    q?: string | undefined;
    searchFields?: string[] | undefined;
    filter?: Record<string, any> | undefined;
}

/**
 * @description Options for text search
 */
export interface SearchOptions {
    q?: string | undefined;
    category?: string | undefined;
    sortBy?: string | undefined;
    sortOrder?: 'asc' | 'desc' | undefined;
    page?: string | number | undefined;
    limit?: string | number | undefined;
    searchFields?: string[] | undefined;
}

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

    async getAllPaginated(
        page?: string | number,
        limit?: string | number,
        filter: FilterQuery<T> = {}
    ): Promise<PaginatedResponse<T>> {
        const { page: normalizedPage, limit: normalizedLimit } = normalizePaginationParams(page, limit);
        const skip = (normalizedPage - 1) * normalizedLimit;

        const [data, total] = await Promise.all([
            this.model.find(filter).skip(skip).limit(normalizedLimit).exec(),
            this.model.countDocuments(filter).exec(),
        ]);

        const meta: PaginationMeta = {
            page: normalizedPage,
            limit: normalizedLimit,
            total,
            pages: Math.ceil(total / normalizedLimit),
        };

        return { data: data as T[], meta };
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

    /**
     * Creates a new document in the database
     * @param data - Document data to create
     * @returns Created document
     * @security Data must be sanitized at the controller layer using sanitizeNoSQLInput()
     *           before reaching this service method. This architectural decision ensures
     *           that all user input is cleaned at the application boundary (controllers)
     *           before being passed to services, preventing NoSQL injection attacks.
     * @note SonarQube tssecurity:S5147 - This is a false positive. All controllers
     *       sanitize user input with sanitizeNoSQLInput() before calling this method.
     *       See: businessControllers.ts, userControllers.ts, etc.
     */
    async create(data: Partial<T>): Promise<T> {
        // Defense in depth: Validate that data doesn't contain MongoDB operators
        // This serves as a secondary check to ensure sanitization occurred upstream
        const dataKeys = Object.keys(data);
        const hasDangerousOperators = dataKeys.some(key => typeof key === 'string' && key.startsWith('$'));

        if (hasDangerousOperators) {
            logger.error('Potential NoSQL injection attempt detected in BaseService.create()', {
                modelName: this.modelName,
                suspiciousKeys: dataKeys.filter(k => typeof k === 'string' && k.startsWith('$')),
            });
            throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Invalid data format: MongoDB operators not allowed');
        }

        // Si se proporciona userId en el constructor, úsalo como author por defecto
        // Pero si data ya tiene author, respeta ese valor
        if (this.userId && !(data as any).author) {
            data = { ...data, author: this.userId } as Partial<T>;
        }

        return this.model.create(data); // NOSONAR - Data validated above and sanitized in controllers
    }

    async updateById(id: string, data: Partial<T>): Promise<T> {
        // Validate ObjectId format to prevent injection
        if (!Types.ObjectId.isValid(id)) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage('Invalid ID format'));
        }

        // Convert string to ObjectId to prevent injection
        const objectId = new Types.ObjectId(id);

        const item = await this.model.findByIdAndUpdate(objectId, data, { new: true });
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

    async getAllPaginatedCached(
        page?: string | number,
        limit?: string | number,
        filter: FilterQuery<T> = {},
        options?: CacheOptions
    ): Promise<PaginatedResponse<T>> {
        if (!this.cacheEnabled) {
            return this.getAllPaginated(page, limit, filter);
        }

        const { page: p, limit: l } = normalizePaginationParams(page, limit);
        const filterKey = Object.keys(filter).length > 0 ? `:f:${JSON.stringify(filter)}` : '';
        const cacheKey = `${this.modelName}:page:${p}:limit:${l}${filterKey}`;

        try {
            let result = await cacheService.get<PaginatedResponse<T>>(cacheKey);

            if (!result) {
                result = await this.getAllPaginated(page, limit, filter);
                await cacheService.set(cacheKey, result, this.modelName, {
                    ttl: options?.ttl || this.cacheTTL,
                    tags: options?.tags || [this.modelName, 'listings'],
                });
            }

            return result;
        } catch (error) {
            logger.error(`Cache error in getAllPaginatedCached for ${this.modelName}:`, error);
            return this.getAllPaginated(page, limit, filter);
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
        if (!this.cacheEnabled) {
            return this.model.find(query).exec() as Promise<U[]>;
        }

        try {
            let results = await cacheService.get<U[]>(cacheKey);

            if (!results || results === null) {
                results = (await this.model.find(query).exec()) as U[];
                await cacheService.set(cacheKey, results, this.modelName, {
                    ttl: options?.ttl || this.cacheTTL,
                    tags: options?.tags || [this.modelName],
                });
            }

            return results || ([] as U[]);
        } catch (error) {
            logger.error(`Cache error in findWithCache for ${this.modelName}:`, error);
            return this.model.find(query).exec() as Promise<U[]>;
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
        const skip = (page - 1) * limit;
        let results: T[];

        if (limit > 0) {
            results = (await this.model.find(query).skip(skip).limit(limit).exec()) as T[];
        } else {
            results = (await this.model.find(query).exec()) as T[];
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

    /**
     * @description Generic nearby search with pagination
     */
    async findNearbyPaginated(options: NearbyOptions): Promise<PaginatedResponse<T>> {
        const {
            latitude,
            longitude,
            radius = 5000,
            page,
            limit,
            q,
            searchFields = [],
            filter: extraFilter = {},
        } = options;
        const { page: normalizedPage, limit: normalizedLimit } = normalizePaginationParams(page, limit);
        const skip = (normalizedPage - 1) * normalizedLimit;

        const combinedFilter: Record<string, any> = {
            ...extraFilter,
            location: {
                $near: {
                    $geometry: { type: 'Point' as const, coordinates: [longitude, latitude] },
                    $maxDistance: radius,
                },
            },
        };

        if (q && searchFields.length > 0) {
            combinedFilter.$or = searchFields.map(field => ({
                [field]: { $regex: q, $options: 'i' },
            }));
        }

        const [data, total] = await Promise.all([
            this.model
                .find(combinedFilter as FilterQuery<T>)
                .skip(skip)
                .limit(normalizedLimit)
                .exec(),
            this.model.countDocuments(combinedFilter as FilterQuery<T>).exec(),
        ]);

        const meta: PaginationMeta = {
            page: normalizedPage,
            limit: normalizedLimit,
            total,
            pages: Math.ceil(total / normalizedLimit),
        };

        return { data: data as T[], meta };
    }

    /**
     * @description Generic text search with pagination
     */
    async searchPaginated(options: SearchOptions): Promise<PaginatedResponse<T>> {
        const { q, category, sortBy, sortOrder = 'asc', page, limit, searchFields = [] } = options;

        const { page: normalizedPage, limit: normalizedLimit } = normalizePaginationParams(page, limit);
        const skip = (normalizedPage - 1) * normalizedLimit;

        const filter: Record<string, any> = {};

        if (q && searchFields.length > 0) {
            filter.$or = searchFields.map(field => ({
                [field]: { $regex: q, $options: 'i' },
            }));
        }

        if (category) {
            // This is a generic category filter, might need customization in child services if field name differs
            filter.category = { $regex: category, $options: 'i' };
        }

        const sortDirection = sortOrder === 'desc' ? -1 : 1;
        const sortQuery = (sortBy ? { [sortBy]: sortDirection } : { createdAt: -1 }) as any;

        const [data, total] = await Promise.all([
            this.model
                .find(filter as FilterQuery<T>)
                .sort(sortQuery)
                .skip(skip)
                .limit(normalizedLimit)
                .exec(),
            this.model.countDocuments(filter as FilterQuery<T>).exec(),
        ]);

        const meta: PaginationMeta = {
            page: normalizedPage,
            limit: normalizedLimit,
            total,
            pages: Math.ceil(total / normalizedLimit),
        };

        return { data: data as T[], meta };
    }
}
export default BaseService;

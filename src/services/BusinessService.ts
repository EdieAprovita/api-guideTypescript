import BaseService from './BaseService.js';
import { IBusiness, Business } from '../models/Business.js';
import { PaginatedResponse, PaginationMeta, normalizePaginationParams } from '../types/pagination.js';

interface NearbyOptions {
    latitude: number;
    longitude: number;
    radius?: number;
    page?: string | number;
    limit?: string | number;
}

interface SearchOptions {
    q?: string;
    category?: string;
    sortBy?: 'name' | 'rating' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
    page?: string | number;
    limit?: string | number;
}

class BusinessService extends BaseService<IBusiness> {
    constructor() {
        super(Business);
    }

    async findNearbyPaginated(options: NearbyOptions): Promise<PaginatedResponse<IBusiness>> {
        const { latitude, longitude, radius = 5000, page, limit } = options;
        const { page: normalizedPage, limit: normalizedLimit } = normalizePaginationParams(page, limit);
        const skip = (normalizedPage - 1) * normalizedLimit;

        const geoQuery = {
            location: {
                $near: {
                    $geometry: { type: 'Point' as const, coordinates: [longitude, latitude] },
                    $maxDistance: radius,
                },
            },
        };

        const [data, total] = await Promise.all([
            Business.find(geoQuery).skip(skip).limit(normalizedLimit).exec(),
            Business.countDocuments(geoQuery).exec(),
        ]);

        const meta: PaginationMeta = {
            page: normalizedPage,
            limit: normalizedLimit,
            total,
            pages: Math.ceil(total / normalizedLimit),
        };

        return { data, meta };
    }

    async searchPaginated(options: SearchOptions): Promise<PaginatedResponse<IBusiness>> {
        const { q, category, sortBy = 'namePlace', sortOrder = 'asc', page, limit } = options;

        const { page: normalizedPage, limit: normalizedLimit } = normalizePaginationParams(page, limit);
        const skip = (normalizedPage - 1) * normalizedLimit;

        const filter: Record<string, unknown> = {};

        if (q) {
            filter.$or = [
                { namePlace: { $regex: q, $options: 'i' } },
                { address: { $regex: q, $options: 'i' } },
                { typeBusiness: { $regex: q, $options: 'i' } },
            ];
        }

        if (category) {
            filter.typeBusiness = { $regex: category, $options: 'i' };
        }

        const sortField = sortBy === 'name' ? 'namePlace' : sortBy;
        const sortDirection = sortOrder === 'desc' ? -1 : 1;

        const [data, total] = await Promise.all([
            Business.find(filter)
                .sort({ [sortField]: sortDirection })
                .skip(skip)
                .limit(normalizedLimit)
                .exec(),
            Business.countDocuments(filter).exec(),
        ]);

        const meta: PaginationMeta = {
            page: normalizedPage,
            limit: normalizedLimit,
            total,
            pages: Math.ceil(total / normalizedLimit),
        };

        return { data, meta };
    }
}

export const businessService = new BusinessService();

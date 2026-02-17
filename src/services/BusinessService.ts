import BaseService, { NearbyOptions, SearchOptions } from './BaseService.js';
import { IBusiness, Business } from '../models/Business.js';
import { PaginatedResponse } from '../types/pagination.js';

class BusinessService extends BaseService<IBusiness> {
    constructor() {
        super(Business);
    }

    async findNearbyPaginated(options: NearbyOptions): Promise<PaginatedResponse<IBusiness>> {
        return super.findNearbyPaginated(options);
    }

    async searchPaginated(options: SearchOptions): Promise<PaginatedResponse<IBusiness>> {
        // Map 'name' to the actual DB field 'namePlace' if provided
        const sortBy = options.sortBy === 'name' ? 'namePlace' : options.sortBy;

        return super.searchPaginated({
            ...options,
            sortBy,
            searchFields: ['namePlace', 'address', 'typeBusiness'],
        });
    }
}

export const businessService = new BusinessService();

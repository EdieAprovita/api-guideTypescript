import { restaurantService } from './RestaurantService.js';
import { businessService } from './BusinessService.js';
import { doctorService } from './DoctorService.js';
import { marketsService } from './MarketsService.js';
import { sanctuaryService } from './SanctuaryService.js';
import logger from '../utils/logger.js';

export interface UnifiedSearchResult {
    type: string;
    data: any[];
}

export class SearchService {
    /**
     * @description Unified search across all main entities
     */
    async unifiedSearch(q: string, lat?: number, lng?: number, radius?: number): Promise<UnifiedSearchResult[]> {
        const query = q || '';
        const nearbyOptions =
            lat !== undefined && lng !== undefined
                ? { latitude: Number(lat), longitude: Number(lng), radius: Number(radius) || 5000 }
                : null;

        const searchTasks = [
            { type: 'restaurant', service: restaurantService, fields: ['restaurantName', 'address', 'cuisine'] },
            { type: 'business', service: businessService, fields: ['namePlace', 'address', 'typeBusiness'] },
            { type: 'doctor', service: doctorService, fields: ['doctorName', 'address', 'specialty'] },
            { type: 'market', service: marketsService, fields: ['marketName', 'address', 'typeMarket'] },
            { type: 'sanctuary', service: sanctuaryService, fields: ['sanctuaryName', 'address', 'typeofSanctuary'] },
        ];

        const results = await Promise.allSettled(
            searchTasks.map(async task => {
                if (nearbyOptions) {
                    // Combine search and nearby
                    const result = await task.service.findNearbyPaginated({
                        ...nearbyOptions,
                        q: query,
                        searchFields: task.fields,
                        limit: 5,
                    });

                    return { type: task.type, data: result.data };
                } else {
                    const result = await task.service.searchPaginated({
                        q: query,
                        searchFields: task.fields,
                        limit: 5,
                    });
                    return { type: task.type, data: result.data };
                }
            })
        );

        // Log any failures for visibility
        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                logger.warn(`Search failed for ${searchTasks[index]?.type}:`, result.reason);
            }
        });

        return results
            .filter(r => r.status === 'fulfilled')
            .map(r => (r as PromiseFulfilledResult<UnifiedSearchResult>).value)
            .filter(r => r.data.length > 0);
    }

    async getSuggestions(q: string): Promise<string[]> {
        // Simple suggestion logic: searching across name fields
        const results = await this.unifiedSearch(q);
        const suggestions = new Set<string>();

        results.forEach(res => {
            res.data.forEach((item: any) => {
                const name =
                    item.restaurantName ||
                    item.namePlace ||
                    item.marketName ||
                    item.doctorName ||
                    item.sanctuaryName ||
                    item.professionName;
                if (name) suggestions.add(name);
            });
        });

        return Array.from(suggestions).slice(0, 10);
    }

    /**
     * Search within a specific resource type
     */
    async searchByResourceType(
        resourceType: string,
        q: string,
        lat?: number,
        lng?: number,
        radius?: number
    ): Promise<UnifiedSearchResult> {
        const resourceMap: Record<string, { service: any; fields: string[] }> = {
            restaurant: { service: restaurantService, fields: ['restaurantName', 'address', 'cuisine'] },
            restaurants: { service: restaurantService, fields: ['restaurantName', 'address', 'cuisine'] },
            business: { service: businessService, fields: ['namePlace', 'address', 'typeBusiness'] },
            businesses: { service: businessService, fields: ['namePlace', 'address', 'typeBusiness'] },
            doctor: { service: doctorService, fields: ['doctorName', 'address', 'specialty'] },
            doctors: { service: doctorService, fields: ['doctorName', 'address', 'specialty'] },
            market: { service: marketsService, fields: ['marketName', 'address', 'typeMarket'] },
            markets: { service: marketsService, fields: ['marketName', 'address', 'typeMarket'] },
            sanctuary: { service: sanctuaryService, fields: ['sanctuaryName', 'address', 'typeofSanctuary'] },
            sanctuaries: { service: sanctuaryService, fields: ['sanctuaryName', 'address', 'typeofSanctuary'] },
        };

        const target = resourceMap[resourceType.toLowerCase()];
        if (!target) {
            return { type: resourceType, data: [] };
        }

        if (lat !== undefined && lng !== undefined) {
            const result = await target.service.findNearbyPaginated({
                latitude: lat,
                longitude: lng,
                radius: radius || 5000,
                q: q || '',
                searchFields: target.fields,
                limit: 20,
            });
            return { type: resourceType, data: result.data };
        }

        const result = await target.service.searchPaginated({
            q: q || '',
            searchFields: target.fields,
            limit: 20,
        });
        return { type: resourceType, data: result.data };
    }

    /**
     * Return popular searches — top-rated items from each main entity type
     */
    async getPopularSearches(): Promise<UnifiedSearchResult[]> {
        const tasks = [
            { type: 'restaurant', service: restaurantService, fields: ['restaurantName', 'address', 'cuisine'] },
            { type: 'doctor', service: doctorService, fields: ['doctorName', 'address', 'specialty'] },
            { type: 'market', service: marketsService, fields: ['marketName', 'address', 'typeMarket'] },
        ];

        const results = await Promise.allSettled(
            tasks.map(async task => {
                const result = await task.service.searchPaginated({
                    q: '',
                    searchFields: task.fields,
                    sortBy: 'rating',
                    sortOrder: 'desc',
                    limit: 5,
                });
                return { type: task.type, data: result.data };
            })
        );

        return results
            .filter(r => r.status === 'fulfilled')
            .map(r => (r as PromiseFulfilledResult<UnifiedSearchResult>).value)
            .filter(r => r.data.length > 0);
    }

    /**
     * Return counts of each entity type for aggregation UI
     */
    async getAggregations(): Promise<Record<string, number>> {
        const tasks = [
            { type: 'restaurants', service: restaurantService },
            { type: 'businesses', service: businessService },
            { type: 'doctors', service: doctorService },
            { type: 'markets', service: marketsService },
            { type: 'sanctuaries', service: sanctuaryService },
        ];

        const counts: Record<string, number> = {};

        await Promise.allSettled(
            tasks.map(async task => {
                try {
                    const result = await task.service.searchPaginated({ q: '', searchFields: [], limit: 1 });
                    counts[task.type] = result.meta?.total ?? 0;
                } catch {
                    counts[task.type] = 0;
                }
            })
        );

        return counts;
    }

    /**
     * Log/acknowledge a search analytics event
     */
    saveSearchAnalytics(query: string, resourceType?: string): void {
        logger.info(`[search-analytics] query="${query}" resourceType="${resourceType ?? 'all'}"`);
    }
}

export const searchService = new SearchService();
export default searchService;

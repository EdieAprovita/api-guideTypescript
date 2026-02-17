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
}

export const searchService = new SearchService();
export default searchService;

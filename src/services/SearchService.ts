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

/**
 * Minimal interface that all searchable entity services must implement.
 * Replaces `service: any` to provide compile-time safety (#8).
 */
interface SearchableService {
    searchPaginated(opts: SearchPaginatedOpts): Promise<{ data: any[]; meta?: { total?: number } }>;
    findNearbyPaginated(opts: NearbyPaginatedOpts): Promise<{ data: any[] }>;
}

interface SearchPaginatedOpts {
    q: string;
    searchFields: string[];
    limit: number;
    sortBy?: string;
    sortOrder?: string;
}

interface NearbyPaginatedOpts {
    latitude: number;
    longitude: number;
    radius: number;
    q: string;
    searchFields: string[];
    limit: number;
}

/**
 * Module-level entity registry — single source of truth for all searchable entities.
 * Eliminates duplicate { service, fields } mappings across methods (#7).
 */
const ENTITY_REGISTRY: Array<{ type: string; service: SearchableService; fields: string[] }> = [
    {
        type: 'restaurant',
        service: restaurantService as SearchableService,
        fields: ['restaurantName', 'address', 'cuisine'],
    },
    {
        type: 'business',
        service: businessService as SearchableService,
        fields: ['namePlace', 'address', 'typeBusiness'],
    },
    { type: 'doctor', service: doctorService as SearchableService, fields: ['doctorName', 'address', 'specialty'] },
    { type: 'market', service: marketsService as SearchableService, fields: ['marketName', 'address', 'typeMarket'] },
    {
        type: 'sanctuary',
        service: sanctuaryService as SearchableService,
        fields: ['sanctuaryName', 'address', 'typeofSanctuary'],
    },
];

/**
 * Build a lookup map that includes both singular and plural forms.
 * e.g. 'restaurant' and 'restaurants' both resolve to the same entry.
 */
const buildResourceMap = (): Record<string, { service: SearchableService; fields: string[] }> => {
    const map: Record<string, { service: SearchableService; fields: string[] }> = {};
    for (const entry of ENTITY_REGISTRY) {
        map[entry.type] = { service: entry.service, fields: entry.fields };
        map[`${entry.type}s`] = { service: entry.service, fields: entry.fields };
    }
    return map;
};

const RESOURCE_MAP = buildResourceMap();

/**
 * Strip newlines and control characters from a string to prevent log injection.
 */
const sanitizeForLog = (value: string): string =>
    // Strip ASCII control characters (U+0000-U+001F) and DEL (U+007F) to prevent log injection.
    value.replace(/[\u0000-\u001F\u007F]/g, ' ').trim();

export class SearchService {
    /**
     * @description Unified search across all main entities
     */
    async unifiedSearch(q: string, lat?: number, lng?: number, radius?: number): Promise<UnifiedSearchResult[]> {
        const query = q || '';
        const nearbyOptions =
            lat !== undefined && lng !== undefined ? { latitude: lat, longitude: lng, radius: radius ?? 5000 } : null;

        const results = await Promise.allSettled(
            ENTITY_REGISTRY.map(async task => {
                if (nearbyOptions) {
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
                logger.warn(`Search failed for ${ENTITY_REGISTRY[index]?.type}:`, result.reason);
            }
        });

        return results
            .filter(r => r.status === 'fulfilled')
            .map(r => (r as PromiseFulfilledResult<UnifiedSearchResult>).value)
            .filter(r => r.data.length > 0);
    }

    async getSuggestions(q: string): Promise<string[]> {
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
        const target = RESOURCE_MAP[resourceType.toLowerCase()];
        if (!target) {
            return { type: resourceType, data: [] };
        }

        if (lat !== undefined && lng !== undefined) {
            const result = await target.service.findNearbyPaginated({
                latitude: lat,
                longitude: lng,
                radius: radius ?? 5000,
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
        // Use a subset of the registry (restaurants, doctors, markets)
        const popularTypes = new Set(['restaurant', 'doctor', 'market']);
        const tasks = ENTITY_REGISTRY.filter(e => popularTypes.has(e.type));

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
        const counts: Record<string, number> = {};

        // Promise.allSettled already prevents rejection propagation;
        // the inner try/catch in the previous version was redundant (#9).
        await Promise.allSettled(
            ENTITY_REGISTRY.map(async task => {
                const result = await task.service.searchPaginated({ q: '', searchFields: [], limit: 1 });
                counts[`${task.type}s`] = result.meta?.total ?? 0;
            })
        );

        return counts;
    }

    /**
     * Log a search analytics event.
     * NOTE: persistence is not yet implemented — this only writes to the application log (#10).
     *
     * Security: query and resourceType are sanitized before logging to prevent log injection (#3).
     */
    logSearchQuery(query: string, resourceType?: string): void {
        const safeQuery = sanitizeForLog(query);
        const safeResource = sanitizeForLog(resourceType ?? 'all');
        logger.info(`[search-analytics] query="${safeQuery}" resourceType="${safeResource}"`);
    }
}

export const searchService = new SearchService();
export default searchService;

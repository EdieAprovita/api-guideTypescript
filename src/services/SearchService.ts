import { restaurantService } from './RestaurantService.js';
import { businessService } from './BusinessService.js';
import { doctorService } from './DoctorService.js';
import { marketsService } from './MarketsService.js';
import { sanctuaryService } from './SanctuaryService.js';
import { cacheService } from './CacheService.js';
import logger from '../utils/logger.js';
import { HttpError, HttpStatusCode } from '../types/Errors.js';

export interface UnifiedSearchResult {
    type: string;
    data: Record<string, unknown>[];
}

/**
 * Minimal interface that all searchable entity services must implement.
 * Replaces `service: any` to provide compile-time safety (#8).
 *
 * Contract note: Services must support `limit: 0` in `searchPaginated` by returning
 * metadata (e.g. `meta.total`) immediately without fetching documents from the DB.
 */
interface SearchableService {
    searchPaginated(opts: SearchPaginatedOpts): Promise<{ data: Record<string, unknown>[]; meta?: { total?: number } }>;
    findNearbyPaginated(opts: NearbyPaginatedOpts): Promise<{ data: Record<string, unknown>[] }>;
    countAll(): Promise<number>;
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
 * Runtime validator: ensures a service conforms to SearchableService at module initialization.
 * Catches misconfigured services immediately (at startup) rather than during a live request.
 */
function assertSearchableService(name: string, svc: unknown): SearchableService {
    const s = svc as Record<string, unknown>;
    const hasSearch = typeof s?.['searchPaginated'] === 'function';
    const hasNearby = typeof s?.['findNearbyPaginated'] === 'function';
    const hasCount = typeof s?.['countAll'] === 'function';
    if (!hasSearch || !hasNearby || !hasCount) {
        throw new Error(
            `Service "${name}" is misconfigured: ` +
                `searchPaginated=${hasSearch ? 'OK' : 'MISSING'}, ` +
                `findNearbyPaginated=${hasNearby ? 'OK' : 'MISSING'}, ` +
                `countAll=${hasCount ? 'OK' : 'MISSING'}`
        );
    }
    return svc as SearchableService;
}

/**
 * Module-level entity registry — single source of truth for all searchable entities.
 * Eliminates duplicate { service, fields } mappings across methods (#7).
 * Services are validated at module load time via assertSearchableService (#8).
 */
const ENTITY_REGISTRY: Array<{ type: string; service: SearchableService; fields: string[]; popular: boolean }> =
    (() => {
        try {
            return [
                {
                    type: 'restaurant',
                    service: assertSearchableService('restaurantService', restaurantService),
                    fields: ['restaurantName', 'address', 'cuisine'],
                    popular: true,
                },
                {
                    type: 'business',
                    service: assertSearchableService('businessService', businessService),
                    fields: ['namePlace', 'address', 'typeBusiness'],
                    popular: false,
                },
                {
                    type: 'doctor',
                    service: assertSearchableService('doctorService', doctorService),
                    fields: ['doctorName', 'address', 'specialty'],
                    popular: true,
                },
                {
                    type: 'market',
                    service: assertSearchableService('marketsService', marketsService),
                    fields: ['marketName', 'address', 'typeMarket'],
                    popular: true,
                },
                {
                    type: 'sanctuary',
                    service: assertSearchableService('sanctuaryService', sanctuaryService),
                    fields: ['sanctuaryName', 'address', 'typeofSanctuary'],
                    popular: false,
                },
            ];
        } catch (error) {
            logger.error('Failed to initialize search ENTITY_REGISTRY. Services may be improperly configured.', error);
            // Rethrow to fail fast on application start
            throw error;
        }
    })();

/**
 * Helper to handle irregular plurals
 */
const pluralize = (type: string) => (type === 'sanctuary' ? 'sanctuaries' : `${type}s`);

/**
 * Build a lookup map that includes both singular and plural forms.
 * e.g. 'restaurant' and 'restaurants' both resolve to the same entry.
 */
const buildResourceMap = (): Record<string, { service: SearchableService; fields: string[] }> => {
    const map: Record<string, { service: SearchableService; fields: string[] }> = {};
    for (const entry of ENTITY_REGISTRY) {
        map[entry.type] = { service: entry.service, fields: entry.fields };
        map[pluralize(entry.type)] = { service: entry.service, fields: entry.fields };
    }
    return map;
};

const RESOURCE_MAP = buildResourceMap();

/**
 * Strip newlines and control characters from a string to prevent log injection.
 */
const sanitizeForLog = (value: string): string =>
    // \p{Cc} = Unicode "Control" category (U+0000-U+001F, U+007F).
    // Using a Unicode property escape avoids SonarQube S6324 (control chars in regex classes).
    // NOSONAR: String#replace with /g flag is intentional — replaceAll with regex requires ES2021+
    // and this module needs to maintain ES2020 compatibility.
    value.replace(/\p{Cc}/gu, ' ').trim(); // NOSONAR

export class SearchService {
    /**
     * Check if a requested resource type is valid and registered
     */
    isValidResourceType(type: string): boolean {
        return !!RESOURCE_MAP[type.toLowerCase()];
    }

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
        const query = q || '';
        if (!query) return [];

        // Optimize: Use targeted searchPaginated instead of unifiedSearch with strict limits
        const results = await Promise.allSettled(
            ENTITY_REGISTRY.map(async task => {
                const result = await task.service.searchPaginated({
                    q: query,
                    searchFields: task.fields,
                    limit: 2,
                });
                return { type: task.type, data: result.data };
            })
        );

        const suggestions = new Set<string>();

        results.forEach(res => {
            if (res.status === 'fulfilled') {
                res.value.data.forEach((item: Record<string, unknown>) => {
                    const name =
                        (item['restaurantName'] as string) ||
                        (item['namePlace'] as string) ||
                        (item['marketName'] as string) ||
                        (item['doctorName'] as string) ||
                        (item['sanctuaryName'] as string) ||
                        (item['professionName'] as string);
                    if (name) suggestions.add(name);
                });
            }
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
            throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Unknown resource type requested');
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
        const cacheKey = 'search:popular';
        const cached = await cacheService.get<UnifiedSearchResult[]>(cacheKey);
        if (cached) return cached;

        // TODO(#124): add in-flight deduplication
        // Filter based on the 'popular' flag in the entity registry
        const tasks = ENTITY_REGISTRY.filter(e => e.popular);

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

        if (results.length > 0 && results.every(r => r.status === 'rejected')) {
            logger.warn('All popular search tasks failed to fetch data');
        }

        const finalResults = results
            .filter(r => r.status === 'fulfilled')
            .map(r => (r as PromiseFulfilledResult<UnifiedSearchResult>).value);

        // Cache even empty results to prevent DB spam on empty state
        // The 'search' namespace delegates to config/redis with a standard TTL (~1 hour usually)
        await cacheService.set(cacheKey, finalResults, 'search');

        return finalResults;
    }

    /**
     * Return counts of each entity type for aggregation UI
     */
    async getAggregations(): Promise<Record<string, number>> {
        const cacheKey = 'search:aggregations';
        const cached = await cacheService.get<Record<string, number>>(cacheKey);
        if (cached) return cached;

        const counts: Record<string, number> = {};

        // Promise.allSettled avoids short-circuiting on single service failure.
        const results = await Promise.allSettled(
            ENTITY_REGISTRY.map(async task => {
                const count = await task.service.countAll();
                return { type: task.type, count };
            })
        );

        let allFailed = true;
        let anyFailed = false;

        for (const [index, result] of results.entries()) {
            const entityType = ENTITY_REGISTRY[index]?.type ?? 'unknown';
            const pluralType = pluralize(entityType);

            if (result.status === 'fulfilled') {
                allFailed = false;
                counts[pluralType] = result.value.count;
            } else {
                anyFailed = true;
                logger.error(`Aggregation failed for resource type: ${entityType}`, result.reason);
                counts[pluralType] = 0;
            }
        }

        if (allFailed) {
            throw new HttpError(
                HttpStatusCode.INTERNAL_SERVER_ERROR,
                'Unable to fetch aggregations across all services'
            );
        }

        if (anyFailed) {
            logger.warn('Aggregations returned partial data due to service failures');
            // Cache partial failures with a shorter TTL (30 seconds) to mitigate thundering herds
            // Assuming cacheService accepts TTL mapping string or we convert explicitly:
            await cacheService.set(cacheKey, counts, '30' as any);
        } else {
            // Document cache TTL: 'search' mapping delegates TTL logic (e.g. 1 hour)
            await cacheService.set(cacheKey, counts, 'search');
        }

        return counts;
    }

    /**
     * Log a search analytics event.
     * NOTE: persistence is not yet implemented — this only writes to the application log (#10).
     * This is currently a fire-and-forget synchronous operation, but will become async when DB persistence is added.
     *
     * Security: query and resourceType are sanitized before logging to prevent log injection (#3).
     */
    async logSearchQuery(query: string, resourceType?: string): Promise<void> {
        try {
            const safeQuery = sanitizeForLog(query);
            const safeResource = sanitizeForLog(resourceType ?? 'all');
            logger.info(`[search-analytics] query="${safeQuery}" resourceType="${safeResource}"`);
        } catch (error) {
            logger.error('Failed to log search query analytics', error);
        }
    }
}

export const searchService = new SearchService();
export default searchService;

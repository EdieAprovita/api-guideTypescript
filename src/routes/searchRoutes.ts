import express from 'express';
import { searchController } from '../controllers/SearchController.js';
import { rateLimits, validate, validateInputLength } from '../middleware/validation.js';
import { searchSchemas } from '../utils/validators.js';

const router = express.Router();

/**
 * @route   GET /api/v1/search
 * @desc    Unified search across all entities
 */
router.get('/', rateLimits.search, validate({ query: searchSchemas.query }), searchController.unifiedSearch);

/**
 * @route   GET /api/v1/search/suggestions
 * @desc    Get search suggestions
 */
router.get(
    '/suggestions',
    rateLimits.search,
    validate({ query: searchSchemas.suggestions }),
    searchController.getSuggestions
);

/**
 * @route   GET /api/v1/search/popular
 * @desc    Get popular searches (top-rated items per entity type)
 * NOTE: defined before /:resourceType to avoid param capture
 */
router.get('/popular', rateLimits.search, searchController.getPopularSearches);

/**
 * @route   GET /api/v1/search/aggregations
 * @desc    Get entity counts for search UI aggregations
 * NOTE: defined before /:resourceType to avoid param capture
 */
router.get('/aggregations', rateLimits.search, searchController.getSearchAggregations);

/**
 * @route   POST /api/v1/search/analytics
 * @desc    Log a search query for analytics
 * Security: rate-limited and input-capped to prevent abuse/log injection vectors (#4)
 */
router.post(
    '/analytics',
    rateLimits.api,
    validateInputLength(512),
    validate({ body: searchSchemas.analytics }),
    searchController.saveSearchQuery
);

/**
 * @route   GET /api/v1/search/:resourceType
 * @desc    Search within a specific resource type (restaurants, doctors, markets, etc.)
 * NOTE: must be after all static routes above
 */
router.get(
    '/:resourceType',
    rateLimits.search,
    validate({ params: searchSchemas.resourceTypeParam, query: searchSchemas.query }),
    searchController.searchByResourceType
);

export default router;

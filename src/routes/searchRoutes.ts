import express from 'express';
import { searchController } from '../controllers/SearchController.js';

const router = express.Router();

/**
 * @route   GET /api/v1/search
 * @desc    Unified search across all entities
 */
router.get('/', searchController.unifiedSearch);

/**
 * @route   GET /api/v1/search/suggestions
 * @desc    Get search suggestions
 */
router.get('/suggestions', searchController.getSuggestions);

/**
 * @route   GET /api/v1/search/popular
 * @desc    Get popular searches (top-rated items per entity type)
 * NOTE: defined before /:resourceType to avoid param capture
 */
router.get('/popular', searchController.getPopularSearches);

/**
 * @route   GET /api/v1/search/aggregations
 * @desc    Get entity counts for search UI aggregations
 * NOTE: defined before /:resourceType to avoid param capture
 */
router.get('/aggregations', searchController.getSearchAggregations);

/**
 * @route   POST /api/v1/search/analytics
 * @desc    Log a search query for analytics
 */
router.post('/analytics', searchController.saveSearchQuery);

/**
 * @route   GET /api/v1/search/:resourceType
 * @desc    Search within a specific resource type (restaurants, doctors, markets, etc.)
 * NOTE: must be after all static routes above
 */
router.get('/:resourceType', searchController.searchByResourceType);

export default router;

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

export default router;

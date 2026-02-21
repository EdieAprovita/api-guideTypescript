import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { searchService } from '../services/SearchService.js';
import { sendSuccessResponse } from '../utils/responseHelpers.js';

/**
 * @description Search controller class
 * @name SearchController
 */
export class SearchController {
    /**
     * @route   GET /api/v1/search
     * @desc    Unified search across all entities
     * @access  Public
     */
    unifiedSearch = asyncHandler(async (req: Request, res: Response) => {
        const { q, lat, lng, latitude, longitude, radius } = req.query;

        const results = await searchService.unifiedSearch(
            q as string,
            latitude || lat ? Number(latitude || lat) : undefined,
            longitude || lng ? Number(longitude || lng) : undefined,
            radius ? Number(radius) : undefined
        );

        sendSuccessResponse(res, results, 'Search completed successfully');
    });

    /**
     * @route   GET /api/v1/search/suggestions
     * @desc    Get search suggestions
     * @access  Public
     */
    getSuggestions = asyncHandler(async (req: Request, res: Response) => {
        const { q } = req.query;

        if (!q) {
            sendSuccessResponse(res, [], 'No suggestions available');
            return;
        }

        const suggestions = await searchService.getSuggestions(q as string);
        sendSuccessResponse(res, suggestions, 'Suggestions fetched successfully');
    });

    /**
     * @route   GET /api/v1/search/popular
     * @desc    Get popular searches (top-rated items per entity type)
     * @access  Public
     */
    getPopularSearches = asyncHandler(async (_req: Request, res: Response) => {
        const results = await searchService.getPopularSearches();
        sendSuccessResponse(res, results, 'Popular searches fetched successfully');
    });

    /**
     * @route   GET /api/v1/search/aggregations
     * @desc    Get entity counts for search UI aggregations
     * @access  Public
     */
    getSearchAggregations = asyncHandler(async (_req: Request, res: Response) => {
        const aggregations = await searchService.getAggregations();
        sendSuccessResponse(res, aggregations, 'Aggregations fetched successfully');
    });

    /**
     * @route   POST /api/v1/search/analytics
     * @desc    Log a search query for analytics
     * @access  Public
     */
    saveSearchQuery = asyncHandler(async (req: Request, res: Response) => {
        const { query, resourceType } = req.body as { query?: string; resourceType?: string };
        searchService.saveSearchAnalytics(query ?? '', resourceType);
        sendSuccessResponse(res, null, 'Search query recorded');
    });

    /**
     * @route   GET /api/v1/search/:resourceType
     * @desc    Search within a specific resource type
     * @access  Public
     */
    searchByResourceType = asyncHandler(async (req: Request, res: Response) => {
        const { resourceType } = req.params;
        const { q, lat, lng, latitude, longitude, radius } = req.query;

        const result = await searchService.searchByResourceType(
            resourceType,
            q as string,
            latitude || lat ? Number(latitude || lat) : undefined,
            longitude || lng ? Number(longitude || lng) : undefined,
            radius ? Number(radius) : undefined
        );

        sendSuccessResponse(res, result, `${resourceType} search completed`);
    });
}

export const searchController = new SearchController();
export default searchController;

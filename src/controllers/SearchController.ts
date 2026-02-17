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
}

export const searchController = new SearchController();
export default searchController;

import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { searchService } from '../services/SearchService.js';
import { HttpStatusCode } from '../types/Errors.js';

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
        const { q, lat, lng, radius } = req.query;

        const results = await searchService.unifiedSearch(
            q as string,
            lat ? Number(lat) : undefined,
            lng ? Number(lng) : undefined,
            radius ? Number(radius) : undefined
        );

        res.status(HttpStatusCode.OK).json(results);
    });

    /**
     * @route   GET /api/v1/search/suggestions
     * @desc    Get search suggestions
     * @access  Public
     */
    getSuggestions = asyncHandler(async (req: Request, res: Response) => {
        const { q } = req.query;

        if (!q) {
            res.status(HttpStatusCode.OK).json([]);
            return;
        }

        const suggestions = await searchService.getSuggestions(q as string);
        res.status(HttpStatusCode.OK).json(suggestions);
    });
}

export const searchController = new SearchController();
export default searchController;

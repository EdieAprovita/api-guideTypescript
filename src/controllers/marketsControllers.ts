import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../middleware/asyncHandler';
import { validationResult } from 'express-validator';
import { HttpError, HttpStatusCode } from '../types/Errors';
import { getErrorMessage } from '../types/modalTypes';
import { marketsService as MarketsService } from '../services/MarketsService';
import {
    createAddReviewHandler,
    createGetReviewsHandler,
    createGetReviewStatsHandler,
} from './factories/reviewEndpointsFactory';
import geocodeAndAssignLocation from '../utils/geocodeLocation';

/**
 * @description Get all markets
 * @name getMarkets
 * @route GET /api/markets
 * @access Public
 * @returns {Promise<Response>}
 */

export const getMarkets = asyncHandler(async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const markets = await MarketsService.getAll();
        res.status(200).json({
            success: true,
            message: 'Markets fetched successfully',
            data: markets,
        });
    } catch (error) {
        next(
            new HttpError(
                HttpStatusCode.NOT_FOUND,
                getErrorMessage(error instanceof Error ? error.message : 'Unknown error')
            )
        );
    }
});

/**
 * @description Get a market by id
 * @name getMarketById
 * @route GET /api/markets/:id
 * @access Public
 * @returns {Promise<Response>}
 */

export const getMarketById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        if (!id) {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Market ID is required'));
        }
        const market = await MarketsService.findById(id);
        res.status(200).json({
            success: true,
            message: 'Market fetched successfully',
            data: market,
        });
    } catch (error) {
        next(
            new HttpError(
                HttpStatusCode.NOT_FOUND,
                getErrorMessage(error instanceof Error ? error.message : 'Unknown error')
            )
        );
    }
});

/**
 * @description Create a new market
 * @name createMarket
 * @route POST /api/markets
 * @access Private
 * @returns {Promise<Response>}
 */

export const createMarket = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return next(new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(firstError?.msg ?? 'Validation error')));
    }
    try {
        await geocodeAndAssignLocation(req.body);
        const market = await MarketsService.create(req.body);
        res.status(201).json({
            success: true,
            message: 'Market created successfully',
            data: market,
        });
    } catch (error) {
        next(
            new HttpError(
                HttpStatusCode.INTERNAL_SERVER_ERROR,
                getErrorMessage(error instanceof Error ? error.message : 'Unknown error')
            )
        );
    }
});

/**
 * @description Update a market
 * @name updateMarket
 * @route PUT /api/markets/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const updateMarket = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return next(new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(firstError?.msg ?? 'Validation error')));
    }
    try {
        const { id } = req.params;
        if (!id) {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Market ID is required'));
        }
        await geocodeAndAssignLocation(req.body);
        const market = await MarketsService.updateById(id, req.body);
        res.status(200).json({
            success: true,
            message: 'Market updated successfully',
            data: market,
        });
    } catch (error) {
        next(
            new HttpError(
                HttpStatusCode.INTERNAL_SERVER_ERROR,
                getErrorMessage(error instanceof Error ? error.message : 'Unknown error')
            )
        );
    }
});

/**
 * @description Delete a market
 * @name deleteMarket
 * @route DELETE /api/markets/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const deleteMarket = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        if (!id) throw new HttpError(HttpStatusCode.NOT_FOUND, 'Market not found');
        await MarketsService.deleteById(id);
        res.status(200).json({
            success: true,
            message: 'Market deleted successfully',
        });
    } catch (error) {
        next(
            new HttpError(
                HttpStatusCode.INTERNAL_SERVER_ERROR,
                getErrorMessage(error instanceof Error ? error.message : 'Unknown error')
            )
        );
    }
});

/**
 * @description Add review to a market
 * @name addReviewToMarket
 * @route POST /api/markets/:id/reviews
 * @access Private
 * @returns {Promise<Response>}
 */

export const addReviewToMarket = createAddReviewHandler('Market', MarketsService, 'marketId');

/**
 * @description Get reviews for a market
 * @name getMarketReviews
 * @route GET /api/markets/:id/reviews
 * @access Public
 * @returns {Promise<Response>}
 */
export const getMarketReviews = createGetReviewsHandler('Market', MarketsService);

/**
 * @description Get review statistics for a market
 * @name getMarketReviewStats
 * @route GET /api/markets/:id/reviews/stats
 * @access Public
 * @returns {Promise<Response>}
 */
export const getMarketReviewStats = createGetReviewStatsHandler('Market', MarketsService);

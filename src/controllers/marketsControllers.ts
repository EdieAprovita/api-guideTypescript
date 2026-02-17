import { marketsService as MarketsService } from '../services/MarketsService.js';
import { sanitizeNoSQLInput } from '../utils/sanitizer.js';
import {
    createAddReviewHandler,
    createGetReviewsHandler,
    createGetReviewStatsHandler,
} from './factories/reviewEndpointsFactory.js';
import geocodeAndAssignLocation from '../utils/geocodeLocation.js';
import {
    createGetAllHandler,
    createGetByIdHandler,
    createCreateHandler,
    createUpdateHandler,
    createDeleteHandler,
    createGetNearbyHandler,
} from './factories/entityControllerFactory.js';

/**
 * @description Get all markets
 * @name getMarkets
 * @route GET /api/markets
 * @access Public
 * @returns {Promise<Response>}
 */
export const getMarkets = createGetAllHandler(MarketsService, 'Market');

/**
 * @description Get a market by id
 * @name getMarketById
 * @route GET /api/markets/:id
 * @access Public
 * @returns {Promise<Response>}
 */
export const getMarketById = createGetByIdHandler(MarketsService, 'Market');

const preProcessMarket = async (data: any) => {
    const sanitized = sanitizeNoSQLInput(data);
    await geocodeAndAssignLocation(sanitized);
};

/**
 * @description Create a new market
 * @name createMarket
 * @route POST /api/markets
 * @access Private
 * @returns {Promise<Response>}
 */
export const createMarket = createCreateHandler(MarketsService, 'Market', {
    preCreate: preProcessMarket,
});

/**
 * @description Update a market
 * @name updateMarket
 * @route PUT /api/markets/:id
 * @access Private
 * @returns {Promise<Response>}
 */
export const updateMarket = createUpdateHandler(MarketsService, 'Market', {
    preUpdate: preProcessMarket,
});

/**
 * @description Delete a market
 * @name deleteMarket
 * @route DELETE /api/markets/:id
 * @access Private
 * @returns {Promise<Response>}
 */
export const deleteMarket = createDeleteHandler(MarketsService, 'Market');

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

/**
 * @description Get nearby markets
 * @name getNearbyMarkets
 * @route GET /api/v1/markets/nearby
 * @access Public
 * @returns {Promise<Response>}
 */
export const getNearbyMarkets = createGetNearbyHandler(MarketsService, 'Market');

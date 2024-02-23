import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middleware/asyncHandler";
import { validationResult } from "express-validator";
import { BadRequestError, InternalServerError } from "../types/Errors";
import MarketsService from "../services/MarketsService";

/**
 * @description Get all markets
 * @route GET /api/markets
 * @access Public
 * @returns {Promise<Response>}
 */

export const getMarkets = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const markets = await MarketsService.getAllMarkets();
        res.status(200).json({
            success: true,
            message: "Markets fetched successfully",
            data: markets,
        });
    } catch (error) {
        next(new InternalServerError(`${error}`));
    }
});

/**
 * @description Get a market by id
 * @route GET /api/markets/:id
 * @access Public
 * @returns {Promise<Response>}
 */

export const getMarketById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const market = await MarketsService.getMarketById(id);
        res.status(200).json({
            success: true,
            message: "Market fetched successfully",
            data: market,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @description Create a new market
 * @route POST /api/markets
 * @access Private
 * @returns {Promise<Response>}
 */

export const createMarket = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new BadRequestError("Invalid data"));
    }
    try {
        const market = await MarketsService.createMarket(req.body);
        res.status(201).json({
            success: true,
            message: "Market created successfully",
            data: market,
        });
    } catch (error) {
        next(new InternalServerError(`${error}`));
    }
});

/**
 * @description Update a market
 * @route PUT /api/markets/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const updateMarket = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new BadRequestError("Invalid data"));
    }
    try {
        const { id } = req.params;
        const market = await MarketsService.updateMarket(id, req.body);
        res.status(200).json({
            success: true,
            message: "Market updated successfully",
            data: market,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @description Delete a market
 * @route DELETE /api/markets/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const deleteMarket = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        await MarketsService.deleteMarket(id);
        res.status(200).json({
            success: true,
            message: "Market deleted successfully",
        });
    } catch (error) {
        next(error);
    }
});
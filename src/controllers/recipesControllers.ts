import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { HttpError, HttpStatusCode } from '../types/Errors';
import { getErrorMessage } from '../types/modalTypes';
import asyncHandler from '../middleware/asyncHandler';
import { recipeService as RecipeService } from '../services/RecipesService';
import { reviewService as ReviewService } from '../services/ReviewService';

/**
 * @description Get all recipes
 * @name getRecipes
 * @route GET /api/recipes
 * @access Public
 * @returns {Promise<Response>}
 */

export const getRecipes = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const recipes = await RecipeService.getAll();
        res.status(200).json({
            success: true,
            data: recipes,
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
 * @description Get a recipe by id
 * @name getRecipeById
 * @route GET /api/recipes/:id
 * @access Public
 * @returns {Promise<Response>}
 */

export const getRecipeById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        if (!id) {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Recipe ID is required'));
        }
        const recipe = await RecipeService.findById(id);

        res.status(200).json({
            success: true,
            message: 'Recipe fetched successfully',
            data: recipe,
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
 * @description Create a new recipe
 * @name createRecipe
 * @route POST /api/recipes
 * @access Private
 * @returns {Promise<Response>}
 */

export const createRecipe = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return next(new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(firstError?.msg || 'Validation error')));
    }
    try {
        const recipe = await RecipeService.create(req.body);
        res.status(201).json({
            success: true,
            data: recipe,
        });
    } catch (error) {
        next(new HttpError(HttpStatusCode.BAD_REQUEST, `${error}`));
    }
});

/**
 * @description Update a recipe by id
 * @name updateRecipe
 * @route PUT /api/recipes/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const updateRecipe = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return next(new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(firstError?.msg || 'Validation error')));
    }
    try {
        const { id } = req.params;
        if (!id) {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Recipe ID is required'));
        }
        const recipe = await RecipeService.updateById(id, req.body);

        if (!recipe) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, 'Recipe not found');
        }
        res.status(200).json({
            success: true,
            data: recipe,
        });
    } catch (error) {
        next(new HttpError(HttpStatusCode.NOT_FOUND, `${error}`));
    }
});

/**
 * @description Delete a recipe by id
 * @name deleteRecipe
 * @route DELETE /api/recipes/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const deleteRecipe = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        if (!id) {
            return next(new HttpError(HttpStatusCode.BAD_REQUEST, 'Recipe ID is required'));
        }
        await RecipeService.deleteById(id);
        res.status(204).json({
            success: true,
            data: {},
        });
    } catch (error) {
        next(new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, `${error}`));
    }
});

/**
 * @description Add a review to a recipe
 * @name addReviewToRecipe
 * @route POST /api/recipes/:id/reviews
 * @access Private
 * @returns {Promise<Response>}
 */

export const addReviewToRecipe = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const reviewData = { ...req.body, recipeId: req.params.id };
        const newReview = await ReviewService.addReview(reviewData);

        res.status(200).json({
            success: true,
            message: 'Review added successfully',
            data: newReview,
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
 * @description Get Top rated recipes
 * @name getTopRatedRecipes
 * @route GET /api/recipes/top-rated
 * @access Public
 * @returns {Promise<Response>}
 */

export const getTopRatedRecipes = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const topRatedRecipes = await ReviewService.getTopRatedReviews('recipe');

        res.status(200).json({
            success: true,
            message: 'Top rated recipes fetched successfully',
            data: topRatedRecipes,
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

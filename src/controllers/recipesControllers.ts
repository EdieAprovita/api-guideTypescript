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

export const getRecipes = asyncHandler(async (_req: Request, res: Response, next: NextFunction) => {
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
        return next(new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(firstError?.msg ?? 'Validation error')));
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
        return next(new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(firstError?.msg ?? 'Validation error')));
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
        const { id } = req.params;
        const userId = req.user?._id;

        if (!userId) {
            throw new HttpError(HttpStatusCode.UNAUTHORIZED, 'Authentication required');
        }

        if (!id) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Recipe ID is required');
        }

        // Check if recipe exists
        const recipe = await RecipeService.findById(id);
        if (!recipe) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, 'Recipe not found');
        }

        // Check if user already reviewed this recipe
        const existingReview = await ReviewService.findByUserAndEntity(userId.toString(), 'Recipe', id);
        if (existingReview) {
            throw new HttpError(HttpStatusCode.CONFLICT, 'User has already reviewed this recipe');
        }

        const reviewData = {
            ...req.body,
            author: userId,
            recipeId: id,
        };

        const newReview = await ReviewService.addReview(reviewData);

        res.status(201).json({
            success: true,
            message: 'Review added successfully',
            data: newReview,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @description Get reviews for a recipe
 * @name getRecipeReviews
 * @route GET /api/recipes/:id/reviews
 * @access Public
 * @returns {Promise<Response>}
 */
export const getRecipeReviews = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10, rating, sort = '-createdAt' } = req.query;

        if (!id) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Recipe ID is required');
        }

        // Check if recipe exists
        const recipe = await RecipeService.findById(id);
        if (!recipe) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, 'Recipe not found');
        }

        const reviews = await ReviewService.getReviewsByEntity('Recipe', id, {
            page: Number(page),
            limit: Number(limit),
            ...(rating && { rating: Number(rating) }),
            sort: String(sort),
        });

        res.status(200).json({
            success: true,
            data: reviews.data,
            pagination: reviews.pagination,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @description Get review statistics for a recipe
 * @name getRecipeReviewStats
 * @route GET /api/recipes/:id/reviews/stats
 * @access Public
 * @returns {Promise<Response>}
 */
export const getRecipeReviewStats = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        if (!id) {
            throw new HttpError(HttpStatusCode.BAD_REQUEST, 'Recipe ID is required');
        }

        // Check if recipe exists
        const recipe = await RecipeService.findById(id);
        if (!recipe) {
            throw new HttpError(HttpStatusCode.NOT_FOUND, 'Recipe not found');
        }

        const stats = await ReviewService.getReviewStats('Recipe', id);

        res.status(200).json({
            success: true,
            data: stats,
        });
    } catch (error) {
        next(error);
    }
});

import { Request, Response } from "express";
import { NotFoundError } from "../types/Errors";
import asyncHandler from "../middleware/asyncHandler";
import { recipeService as RecipeService } from "../services/RecipesService";
import { reviewService as ReviewService } from "../services/ReviewService";

/**
 * @description Get all recipes
 * @name getRecipes
 * @route GET /api/recipes
 * @access Public
 * @returns {Promise<Response>}
 */

export const getRecipes = asyncHandler(async (req: Request, res: Response) => {
	const recipes = await RecipeService.getAll();
	res.status(200).json({
		success: true,
		data: recipes,
	});
});

/**
 * @description Get a recipe by id
 * @name getRecipeById
 * @route GET /api/recipes/:id
 * @access Public
 * @returns {Promise<Response>}
 */

export const getRecipeById = asyncHandler(async (req: Request, res: Response) => {
	const recipe = await RecipeService.findById(req.params.id);

	if (!recipe) {
		throw new NotFoundError();
	}
	res.status(200).json({
		success: true,
		data: recipe,
	});
});

/**
 * @description Create a new recipe
 * @name createRecipe
 * @route POST /api/recipes
 * @access Private
 * @returns {Promise<Response>}
 */

export const createRecipe = asyncHandler(async (req: Request, res: Response) => {
	const recipe = await RecipeService.create(req.body);
	res.status(201).json({
		success: true,
		data: recipe,
	});
});

/**
 * @description Update a recipe by id
 * @name updateRecipe
 * @route PUT /api/recipes/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const updateRecipe = asyncHandler(async (req: Request, res: Response) => {
	const recipe = await RecipeService.updateById(req.params.id, req.body);

	if (!recipe) {
		throw new NotFoundError();
	}
	res.status(200).json({
		success: true,
		data: recipe,
	});
});

/**
 * @description Delete a recipe by id
 * @name deleteRecipe
 * @route DELETE /api/recipes/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const deleteRecipe = asyncHandler(async (req: Request, res: Response) => {
	await RecipeService.deleteById(req.params.id);
	res.status(204).json({
		success: true,
		data: {},
	});
});

/**
 * @description Add a review to a recipe
 * @name addReviewToRecipe
 * @route POST /api/recipes/:id/reviews
 * @access Private
 * @returns {Promise<Response>}
 */

export const addReviewToRecipe = asyncHandler(async (req: Request, res: Response) => {
	const reviewData = req.body;

	const updatedRecipe = await ReviewService.addReview(reviewData);

	res.status(200).json({
		success: true,
		data: updatedRecipe,
	});
});

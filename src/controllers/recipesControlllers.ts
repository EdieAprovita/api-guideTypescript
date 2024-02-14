import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middleware/asyncHandler";
import { validationResult } from "express-validator";

import { BadRequestError, NotFoundError, InternalServerError } from "../types/Errors";
import { IRecipe } from "../types/modalTypes";
import Recipe from "../models/Recipe";

/**
 * @description Get all recipes
 * @name getRecipes
 * @route GET /api/recipes
 * @access Public
 * @returns {Promise<Response>}
 */

export const getRecipes = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const recipes: IRecipe[] = await Recipe.find({});
			return res.status(200).json({
				success: true,
				message: "Recipes fetched successfully",
				data: recipes,
			});
		} catch (error) {
			next(new InternalServerError(`${error}`));
		}
	}
);

/**
 * @description Get a recipe by id
 * @name getRecipeById
 * @route GET /api/recipes/:id
 * @access Public
 * @returns {Promise<Response>}
 */

export const getRecipeById = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const recipe = await Recipe.findById(id);

			if (!recipe) {
				throw new NotFoundError();
			}

			res.status(200).json({
				success: true,
				message: "Recipe fetched successfully",
				data: recipe,
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * @description Create a new recipe
 * @name createRecipe
 * @route POST /api/recipes
 * @access Private
 * @returns {Promise<Response>}
 */

export const createRecipe = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return next(new BadRequestError("Invalid data"));
		}
		try {
			const recipe = await Recipe.create(req.body);
			res.status(201).json({
				success: true,
				message: "Recipe created successfully",
				data: recipe,
			});
		} catch (error) {
			next(new InternalServerError(`${error}`));
		}
	}
);

/**
 * @description Update a recipe by id
 * @name updateRecipe
 * @route PUT /api/recipes/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const updateRecipe = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const recipe = await Recipe.findByIdAndUpdate(id, req.body, {
				new: true,
				runValidators: true,
			});

			if (!recipe) {
				throw new NotFoundError();
			}

			res.status(200).json({
				success: true,
				message: "Recipe updated successfully",
				data: recipe,
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * @description Delete a recipe by id
 * @name deleteRecipe
 * @route DELETE /api/recipes/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const deleteRecipe = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const recipe = await Recipe.findByIdAndDelete(id);
			if (!recipe) {
				throw new NotFoundError();
			}
			res.status(200).json({
				success: true,
				message: "Recipe deleted successfully",
				data: recipe,
			});
		} catch (error) {
			next(error);
		}
	}
);

import { recipeService as RecipeService } from '../services/RecipesService.js';
import { sanitizeNoSQLInput } from '../utils/sanitizer.js';
import {
    createAddReviewHandler,
    createGetReviewsHandler,
    createGetReviewStatsHandler,
} from './factories/reviewEndpointsFactory.js';
import {
    createGetAllHandler,
    createGetByIdHandler,
    createCreateHandler,
    createUpdateHandler,
    createDeleteHandler,
} from './factories/entityControllerFactory.js';

/**
 * @description Get all recipes
 * @name getRecipes
 * @route GET /api/recipes
 * @access Public
 * @returns {Promise<Response>}
 */
export const getRecipes = createGetAllHandler(RecipeService, 'Recipe');

/**
 * @description Get a recipe by id
 * @name getRecipeById
 * @route GET /api/recipes/:id
 * @access Public
 * @returns {Promise<Response>}
 */
export const getRecipeById = createGetByIdHandler(RecipeService, 'Recipe');

const preProcessRecipe = async (data: any) => {
    return sanitizeNoSQLInput(data);
};

/**
 * @description Create a new recipe
 * @name createRecipe
 * @route POST /api/recipes
 * @access Private
 * @returns {Promise<Response>}
 */
export const createRecipe = createCreateHandler(RecipeService, 'Recipe', {
    preCreate: preProcessRecipe,
});

/**
 * @description Update a recipe by id
 * @name updateRecipe
 * @route PUT /api/recipes/:id
 * @access Private
 * @returns {Promise<Response>}
 */
export const updateRecipe = createUpdateHandler(RecipeService, 'Recipe', {
    preUpdate: preProcessRecipe,
});

/**
 * @description Delete a recipe by id
 * @name deleteRecipe
 * @route DELETE /api/recipes/:id
 * @access Private
 * @returns {Promise<Response>}
 */
export const deleteRecipe = createDeleteHandler(RecipeService, 'Recipe');

/**
 * @description Add a review to a recipe
 * @name addReviewToRecipe
 * @route POST /api/recipes/:id/reviews
 * @access Private
 * @returns {Promise<Response>}
 */
export const addReviewToRecipe = createAddReviewHandler('Recipe', RecipeService, 'recipeId');

/**
 * @description Get reviews for a recipe
 * @name getRecipeReviews
 * @route GET /api/recipes/:id/reviews
 * @access Public
 * @returns {Promise<Response>}
 */
export const getRecipeReviews = createGetReviewsHandler('Recipe', RecipeService);

/**
 * @description Get review statistics for a recipe
 * @name getRecipeReviewStats
 * @route GET /api/recipes/:id/reviews/stats
 * @access Public
 * @returns {Promise<Response>}
 */
export const getRecipeReviewStats = createGetReviewStatsHandler('Recipe', RecipeService);

import BaseService from "./BaseService";
import { Recipe, IRecipe } from "../models/Recipe";

/**
 * @description Recipe service class
 * @name RecipeService
 * @class
 * @returns {Object}
 * */

class RecipeService extends BaseService<IRecipe> {
	constructor() {
		super(Recipe);
	}
}

export const recipeService = new RecipeService();

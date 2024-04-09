import BaseService from "./BaseService";
import { Recipe, IRecipe } from "../models/Recipe";


class RecipeService extends BaseService<IRecipe> {
	constructor() {
		super(Recipe);
	}

	
}

export const recipeService = new RecipeService();

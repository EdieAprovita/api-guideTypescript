import BaseService from "./BaseService";
import Recipe from "../models/Recipe";
import { IRecipe } from "../types/modalTypes";

class RecipeService extends BaseService<IRecipe> {
	constructor() {
		super(Recipe);
	}
}

export const recipeService = new RecipeService();

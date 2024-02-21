import Recipe from "../models/Recipe";
import { IRecipe } from "../types/modalTypes";
import { DataNotFoundError } from "../types/Errors";

class RecipeService {
	async getAllRecipes(): Promise<IRecipe[]> {
		const recipes = await Recipe.find({});
		if (!recipes) {
			throw new DataNotFoundError("Error fetching recipes");
		}
		return recipes;
	}

	async getRecipeById(id: string): Promise<IRecipe> {
		const recipe = await Recipe.findById(id);

		if (!recipe) {
			throw new DataNotFoundError("Recipe not found");
		}
		return recipe;
	}

	async createRecipe(data: IRecipe): Promise<IRecipe> {
		return await Recipe.create(data);
	}

	async updateRecipe(id: string, data: IRecipe): Promise<IRecipe> {
		const recipe = await Recipe.findByIdAndUpdate(id, data, {
			new: true,
			runValidators: true,
		});
		if (!recipe) {
			throw new DataNotFoundError("Recipe not found");
		}
		return recipe;
	}

	async deleteRecipe(id: string): Promise<void> {
		const recipe = await Recipe.findById(id);
		if (!recipe) {
			throw new DataNotFoundError("Recipe not found");
		}
		await recipe.deleteOne();
	}
}

export default new RecipeService();

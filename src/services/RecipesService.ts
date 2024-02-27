import { Types } from "mongoose";
import BaseService from "./BaseService";
import { reviewService } from "./ReviewService";
import Recipe from "../models/Recipe";
import { IRecipe, IReview } from "../types/modalTypes";

class RecipeService extends BaseService<IRecipe> {
	constructor() {
		super(Recipe);
	}

	async addReview(recipeId: string, reviewData: Partial<IReview>): Promise<IRecipe> {
		const objectId = new Types.ObjectId(recipeId);
		const review = await reviewService.addReview({
			...reviewData,
			refId: objectId,
			refModel: "Recipe",
		});
		const recipe = await this.findById(recipeId);
		if (!recipe.reviews) {
			recipe.reviews = [];
		}
		recipe.reviews.push(new Types.ObjectId(review._id));
		await recipe.save();
		return recipe;
	}
}

export const recipeService = new RecipeService();

import { Types } from "mongoose";
import BaseService from "./BaseService";
import { Recipe, IRecipe } from "../models/Recipe";
import { IReview } from "../models/Review";
import { reviewService, IReviewService } from "./ReviewService";
import { NotFoundError, InternalServerError } from "../types/Errors";

class RecipeService extends BaseService<IRecipe> {
	constructor(private ReviewService: IReviewService) {
		super(Recipe);
	}

	async addReviewToRecipe(
		recipeId: string,
		reviewData: Partial<IReview>
	): Promise<IRecipe> {
		try {
			const recipe = await this.findById(recipeId);
			if (!recipe) {
				throw new NotFoundError("Receta no encontrada");
			}

			const review = await this.ReviewService.addReview({
				...reviewData,
				refId: new Types.ObjectId(recipeId),
				refModel: "Recipe",
			});

			recipe.reviews.push(new Types.ObjectId(review._id));
			await recipe.save();
			return recipe;
		} catch (error) {
			if (error instanceof NotFoundError) {
				throw error;
			} else {
				throw new InternalServerError("Error al añadir reseña a la receta");
			}
		}
	}
}

export const recipeService = new RecipeService(reviewService);

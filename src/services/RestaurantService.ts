import { Types } from "mongoose";
import BaseService from "./BaseService";
import { Restaurant, IRestaurant } from "../models/Restaurant";
import { IReview } from "../models/Review";
import { reviewService, IReviewService } from "./ReviewService";
import { NotFoundError, InternalServerError } from "../types/Errors";

class RestaurantService extends BaseService<IRestaurant> {
	constructor(private ReviewService: IReviewService) {
		super(Restaurant);
	}

	async addReviewToRestaurant(
		restaurantId: string,
		reviewData: Partial<IReview>
	): Promise<IRestaurant> {
		try {
			const restaurant = await this.findById(restaurantId);
			if (!restaurant) {
				throw new NotFoundError("Restaurante no encontrado");
			}

			const review = await this.ReviewService.addReview({
				...reviewData,
				refId: new Types.ObjectId(restaurantId),
				refModel: "Restaurant",
			});

			restaurant.reviews.push(new Types.ObjectId(review._id));
			await restaurant.save();
			return restaurant;
		} catch (error) {
			if (error instanceof NotFoundError) {
				throw error;
			} else {
				throw new InternalServerError("Error al añadir reseña al restaurante");
			}
		}
	}
}

export const restaurantService = new RestaurantService(reviewService);

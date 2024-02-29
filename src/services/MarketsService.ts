import { Types } from "mongoose";
import BaseService from "./BaseService";
import Market from "../models/Market";
import { IMarket, IReview } from "../types/modalTypes";
import { reviewService, IReviewService } from "./ReviewService";
import { NotFoundError, InternalServerError } from "../types/Errors";

class MarketsService extends BaseService<IMarket> {
	constructor(private ReviewService: IReviewService) {
		super(Market);
	}

	async addReviewToMarket(
		marketId: string,
		reviewData: Partial<IReview>
	): Promise<IMarket> {
		try {
			const market = await this.findById(marketId);
			if (!market) {
				throw new NotFoundError("Mercado no encontrado");
			}

			const review = await this.ReviewService.addReview({
				...reviewData,
				refId: new Types.ObjectId(marketId),
				refModel: "Market",
			});

			market.reviews.push(new Types.ObjectId(review._id));
			await market.save();
			return market;
		} catch (error) {
			if (error instanceof NotFoundError) {
				throw error;
			} else {
				throw new InternalServerError("Error al añadir reseña al mercado");
			}
		}
	}
}

export const marketsService = new MarketsService(reviewService);

import { Types } from "mongoose";
import BaseService from "./BaseService";
import { IBusiness, Business } from "../models/Business";
import { IReview } from "../models/Review";
import { reviewService, IReviewService } from "./ReviewService";
import { NotFoundError, InternalServerError } from "../types/Errors";
class BusinessService extends BaseService<IBusiness> {
	constructor(private ReviewService: IReviewService) {
		super(Business);
	}

	async addReviewToBusiness(
		businessId: string,
		reviewData: Partial<IReview>
	): Promise<IBusiness> {
		try {
			const business = await this.findById(businessId);
			if (!business) {
				throw new NotFoundError("Negocio no encontrado");
			}

			const review = await this.ReviewService.addReview({
				...reviewData,
				refId: new Types.ObjectId(businessId),
				refModel: "Business",
			});

			business.reviews.push(new Types.ObjectId(review._id));
			await business.save();
			return business;
		} catch (error) {
			if (error instanceof NotFoundError) {
				throw error;
			} else {
				throw new InternalServerError("Error al añadir reseña al negocio");
			}
		}
	}
}

export const businessService = new BusinessService(reviewService);

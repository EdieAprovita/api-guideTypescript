import { Types } from "mongoose";
import BaseServices from "./BaseService";
import { Profession, IProfession } from "../models/Profession";
import { IReview } from "../models/Review";
import { reviewService, IReviewService } from "./ReviewService";
import { NotFoundError, InternalServerError } from "../types/Errors";

class ProfessionService extends BaseServices<IProfession> {
	constructor(private ReviewService: IReviewService) {
		super(Profession);
	}

	async addReviewToProfession(
		professionId: string,
		reviewData: Partial<IReview>
	): Promise<IProfession> {
		try {
			const profession = await this.findById(professionId);
			if (!profession) {
				throw new NotFoundError("Profesión no encontrada");
			}

			const review = await this.ReviewService.addReview({
				...reviewData,
				refId: new Types.ObjectId(professionId),
				refModel: "Profession",
			});

			profession.reviews.push(new Types.ObjectId(review._id));
			await profession.save();
			return profession;
		} catch (error) {
			if (error instanceof NotFoundError) {
				throw error;
			} else {
				throw new InternalServerError("Error al añadir reseña a la profesión");
			}
		}
	}
}

export const professionService = new ProfessionService(reviewService);

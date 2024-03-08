import { Types } from "mongoose";
import BaseService from "./BaseService";
import { ProfessionalProfile, IProfessionProfile } from "../models/ProfessionProfile";
import { IReview } from "../models/Review";
import { reviewService, IReviewService } from "./ReviewService";
import { NotFoundError, InternalServerError } from "../types/Errors";

class ProfessionProfileService extends BaseService<IProfessionProfile> {
	constructor(private ReviewService: IReviewService) {
		super(ProfessionalProfile);
	}

	async addReviewToProfession(
		professionId: string,
		reviewData: Partial<IReview>
	): Promise<IProfessionProfile> {
		try {
			const profession = await this.findById(professionId);
			if (!profession) {
				throw new NotFoundError("Profesión no encontrada");
			}

			const review = await reviewService.addReview({
				...reviewData,
				refId: new Types.ObjectId(professionId),
				refModel: "ProfessionProfile",
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

export const professionProfileService = new ProfessionProfileService(reviewService);

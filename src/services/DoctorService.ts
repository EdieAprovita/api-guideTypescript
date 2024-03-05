import { Types } from "mongoose";
import BaseService from "./BaseService";
import Doctor from "../models/Doctor";
import { IDoctor, IReview } from "../types/modalTypes";
import { reviewService, IReviewService } from "./ReviewService";
import { NotFoundError, InternalServerError } from "../types/Errors";
class DoctorService extends BaseService<IDoctor> {
	constructor(private ReviewService: IReviewService) {
		super(Doctor);
	}

	async addReviewToDoctor(
		doctorId: string,
		reviewData: Partial<IReview>
	): Promise<IDoctor> {
		try {
			const doctor = await this.findById(doctorId);
			if (!doctor) {
				throw new NotFoundError("Doctor no encontrado");
			}

			const review = await this.ReviewService.addReview({
				...reviewData,
				refId: new Types.ObjectId(doctorId),
				refModel: "Doctor",
			});

			doctor.reviews.push(new Types.ObjectId(review._id));
			await doctor.save();
			return doctor;
		} catch (error) {
			if (error instanceof NotFoundError) {
				throw error;
			} else {
				throw new InternalServerError("Error al añadir reseña al doctor");
			}
		}
	}
}

export const doctorService = new DoctorService(reviewService);

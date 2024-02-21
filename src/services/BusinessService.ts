import Business from "../models/Business";
import { IBusiness } from "../types/modalTypes";
import { NotFoundError } from "../types/Errors";

class BusinessService {
	async getAllBusinesses(): Promise<IBusiness[]> {
		return await Business.find({});
	}

	async getBusinessById(id: string): Promise<IBusiness> {
		const business = await Business.findById(id);
		if (!business) {
			throw new NotFoundError();
		}
		return business;
	}

	async createBusiness(data: IBusiness): Promise<IBusiness> {
		return await Business.create(data);
	}

	async updateBusiness(id: string, data: IBusiness): Promise<IBusiness> {
		const business = await Business.findByIdAndUpdate(id, data, {
			new: true,
			runValidators: true,
		});
		if (!business) {
			throw new NotFoundError();
		}
		return business;
	}

	async deleteBusiness(id: string): Promise<void> {
		const business = await Business.findById(id);
		if (!business) {
			throw new NotFoundError();
		}
		await business.deleteOne();
	}
}

export default new BusinessService();

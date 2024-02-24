import Profession from "../models/Profession";
import { IProfessionProfile } from "../types/modalTypes";
import { NotFoundError } from "../types/Errors";

class ProfessionService {
	async getAllProfessions(): Promise<IProfessionProfile[]> {
		return await Profession.find({});
	}

	async getProfessionById(id: string): Promise<IProfessionProfile> {
		const profession = await Profession.findById(id);
		if (!profession) {
			throw new NotFoundError();
		}
		return profession;
	}

	async createProfession(data: IProfessionProfile): Promise<IProfessionProfile> {
		return await Profession.create(data);
	}

	async updateProfession(
		id: string,
		data: IProfessionProfile
	): Promise<IProfessionProfile> {
		const profession = await Profession.findByIdAndUpdate(id, data, {
			new: true,
			runValidators: true,
		});
		if (!profession) {
			throw new NotFoundError();
		}
		return profession;
	}

	async deleteProfession(id: string): Promise<void> {
		const profession = await Profession.findById(id);
		if (!profession) {
			throw new NotFoundError();
		}
		await profession.deleteOne();
	}
}

export default new ProfessionService();

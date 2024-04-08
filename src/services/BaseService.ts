import { Document, Model } from "mongoose";
import { HttpError, HttpStatusCode } from "../types/Errors";

class BaseService<T extends Document> {
	constructor(protected model: Model<T>) {}

	async getAll(): Promise<T[]> {
		return this.model.find();
	}

	async findById(id: string): Promise<T> {
		const item = await this.model.findById(id);
		if (!item) {
			throw new HttpError(HttpStatusCode.NOT_FOUND, "Item not found");
		}
		return item;
	}

	async create(data: Partial<T>): Promise<T> {
		return this.model.create(data);
	}

	async updateById(id: string, data: Partial<T>): Promise<T> {
		const item = await this.model.findByIdAndUpdate(id, data, { new: true });
		if (!item) {
			throw new HttpError(HttpStatusCode.NOT_FOUND, "Item not found");
		}
		return item;
	}

	async deleteById(id: string): Promise<void> {
		const item = await this.model.findById(id);
		if (!item) {
			throw new HttpError(HttpStatusCode.NOT_FOUND, "Item not found");
		}
		await this.model.deleteOne({ _id: id });
	}
}
export default BaseService;

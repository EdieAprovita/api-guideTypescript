import Restaurant from "../models/Restaurant";
import { IRestaurant } from "../types/modalTypes";
import { NotFoundError } from "../types/Errors";

class RestaurantService {
	async getAllRestaurants(): Promise<IRestaurant[]> {
		return await Restaurant.find({});
	}

	async getRestaurantById(id: string): Promise<IRestaurant> {
		const restaurant = await Restaurant.findById(id);
		if (!restaurant) {
			throw new NotFoundError();
		}
		return restaurant;
	}

	async createRestaurant(data: IRestaurant): Promise<IRestaurant> {
		return await Restaurant.create(data);
	}

	async updateRestaurant(id: string, data: IRestaurant): Promise<IRestaurant> {
		const restaurant = await Restaurant.findByIdAndUpdate(id, data, {
			new: true,
			runValidators: true,
		});

		if (!restaurant) {
			throw new NotFoundError();
		}
		return restaurant;
	}

	async deleteRestaurant(id: string): Promise<void> {
		const restaurant = await Restaurant.findById(id);
		if (!restaurant) {
			throw new NotFoundError();
		}
		await restaurant.deleteOne();
	}
}

export default new RestaurantService();

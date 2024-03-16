import BaseService from "./BaseService";
import { Restaurant, IRestaurant } from "../models/Restaurant";


class RestaurantService extends BaseService<IRestaurant> {
	constructor() {
		super(Restaurant);
	}

	
}

export const restaurantService = new RestaurantService();

import BaseService from "./BaseService";
import Restaurant from "../models/Restaurant";
import { IRestaurant } from "../types/modalTypes";

class RestaurantService extends BaseService<IRestaurant> {
	constructor() {
		super(Restaurant);
	}
}

export const restaurantService = new RestaurantService();

import BaseService from "./BaseService";
import { Restaurant, IRestaurant } from "../models/Restaurant";

/**
 * @description Restaurant service class
 * @name RestaurantService
 * @class
 * @returns
 * */

class RestaurantService extends BaseService<IRestaurant> {
	constructor() {
		super(Restaurant);
	}
}

export const restaurantService = new RestaurantService();

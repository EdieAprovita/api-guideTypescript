import BaseService from './BaseService.js';
import { Restaurant, IRestaurant } from '../models/Restaurant.js';

/**
 * @description Restaurant service class
 * @name RestaurantService
 * @class
 * @returns {Object}
 * */

class RestaurantService extends BaseService<IRestaurant> {
    constructor() {
        super(Restaurant);
    }
}

export const restaurantService = new RestaurantService();

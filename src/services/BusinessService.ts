import BaseService from './BaseService.js';
import { IBusiness, Business } from '../models/Business.js';

/**
 * @description Business service class
 * @name BusinessService
 * @class
 * @returns {Object}
 * */

class BusinessService extends BaseService<IBusiness> {
    constructor() {
        super(Business);
    }
}

export const businessService = new BusinessService();

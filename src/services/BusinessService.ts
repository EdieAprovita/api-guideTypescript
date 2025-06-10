import BaseService from './BaseService';
import { IBusiness, Business } from '../models/Business';

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

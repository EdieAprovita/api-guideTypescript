import BaseService from './BaseService.js';
import { Market, IMarket } from '../models/Market.js';

/**
 * @description Markets service class
 * @name MarketsService
 * @class
 * @returns {Object}
 * */

class MarketsService extends BaseService<IMarket> {
    constructor() {
        super(Market);
    }
}

export const marketsService = new MarketsService();

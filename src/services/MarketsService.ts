import BaseService from './BaseService';
import { Market, IMarket } from '../models/Market';

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

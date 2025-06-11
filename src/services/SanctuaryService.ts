import BaseService from './BaseService';
import { ISanctuary, Sanctuary } from '../models/Sanctuary';

/**
 * @description sanctuary service class
 * @name sanctuaryService
 * @class
 * @returns {Object}
 */

class SanctuaryService extends BaseService<ISanctuary> {
    constructor() {
        super(Sanctuary);
    }
}

export const sanctuaryService = new SanctuaryService();

import BaseService from './BaseService.js';
import { ISanctuary, Sanctuary } from '../models/Sanctuary.js';

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

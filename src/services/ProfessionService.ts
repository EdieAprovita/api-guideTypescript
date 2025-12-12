import BaseServices from './BaseService.js';
import { Profession, IProfession } from '../models/Profession.js';

/**
 * @description Profession service class
 * @name ProfessionService
 * @class
 * @returns {Object}
 * */

class ProfessionService extends BaseServices<IProfession> {
    constructor() {
        super(Profession);
    }
}

export const professionService = new ProfessionService();

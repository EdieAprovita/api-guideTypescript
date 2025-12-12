import BaseService from './BaseService.js';
import { ProfessionalProfile, IProfessionProfile } from '../models/ProfessionProfile.js';

/**
 * @description ProfessionProfile service class
 * @name ProfessionProfileService
 * @class
 * @returns {Object}
 * */

class ProfessionProfileService extends BaseService<IProfessionProfile> {
    constructor() {
        super(ProfessionalProfile);
    }
}

export const professionProfileService = new ProfessionProfileService();

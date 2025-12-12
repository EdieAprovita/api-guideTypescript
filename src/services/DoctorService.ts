import BaseService from './BaseService.js';
import { IDoctor, Doctor } from '../models/Doctor.js';

/**
 * @description Doctor service class
 * @name DoctorService
 * @class
 * @returns {Object}
 * */

class DoctorService extends BaseService<IDoctor> {
    constructor() {
        super(Doctor);
    }
}

export const doctorService = new DoctorService();

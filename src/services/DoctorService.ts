import BaseService from "./BaseService";
import { IDoctor, Doctor } from "../models/Doctor";

/**
 * @description Doctor service class
 * @name DoctorService
 * @class
 * @returns
 * */

class DoctorService extends BaseService<IDoctor> {
	constructor() {
		super(Doctor);
	}
}

export const doctorService = new DoctorService();

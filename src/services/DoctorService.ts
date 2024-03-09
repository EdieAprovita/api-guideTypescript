import BaseService from "./BaseService";
import { IDoctor, Doctor } from "../models/Doctor";

class DoctorService extends BaseService<IDoctor> {
	constructor() {
		super(Doctor);
	}

	
}

export const doctorService = new DoctorService();

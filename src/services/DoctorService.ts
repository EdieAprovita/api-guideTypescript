import BaseService from "./BaseService";
import Doctor from "../models/Doctor";
import { IDoctor } from "../types/modalTypes";
class DoctorService extends BaseService<IDoctor> {
	constructor() {
		super(Doctor);
	}
}

export const doctorService = new DoctorService();
